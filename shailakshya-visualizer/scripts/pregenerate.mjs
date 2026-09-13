/**
 * Pre-generates the catalogue — SPEC §5.2.
 *
 * Walks every catalogue house × style pack (and every room type × style pack
 * for the Phase 2 interiors), asking the Worker to generate and cache each one.
 * Run it once after deploying, and again whenever a house type or style pack is
 * added. Visitors then browse at zero cost.
 *
 *   PREGENERATE_TOKEN=... node scripts/pregenerate.mjs \
 *     --base https://shailakshya-visualizer.<subdomain>.workers.dev --dry-run
 *
 * Drop --dry-run to actually spend Neurons.
 *
 * The script is deliberately dumb: the Worker owns the prompts, the cache keys
 * and the spend accounting, and this only decides what to ask for next and when
 * to stop. That is what keeps the seeded entries identical to what the live
 * path looks up.
 *
 * It is safe to interrupt and re-run. Combinations already cached are skipped,
 * so a run stopped by the daily budget picks up where it left off tomorrow.
 */

const args = parseArgs(process.argv.slice(2));
const BASE = (args.base ?? '').replace(/\/$/, '');
const TOKEN = process.env.PREGENERATE_TOKEN ?? args.token;
const DRY_RUN = Boolean(args['dry-run']);
const LIMIT = args.limit ? Number(args.limit) : Infinity;
// One at a time by default. This is a background job with no user waiting, and
// pacing it keeps latency for real visitors unaffected while it runs.
const CONCURRENCY = Math.max(1, Number(args.concurrency ?? 1));

if (!BASE || !TOKEN) {
  console.error(`
Pre-generate the catalogue.

  PREGENERATE_TOKEN=<secret> node scripts/pregenerate.mjs --base <worker url> [options]

  --base <url>         Deployed Worker URL. Required.
  --dry-run            Show the plan and the estimated spend. Generates nothing.
  --limit <n>          Stop after n generations. Useful for a first careful run.
  --concurrency <n>    Parallel requests. Default 1.
  --token <secret>     Alternative to the PREGENERATE_TOKEN env var. Prefer the
                       env var: an argument is visible in your shell history
                       and in the process list.

Set the secret first:  npx wrangler secret put PREGENERATE_TOKEN
`);
  process.exit(1);
}

const headers = {
  authorization: `Bearer ${TOKEN}`,
  'content-type': 'application/json',
};

// --- plan ------------------------------------------------------------------

const planResponse = await fetch(`${BASE}/api/admin/pregenerate`, { headers });

if (planResponse.status === 404) {
  fail(
    'The pre-generation endpoint is not enabled on this Worker.\n' +
      'Set the secret and redeploy:  npx wrangler secret put PREGENERATE_TOKEN',
  );
}
if (planResponse.status === 401) {
  fail('The token was rejected. Check PREGENERATE_TOKEN matches the deployed secret.');
}
if (!planResponse.ok) {
  fail(`Could not read the plan: HTTP ${planResponse.status}`);
}

const plan = await planResponse.json();

if (plan.exampleData) {
  fail(
    'worker/catalogue/houses.ts still contains the example house types.\n' +
      "Replace them with Shailakshya's real house types and set EXAMPLE_DATA to\n" +
      'false, or this run would spend Neurons on houses the company does not build.',
  );
}

const pending = plan.jobs.filter((job) => !job.cached).slice(0, LIMIT);

console.log(`Catalogue: ${plan.total} combinations`);
console.log(`  already cached : ${plan.alreadyCached}`);
console.log(`  to generate    : ${pending.length}`);
console.log(
  `  daily budget   : ${plan.budget.spent} / ${plan.budget.ceiling} Neurons spent`,
);

// Each job renders a day/night pair, and the Worker's own estimate for a
// text-to-image render is 60 Neurons per image. Rough by design — the point is
// to know whether this fits in a day, not to bill it.
const PER_JOB = 120;
const estimate = pending.length * PER_JOB;
const fitsToday = estimate <= plan.budget.remaining;

console.log(`  estimated cost : ~${estimate} Neurons (~${PER_JOB} per combination)`);
console.log(
  fitsToday
    ? '  this run should fit inside today\'s remaining budget.'
    : `  this will NOT fit today. Expect it to stop around ${Math.floor(plan.budget.remaining / PER_JOB)} combinations in, then re-run tomorrow.`,
);

if (pending.length === 0) {
  console.log('\nNothing to do — the catalogue is fully seeded.');
  process.exit(0);
}

if (DRY_RUN) {
  console.log('\nDry run. Nothing was generated. Combinations that would run:\n');
  for (const job of pending) console.log(`  ${job.label}`);
  process.exit(0);
}

// --- run -------------------------------------------------------------------

const started = Date.now();
let generated = 0;
let skipped = 0;
let failed = 0;
let neurons = 0;
let stopped = false;

const queue = [...pending];

async function worker() {
  while (queue.length > 0 && !stopped) {
    const job = queue.shift();
    if (!job) return;

    const label = job.label.padEnd(46).slice(0, 46);

    let response;
    try {
      response = await fetch(`${BASE}/api/admin/pregenerate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entryPoint: job.entryPoint,
          houseTypeId: job.houseTypeId,
          roomType: job.roomType,
          stylePackId: job.stylePackId,
        }),
      });
    } catch (err) {
      failed++;
      console.log(`  fail  ${label} ${err instanceof Error ? err.message : err}`);
      continue;
    }

    const body = await response.json().catch(() => ({}));

    // The Worker refuses once the daily ceiling is hit. Stop the whole run
    // rather than hammering it — and leave the rest for tomorrow.
    if (response.status === 503 && body.status === 'budget_exhausted') {
      stopped = true;
      console.log(`\n  Daily Neuron ceiling reached. Stopping cleanly.`);
      return;
    }

    if (!response.ok) {
      failed++;
      console.log(`  fail  ${label} HTTP ${response.status} ${body.error ?? ''}`);
      continue;
    }

    if (body.status === 'cached') {
      skipped++;
      console.log(`  skip  ${label} already cached`);
      continue;
    }

    generated++;
    neurons += body.neurons ?? 0;
    console.log(
      `  ok    ${label} ${String(body.neurons ?? 0).padStart(4)} Neurons  ${body.latencyMs}ms`,
    );
  }
}

console.log('');
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const seconds = Math.round((Date.now() - started) / 1000);
console.log(`
Done in ${seconds}s.
  generated : ${generated}
  skipped   : ${skipped}
  failed    : ${failed}
  spent     : ~${neurons} Neurons`);

if (stopped) {
  console.log(`
Stopped early on the daily budget. Re-run the same command tomorrow; everything
already generated will be skipped.`);
}

process.exit(failed > 0 && generated === 0 ? 1 : 0);

// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const name = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[name] = true;
    else {
      out[name] = next;
      i++;
    }
  }
  return out;
}

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}
