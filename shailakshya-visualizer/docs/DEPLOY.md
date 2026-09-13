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

## 7. Embed it in the company site

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
