/**
 * Shailakshya Griha Nirman — AI Home Visualizer.
 * Worker entry point. SPEC.md is the contract; §11 Phase 1 is what is live.
 *
 * One Worker serves both the built widget (via the ASSETS binding) and the API,
 * so there is a single deploy, a single origin and no infrastructure to explain
 * to the client.
 */
import type { Env } from './lib/env.ts';
import { settings } from './lib/env.ts';
import { budgetState } from './lib/breaker.ts';
import { restyle } from './routes/restyle.ts';
import { publicPacks } from './styles/packs.ts';
import { RefusalError } from './lib/types.ts';
import { sweepExpiredUploads } from './lib/sweep.ts';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }), request, env);
    }

    if (!pathname.startsWith('/api/')) {
      // Anything that is not the API is the widget itself.
      return env.ASSETS.fetch(request);
    }

    try {
      const response = await route(pathname, request, env, ctx, url);
      return withCors(response, request, env);
    } catch (err) {
      return withCors(errorResponse(err), request, env);
    }
  },

  /** Daily housekeeping — SPEC §10, uploads are deleted after 30 days. */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(sweepExpiredUploads(env));
  },
};

async function route(
  pathname: string,
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  url: URL,
): Promise<Response> {
  // The style cards. Prompts stay server-side and are never in this payload.
  if (pathname === '/api/styles' && request.method === 'GET') {
    return json({ packs: publicPacks() });
  }

  // Lets the UI say "at capacity" honestly before the visitor picks a photo,
  // rather than after they have waited for an upload.
  if (pathname === '/api/status' && request.method === 'GET') {
    const budget = await budgetState(env);
    return json({
      accepting: budget.open,
      provider: settings(env).provider,
      // Deliberately a fraction, not raw Neurons: spend figures are the
      // company's business, not a public endpoint's.
      capacityUsed: Number((budget.spent / Math.max(budget.ceiling, 1)).toFixed(2)),
    });
  }

  if (pathname === '/api/restyle' && request.method === 'POST') {
    return restyle(request, env);
  }

  if (pathname.startsWith('/api/image/') && request.method === 'GET') {
    return serveImage(pathname.slice('/api/image/'.length), env, url);
  }

  return json({ error: 'not_found' }, 404);
}

async function serveImage(key: string, env: Env, _url: URL): Promise<Response> {
  // Only ever serve the two prefixes this app writes. Without this an attacker
  // could read any object in the bucket by guessing a key.
  if (!key.startsWith('generated/') && !key.startsWith('uploads/')) {
    return json({ error: 'not_found' }, 404);
  }

  const object = await env.IMAGES.get(key);
  if (!object) return json({ error: 'not_found' }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  if (!headers.has('cache-control')) {
    headers.set('cache-control', 'public, max-age=31536000, immutable');
  }

  return new Response(object.body, { headers });
}

function errorResponse(err: unknown): Response {
  if (err instanceof RefusalError) {
    return json(
      { error: err.reason, messageEn: err.userMessageEn, messageNe: err.userMessageNe },
      err.status,
    );
  }

  // Never leak an internal message to the browser; log it instead.
  console.error('unhandled error', err);
  return json(
    {
      error: 'server_error',
      messageEn: 'Something went wrong on our side. Please try again.',
      messageNe: 'हाम्रो तर्फबाट केही गडबड भयो। फेरि प्रयास गर्नुहोस्।',
    },
    500,
  );
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/**
 * The widget is designed to be embedded on the company's existing site, which
 * is a different origin from the Worker, so the API needs CORS. Rate limiting
 * and the circuit breaker — not origin checks — are what actually protect the
 * budget, since an Origin header is trivially forged.
 */
function withCors(response: Response, request: Request, _env: Env): Response {
  const headers = new Headers(response.headers);
  headers.set('access-control-allow-origin', request.headers.get('Origin') ?? '*');
  headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
  headers.set('access-control-allow-headers', 'content-type');
  headers.set('vary', 'Origin');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
