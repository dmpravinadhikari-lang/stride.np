/**
 * Phase 1 acceptance checks — SPEC §12, run against a live local Worker.
 *
 * Usage: node scripts/acceptance.mjs <phase> <baseUrl>
 *   main       cached under 1s, uncached under 25s, 50 generations at zero cost
 *   ratelimit  the per-IP daily cap actually refuses
 *   breaker    forcing the daily budget to zero stops live generation
 *
 * Driven by scripts/acceptance.sh, which starts a Worker per phase with the
 * settings that phase needs.
 */
const [, , phase = 'main', base = 'http://localhost:8787'] = process.argv;

const MINIMAL_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
    'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAHwAA' +
    'AQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQR' +
    'BRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RF' +
    'RkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ip' +
    'qrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEB' +
    'AAA/APn+iiigD//Z',
  'base64',
);

/** Distinct photos, so each request is a genuine cache miss. */
function photo(n) {
  return Buffer.concat([MINIMAL_JPEG, Buffer.from(`variant-${n}`)]);
}

async function restyle(n, style = 'warm-wood') {
  const form = new FormData();
  form.append(
    'photo',
    new File([new Uint8Array(photo(n))], `h${n}.jpg`, { type: 'image/jpeg' }),
  );
  form.append('stylePackId', style);

  const started = Date.now();
  const response = await fetch(`${base}/api/restyle`, { method: 'POST', body: form });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body, ms: Date.now() - started };
}

const checks = [];
const check = (name, pass, detail) => {
  checks.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

if (phase === 'main') {
  const first = await restyle(1);
  check('uncached generation succeeds', first.status === 200, `status ${first.status}`);
  check(
    'returns a day/night pair',
    first.body.images?.length === 2,
    `${first.body.images?.length} images`,
  );
  check('uncached completes under 25s', first.ms < 25_000, `${first.ms}ms`);
  check('reports itself as uncached', first.body.cached === false, String(first.body.cached));

  const second = await restyle(1);
  check('identical request hits cache', second.body.cached === true, String(second.body.cached));
  check('cached result returns under 1s', second.ms < 1000, `${second.ms}ms`);

  // The URL must actually resolve, not merely be returned.
  const image = await fetch(`${base}${first.body.images[0].url}`);
  check('generated image is served', image.ok, `status ${image.status}`);

  // SPEC §10: the notice travels on the image itself.
  const body = await image.text();
  check('image carries the visualization-only notice', body.includes('Visualization only'), '');

  let neurons = 0;
  let ok = 0;
  for (let i = 0; i < 50; i++) {
    const run = await restyle(100 + i);
    if (run.status === 200) ok++;
    neurons += run.body.neurons ?? 0;
  }
  check('50 generations all succeed', ok === 50, `${ok}/50`);
  check('50 generations cost zero', neurons === 0, `${neurons} neurons`);
}

if (phase === 'ratelimit') {
  const results = [];
  for (let i = 0; i < 4; i++) results.push(await restyle(200 + i));

  const refused = results.filter((r) => r.status === 429);
  check(
    'rate limit refuses past the cap',
    refused.length > 0,
    results.map((r) => r.status).join(','),
  );
  check(
    'refusal is bilingual',
    Boolean(refused[0]?.body?.messageEn && refused[0]?.body?.messageNe),
    '',
  );
}

if (phase === 'breaker') {
  const status = await (await fetch(`${base}/api/status`)).json();
  check('status reports not accepting', status.accepting === false, JSON.stringify(status));

  const run = await restyle(300);
  check('live generation is refused', run.status === 503, `status ${run.status}`);
  check(
    'refusal offers a way to leave contact details',
    /leave your number/i.test(run.body.messageEn ?? ''),
    '',
  );
  check('refusal is bilingual', Boolean(run.body.messageNe), '');
}

const failed = checks.filter((c) => !c.pass);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);
