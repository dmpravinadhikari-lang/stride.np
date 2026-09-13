# Shailakshya Griha Nirman — AI Home Visualizer

A visitor uploads a photo of a house, picks a style, and sees that house
restyled — daylight and evening. The point is lead generation: every session
should leave the company holding a record of what that person likes.

`SPEC.md` is the brief and the contract. This README is what actually exists.

**Phase 1 (exterior restyle) is built and passing its acceptance criteria.**
Phases 2–5 are not started.

---

## Running it

```bash
npm install
npm run dev:worker      # http://localhost:8787 — the whole thing
```

That runs on the **mock provider**: deterministic placeholder images, zero cost,
no Cloudflare account needed. The cache, rate limiter and circuit breaker are all
real in this mode, so the entire flow can be demoed and tested offline.

```bash
npm run check           # typecheck, unit tests, build
npm run acceptance      # the SPEC §12 criteria, end to end
npm run dev             # Vite alone, frontend only (API calls will fail)
```

To deploy and switch on real generation, see [docs/DEPLOY.md](docs/DEPLOY.md).

---

## How it is put together

One Worker serves both the API and the built widget, so there is a single deploy
and a single origin.

```
worker/
  index.ts          routing, CORS, image serving, the nightly cron
  routes/restyle.ts entry point A — the order of operations here IS the
                    cost-control design; read the comment at the top
  lib/
    cache.ts        the cache key, checked before anything else
    breaker.ts      daily Neuron budget and the circuit breaker
    ratelimit.ts    per-IP daily cap
    upload.ts       validation, EXIF/GPS stripping, R2
    vision.ts       rejects photos that are not buildings
    sweep.ts        30-day deletion of uploaded photos
    log.ts          per-generation logging and style popularity
  providers/
    index.ts        generateImage() — the only seam that knows about models
    mock.ts         zero-cost placeholders
    workers-ai.ts   FLUX Schnell (text-to-image) + SD 1.5 (image-to-image)
  styles/packs.ts   the seven style packs and their prompts

web/src/            the widget: vanilla TS, no framework, 24 kB / 8 kB gzipped
tests/              unit tests, EXIF stripping most of all
scripts/            the acceptance suite
```

### Where the money is saved

Roughly in the order the code checks them:

1. **Cache first, always.** Keyed on entry point, style pack, room type, house
   type and the uploaded photo's content hash. Checked before the rate limiter
   and before the breaker, so a returning visitor is served even when the system
   is otherwise at capacity.
2. **Rate limit** — 10 custom generations per IP per day. Cache hits are not
   counted; browsing costs nothing, so limiting it would only punish the
   visitors the company wants.
3. **Circuit breaker** — a running daily Neuron total. At 80% of budget live
   generation stops and visitors are offered cached designs plus a callback,
   which is itself the lead capture.
4. **Vision check** before the expensive call, so a selfie is refused cheaply.

### Two things worth knowing

**FLUX Schnell cannot restyle a photo.** On Workers AI it is text-to-image only,
with no image input, so it cannot preserve a real house's geometry. Entry point A
therefore runs on Stable Diffusion 1.5 img2img at low strength, and FLUX is kept
for text-to-image work (the Phase 2 interiors and catalogue pre-generation).
Swapping this is one constant in `worker/providers/workers-ai.ts`.

**Prompts are the quality risk, not the code.** Base models are trained
overwhelmingly on Western houses and will return a suburban home with a pitched
shingle roof unless actively pushed off it. Every prompt is built from a shared
Kathmandu-valley grounding clause — flat roofs with parapets and water tanks,
terrazzo, wooden frames with metal grills, `aankhi jhyal`, valley daylight —
plus a hard negative list. Do not trim the grounding to shorten a prompt.

---

## What is deliberately not here

- **No lead capture yet.** Phase 3. The refusal messages already point at it.
- **No prompt box, ever.** Visitors pick from cards; prompts stay server-side.
  This keeps quality consistent, blocks prompt abuse and makes results cacheable.
- **No measurements, dimensions or buildability claims.** Out of scope by
  instruction (SPEC §1) and reinforced by the notice burned into every image.

## Before this goes in front of the client

- [ ] **Real house photos.** The hero is a before/after slider on a real
      Shailakshya house; it currently runs on labelled placeholders. See
      `web/public/reference/README.md`.
- [ ] **Confirm the style pack list** — seven are suggested in SPEC §6 and
      implemented; the client should confirm the final set and the Nepali names.
- [ ] **Tune the Neuron estimates** against the real dashboard figures
      (docs/DEPLOY.md step 6).
- [ ] **Check the Devanagari** with a native reader. The UI strings were written
      to pair with the English, not translated from it, and they should be read
      by someone who would notice if a phrase is stiff.
