# Deploying the visualizer

Everything here runs inside Cloudflare's free tier. The steps are in the order
they need to happen; none of them requires a card.

Run these from your own machine, not from a CI box or a cloud shell — see
[API token notes](#api-token-notes) for why that matters.

---

## 1. Sign in

```bash
cd shailakshya-visualizer
npm install
npx wrangler login
```

## 2. Create the resources

```bash
npx wrangler kv namespace create CACHE
npx wrangler kv namespace create METER
npx wrangler r2 bucket create shailakshya-images
```

Each `kv namespace create` prints an id. Paste them into `wrangler.toml`,
replacing `PLACEHOLDER_REPLACE_ME_CACHE` and `PLACEHOLDER_REPLACE_ME_METER`.
**The Worker will not deploy until you do** — that is deliberate, so a
placeholder can never reach production.

## 3. Set the 30-day photo retention rule

SPEC §10 promises uploaded photos are deleted after 30 days. The Worker's nightly
cron sweeps them, but an R2 lifecycle rule is the real guarantee, because it
keeps working even if the cron is disabled:

**Cloudflare dashboard → R2 → `shailakshya-images` → Settings → Object
lifecycle rules → Add rule**

- Prefix: `uploads/`
- Delete objects 30 days after upload

Do not add a rule for `generated/`. Those images carry no personal data and they
are what the cache points at — deleting them silently starts costing money again.

## 4. Deploy

```bash
npm run deploy
```

This builds the widget and pushes the Worker; both are served from one origin,
so there is nothing else to host.

## 5. Turn on real generation

The Worker deploys on the mock provider, which costs nothing and returns
placeholder images. Everything — cache, rate limits, the circuit breaker — is
live in that mode, so deploy first, click through it, then switch:

```bash
npx wrangler deploy --var IMAGE_PROVIDER:workers-ai
```

Or change `IMAGE_PROVIDER` in `wrangler.toml` and redeploy. To go back, set it to
`mock`. Any unrecognised value falls back to `mock` rather than to something that
spends money.

## 6. Tune the Neuron estimates on day one

This is the one step that is easy to skip and shouldn't be.

The circuit breaker decides when to stop by *estimating* what each generation
costs, using the constants at the top of `worker/providers/workers-ai.ts`. They
are deliberate over-estimates — the breaker stops early rather than overspending —
but they are guesses until you compare them with reality:

**Cloudflare dashboard → AI → Workers AI → Usage**

Compare the real Neurons-per-request against `NEURONS_TEXT_TO_IMAGE` and
`NEURONS_IMG2IMG` and adjust. Keep them rounded *up*.

## 6b. Using OpenAI for the exterior views

**This is the one step that takes the system off the free tier.** Everything
else runs inside Cloudflare's free allowance; OpenAI bills per image. Read this
section before enabling it.

```bash
npx wrangler secret put OPENAI_API_KEY      # paste the key; never commit it
npx wrangler deploy \
  --var IMAGE_PROVIDER:mock \
  --var IMAGE_PROVIDER_EXTERIOR:openai
```

### Why exteriors only

A full set is seven images: the exterior day/night pair plus a view of each main
room. The exterior is the one the customer shows their family, so it is worth
paying for. The five interiors are not worth five times the same price.
`IMAGE_PROVIDER_EXTERIOR` exists exactly so you can split them, and it cuts the
paid images per design from seven to two.

### How spend is metered

Not from a guessed per-image price. OpenAI reports token usage on every
response, and the provider converts that to **micro-dollars** using
`OPENAI_USD_PER_MTOK_OUTPUT` and `..._INPUT`.

**Set those two from the current pricing page for the model you chose.** They
default deliberately high, so an unconfigured deployment over-counts and stops
early — that is the safe direction. Setting them too low is precisely how the
breaker fails to stop before the bill arrives.

When `openai` is active, `DAILY_NEURON_BUDGET` is therefore in micro-dollars:

| Daily cap | Set it to |
|---|---|
| US$1 | `1000000` |
| US$5 | `5000000` |
| US$20 | `20000000` |

With `BREAKER_THRESHOLD` at 0.8, generation stops at 80% of that, and visitors
get the capacity message and the callback offer instead. The floor plan stays
free and keeps working — that is the point of splitting the endpoints.

### Working out what it will cost you

Measured, not estimated: one exterior day/night pair at `low` quality and
1536×1024 used **about 800 output image tokens plus roughly 360 input tokens**.
Multiply by your rate to get cost per design, then by expected designs per day.

Two levers if the number is too big:

- **Quality.** `low` → `medium` → `high` costs meaningfully more each step. Try
  `low` first and look at it; the exteriors are already good at `low`.
- **The cache.** A repeat brief is free — the cache key is a hash of the land
  and requirements, so two customers with the same plot and needs cost one
  generation between them. Pre-generating the common briefs is what turns this
  from per-visitor cost into a fixed one.

### Rotating the key

`wrangler secret put OPENAI_API_KEY` again with the new value, then revoke the
old one in the OpenAI dashboard. The key is never written to a file in this
repository and never reaches the browser — generation happens in the Worker.

## 7. Pre-generate the catalogue

This is what keeps the free tier intact. Every catalogue house type is rendered
once against every style pack and cached, so visitors who browse cost nothing.

**First, put the real house types in.** `worker/catalogue/houses.ts` ships with
three examples and an `EXAMPLE_DATA = true` flag. Both the endpoint and the
script refuse to run while it is set, so nobody spends Neurons rendering houses
the company does not build. Replace the list, set the flag to `false`, redeploy.

Then enable the endpoint and run it:

```bash
npx wrangler secret put PREGENERATE_TOKEN     # paste a long random string
npm run deploy

# always dry-run first: it prints the plan and the estimated spend
PREGENERATE_TOKEN=<same secret> npm run pregenerate -- \
  --base https://your-worker.workers.dev --dry-run

# then for real
PREGENERATE_TOKEN=<same secret> npm run pregenerate -- \
  --base https://your-worker.workers.dev
```

Notes:

- **It is safe to interrupt and re-run.** Combinations already cached are
  skipped, so a run stopped by the daily ceiling picks up tomorrow.
- **It respects the same daily budget as visitors.** A big batch must not be
  what locks real customers out for the day, so the Worker refuses once the
  ceiling is hit and the script stops cleanly rather than hammering it.
- `--limit 5` is a sensible first real run: check the output looks like
  Shailakshya's work before committing the whole matrix.
- Re-run it whenever a house type or a style pack is added.
- The endpoint 404s unless `PREGENERATE_TOKEN` is set, so it does not exist on
  a normal deploy. It accepts only catalogue ids and known style packs, never a
  free-text prompt.

### What pre-generation does and does not buy you

It makes **browsing** free. It does nothing for a visitor who uploads their own
photo — that path is keyed on the photo's content hash, so it is a live
generation every time, and that is the metered path the rate limit and breaker
exist to protect.

So the >90% cache hit rate in SPEC §5.1 depends on most visitors browsing the
catalogue rather than uploading. The browse screen is Phase 2 UI work; the data
and the read endpoints (`/api/catalogue`, `/api/catalogue/result`) are already
here and already seeded by this script.

## 8. Embed it in the company site

Two lines, wherever the visualizer should appear:

```html
<div data-shailakshya-visualizer data-api="https://your-worker.workers.dev"></div>
<script type="module" src="https://your-worker.workers.dev/visualizer.js"></script>
```

`data-api` is only needed when the widget is served from a different origin than
the Worker. Served from the Worker itself, omit it.

---

## Settings

All of these are `[vars]` in `wrangler.toml`, changeable from the dashboard
without a redeploy.

| Var | Default | What it does |
|---|---|---|
| `IMAGE_PROVIDER` | `mock` | `mock` or `workers-ai`. |
| `DAILY_NEURON_BUDGET` | `10000` | The free tier's daily Neuron allowance. |
| `BREAKER_THRESHOLD` | `0.8` | Fraction of budget at which live generation stops. |
| `RATE_LIMIT_PER_IP_PER_DAY` | `10` | Custom generations per IP per day. Cache hits are not counted. |

### Why the threshold is 0.8 and not 1.0

Spend is counted in KV, which is eventually consistent. Under concurrent
requests the true figure can briefly run ahead of the counter, so the 20%
headroom absorbs that drift. Raising this to 1.0 is how you get a surprise bill.
If you ever need it exact, move the counter in `worker/lib/breaker.ts` to a
Durable Object — nothing outside that file would change.

---

## Checking on it

```bash
npx wrangler tail                      # live structured logs
curl https://your-worker.workers.dev/api/status
```

Every generation logs one JSON line with cache hit/miss, latency, Neurons and
style pack. Style-pack popularity also accumulates in the `METER` KV namespace
under `stat:style:<id>:<date>` — which style people actually pick is the most
commercially useful thing this system learns.

### Forcing the breaker shut, to see what visitors see

```bash
npx wrangler deploy --var DAILY_NEURON_BUDGET:0
```

Every custom generation then returns the capacity message. Set it back
afterwards. `npm run acceptance` runs this same drill locally.

---

## API token notes

If you use an API token instead of `wrangler login`, be aware that a token
restricted by IP only works from an allowed address. The token supplied while
this was being built was correctly IP-locked, which is why the build ran entirely
against the mock provider and never reached Workers AI.

Keep the restriction. Deploy from your own machine and add that address to the
token, rather than widening the token to a shared or cloud IP.

A token needs: **Workers Scripts:Edit**, **Workers KV Storage:Edit**,
**Workers R2 Storage:Edit**, **Workers AI:Edit**, **Account Settings:Read**.

Never commit a token. `.dev.vars` is gitignored; keep secrets there locally and
in `wrangler secret put` for production.
