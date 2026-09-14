/**
 * Sign-in endpoints and the lead record that sign-in exists to create.
 *
 * SPEC §8 is the point of all this: the company should end every session
 * holding a qualified contact and a record of that person's taste. So the lead
 * stores what they asked for alongside who they are — a salesperson opening it
 * should know immediately what this person wants built.
 */
import type { Env } from '../lib/env.ts';
import {
  authConfigured,
  authRequired,
  clearSession,
  issueSession,
  readSession,
  verifyGoogleToken,
} from '../auth/google.ts';
import { RefusalError } from '../lib/types.ts';

/** Leads outlive everything else here; two years, then they age out. */
const LEAD_TTL_SECONDS = 60 * 60 * 24 * 730;

export interface Lead {
  sub: string;
  email: string;
  name: string;
  firstSeen: string;
  lastSeen: string;
  /** What they typed. The single most useful field for a salesperson. */
  prompts: string[];
  sessions: number;
}

/** Tells the browser whether to show the gate at all. */
export async function authState(request: Request, env: Env): Promise<Response> {
  const sub = authConfigured(env) ? await readSession(env, request) : null;

  return json({
    configured: authConfigured(env),
    required: authRequired(env),
    signedIn: Boolean(sub),
    clientId: env.GOOGLE_CLIENT_ID ?? null,
  });
}

export async function signIn(request: Request, env: Env): Promise<Response> {
  if (!authConfigured(env)) {
    throw new RefusalError(
      'unknown_style',
      'Signing in is not switched on yet.',
      'साइन इन अहिले उपलब्ध छैन।',
      503,
    );
  }

  const body = (await request.json().catch(() => null)) as {
    credential?: string;
    prompt?: string;
  } | null;

  if (!body?.credential) {
    throw new RefusalError('bad_upload', 'Sign-in failed. Please try again.', 'साइन इन भएन।');
  }

  let identity;
  try {
    identity = await verifyGoogleToken(env, body.credential);
  } catch (err) {
    // The reason is for our logs; the visitor gets one plain sentence.
    console.error('google sign-in rejected', err);
    throw new RefusalError(
      'bad_upload',
      'We could not verify that sign-in. Please try again.',
      'साइन इन पुष्टि भएन। फेरि प्रयास गर्नुहोस्।',
      401,
    );
  }

  await recordLead(env, identity.sub, identity.email, identity.name, body.prompt);

  return new Response(
    JSON.stringify({ signedIn: true, name: identity.name, email: identity.email }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'set-cookie': await issueSession(env, identity.sub),
      },
    },
  );
}

export function signOut(): Response {
  return new Response(JSON.stringify({ signedIn: false }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'set-cookie': clearSession(),
    },
  });
}

/**
 * Gate used by the metered routes. Returns the signed-in subject, or throws the
 * refusal the browser turns into the sign-in prompt.
 */
export async function requireSignIn(request: Request, env: Env): Promise<string | null> {
  if (!authRequired(env)) return null;

  const sub = await readSession(env, request);
  if (sub) return sub;

  throw new RefusalError(
    'sign_in_required',
    'Please sign in with Google to see your design.',
    'डिजाइन हेर्न Google बाट साइन इन गर्नुहोस्।',
    401,
  );
}

/**
 * One record per person, accumulating what they have asked for over time —
 * three visits from the same person is one lead who has described three
 * houses, not three leads.
 */
async function recordLead(
  env: Env,
  sub: string,
  email: string,
  name: string,
  prompt?: string,
): Promise<void> {
  const key = `lead:${sub}`;
  const now = new Date().toISOString();

  try {
    const existing = await env.METER.get<Lead>(key, 'json');

    const lead: Lead = existing
      ? {
          ...existing,
          email: email || existing.email,
          name: name || existing.name,
          lastSeen: now,
          sessions: existing.sessions + 1,
          prompts: prompt
            ? [...new Set([...existing.prompts, prompt])].slice(-20)
            : existing.prompts,
        }
      : {
          sub,
          email,
          name,
          firstSeen: now,
          lastSeen: now,
          sessions: 1,
          prompts: prompt ? [prompt] : [],
        };

    await env.METER.put(key, JSON.stringify(lead), { expirationTtl: LEAD_TTL_SECONDS });
    console.log(JSON.stringify({ type: 'lead', sub, returning: Boolean(existing) }));
  } catch (err) {
    // Losing the lead record must not cost the customer their sign-in.
    console.error('lead write failed', err);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
