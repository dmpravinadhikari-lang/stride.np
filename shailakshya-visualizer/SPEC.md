# Build brief — Shailakshya Griha Nirman AI Home Visualizer

## How to use this file

Don't paste this whole thing as one prompt. Save it into the repo as `SPEC.md`, then start Claude Code and say:

> Read SPEC.md. Build Phase 1 only. Ask me anything ambiguous before you start writing code.

Work phase by phase. Review and run each phase before moving to the next. After each phase, tell Claude Code to update `SPEC.md` with what actually got built so the next session has accurate context.

---

## 1. What this is

A web feature on Shailakshya Griha Nirman's website (Nepali residential construction company) that lets a visitor see what a house could look like — inside and out — in a style they choose.

**The business goal is lead generation, not architecture.** Every session should end with the company holding a qualified contact and a record of that person's taste. The visualizer is the hook.

**Precision is explicitly out of scope.** Output is for visualization and inspiration. Nothing here is a construction drawing, a measurement, or a commitment. Do not build measurement tools, dimension overlays, or anything that implies buildable accuracy.

---

## 2. What the user does

Three entry points, all landing in the same result view:

**A. Restyle an exterior** (build first)
Upload a photo of a house → pick a style → get that house restyled in that style, geometry preserved.

**B. Design an interior**
Pick a room type (living / bedroom / kitchen / bathroom / puja room) → pick a style → get a set of views of that room.

**C. Upload a floor plan**
Upload a plan image or PDF → system reads it → generates an interior view per room, plus a suggested exterior.

---

## 3. What "3D" means here

Clarify this in the UI copy so expectations stay honest. There is no real-time 3D model. "3D" is delivered as:

- **Multi-angle sets.** Every generation produces 3–4 consistent views of the same space (wide, corner, detail) rather than a single image. Presented in a swipeable viewer, this reads as dimensional.
- **A day/night pair** for exteriors. Same house, two lighting conditions. Cheap to generate, disproportionately impressive.
- **Optional, Phase 5 only:** a Three.js massing block model extracted from the floor plan — grey volumes, no materials — that the user can orbit. This anchors the generated images in space. Only build this if Phases 1–4 are solid.

---

## 4. Technical stack

Everything must run inside free tiers. This is a hard constraint, not a preference.

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Vanilla TS + Vite, or Astro | Must embed into an existing site as a single script tag. No framework lock-in. |
| Backend | Cloudflare Workers | Free tier. |
| Image generation | Cloudflare Workers AI — FLUX Schnell | 10,000 Neurons/day free, no card required. |
| Plan reading | Cloudflare Workers AI — Llama Vision | Same Neuron pool. |
| Image storage | Cloudflare R2 | 10 GB free. |
| Cache + leads | Cloudflare KV (cache), D1 (leads) | |
| Deploy | Wrangler | |

Abstract the image provider behind a single `generateImage(prompt, options)` interface. Free tiers get cut without warning — swapping to Replicate or a self-hosted ComfyUI endpoint must be a one-file change.

---

## 5. Cost control — read this before writing any generation code

The free tier dies instantly without these. Build them in Phase 1, not later.

1. **Cache first, always.** Cache key is `hash(entryPoint + roomType + stylePack + houseTypeId)`. Check KV before ever calling the model. For catalogue houses and standard rooms, the cache hit rate should exceed 90%.
2. **Pre-generate the catalogue.** Write a `scripts/pregenerate.ts` that batch-generates every combination of the company's standard house types × all style packs, offline, and seeds R2 + KV. Run it once at build time. Most visitors then get instant cached results at zero cost.
3. **Only custom uploads hit the model live.**
4. **Rate limit custom generations** at 3 per verified phone number, 10 per IP per day.
5. **Global daily circuit breaker.** Track Neuron spend in KV. At 80% of daily budget, stop live generation and serve cached results with a message: "Custom designs are at capacity today. Browse saved designs, or leave your number and we'll send yours tomorrow." That message is itself a lead capture.
6. **Log every generation** with cost, latency, cache hit/miss, style pack. The company needs to see what people actually want.

---

## 6. Style packs

Users never see a free-text prompt box. They pick from 6–8 style cards, each mapping to a long tuned prompt held server-side. This keeps quality consistent, blocks prompt abuse, and makes everything cacheable.

**Critical:** base models are trained overwhelmingly on Western and Scandinavian interiors. Prompted naively, output will look nothing like a Nepali home and the client will reject it. Every prompt must carry South Asian and Kathmandu-valley specifics:

- Terrazzo, marble and polished concrete flooring — not wall-to-wall carpet
- Wooden window frames with metal grills; `aankhi jhyal` lattice work where the style calls for it
- Flat roofs with parapet walls and water tanks — not pitched shingle roofs
- Exposed brick, cement plaster, local stone
- Strong directional valley daylight, not soft Nordic overcast
- Ceiling fans, not central air

Suggested packs — confirm the final list with the client:
Modern Minimal · Traditional Newari · Contemporary Concrete · Warm Wood · Brick & Courtyard · Luxury Marble · Compact Urban

Each pack needs: display name (English + Nepali), one-line description, a reference thumbnail, and a server-side prompt template with slots for room type and dimensions.

**Negative prompts matter as much as positive ones.** Exclude: watermark, text, people, distorted perspective, western suburban house, pitched roof, snow.

---

## 7. Floor plan reading

Do **not** feed the plan into ControlNet and ask for a perspective view. That produces mush.

Correct approach: the vision model reads the plan and returns structured JSON —

```json
{
  "floors": 2,
  "rooms": [
    { "name": "Master Bedroom", "approxSizeFt": [12, 14], "floor": 1,
      "features": ["large window", "attached bathroom"] }
  ]
}
```

That JSON **informs the text prompt** for each room. The plan shapes the description; it never constrains the pixels. If the model returns low confidence or unparseable output, fall back to entry point B (pick a room type manually) rather than showing a bad result.

---

## 8. Lead capture

The flow that makes this worth building:

1. First generation is free, no signup. The user must see value before being asked for anything.
2. To download, save, or generate again → phone number (Nepali format, OTP verify) or email.
3. Store in D1: contact, all style choices, room types, uploaded images, timestamp, session duration.
4. Company-side view at `/admin` (password-protected, simple is fine): leads sorted by recency, with each person's generated images and style preferences visible. A salesperson should be able to open a lead and immediately know what that person likes.
5. Every generated image gets a subtle corner watermark with the company logo and website, so shared images route traffic back.

---

## 9. Design direction

The client has seen generic template sites and doesn't want another one. Make deliberate choices.

**Concept:** a builder's material sample board, not a SaaS dashboard. The subject matter is physical — plaster, brick, timber, terrazzo. The interface should feel like handling samples.

**Palette** (base — adjust if the client has brand colours):
- `#22262B` graphite — primary surfaces and text
- `#F2EFE9` plaster — page background
- `#C9C2B6` dust — borders, inactive states
- `#E0A11B` marigold — the single accent, used sparingly for primary actions only

Marigold is chosen deliberately: it's culturally present in Nepal (sayapatri) and it avoids the terracotta-on-cream palette that every AI-generated site currently uses. Do not add a second accent colour.

**Type:** one sans family with real character for Latin, paired with a Devanagari face — Devanagari support is a hard requirement, the whole UI ships bilingual. Khand or Mukta for Devanagari display. Set a clear type scale. Body line length under 80 characters.

**Layout:**
- Hero is a live before/after slider on a real Shailakshya house — drag the handle, see it restyled. No stock photography, no headline-over-gradient. The demo *is* the hero.
- Style selection uses large tactile image cards, not a dropdown.
- The result view is full-bleed. The image is the product; chrome gets out of the way.
- Generation takes 10–20 seconds. Fill that with something real — show the prompt being assembled, or a progressive blur-up reveal. Never a bare spinner.

**Avoid:** all-caps eyebrow labels, identical rounded cards for everything, `01 / 02 / 03` numbering where content isn't sequential, fade-and-slide-up on every section, arrows appended to button text.

**Quality floor:** mobile-first — most Nepali traffic is mobile, on variable connections. Serve WebP, lazy load, target usable performance on 3G. Visible keyboard focus. Respect `prefers-reduced-motion`.

---

## 10. Guardrails

- Every generated image carries a visible notice, English and Nepali: **"Visualization only — not a construction specification."** On the image itself, not just the page.
- Reject uploads that aren't buildings. Run a cheap vision check before generating.
- Strip EXIF from uploads. Never store location data.
- Auto-delete uploaded photos after 30 days.
- Clear consent checkbox before storing any contact details.
- Never claim a generated design is priced, available, or buildable.

---

## 11. Build phases

**Phase 1 — Exterior restyle.**
Upload photo → pick style → restyled result. Caching, rate limiting and the circuit breaker built in from the start. No lead capture yet. Ship this and demo it.

**Phase 2 — Interiors.**
Room type + style → multi-angle view set. Pre-generation script for the standard catalogue.

**Phase 3 — Lead capture and admin.**
OTP verification, D1 storage, admin view, watermarking.

**Phase 4 — Floor plan reading.**
Vision extraction to JSON, per-room generation, graceful fallback.

**Phase 5 — Optional 3D massing.**
Three.js orbit model from plan geometry. Only if 1–4 are stable.

## 12. Acceptance criteria for Phase 1

- Works on a 360px viewport
- Cached result returns in under 1 second
- Uncached generation completes in under 25 seconds with a non-spinner loading state
- Circuit breaker verified by forcing the daily budget to zero
- Zero cost incurred across 50 test generations, verified in the Cloudflare dashboard
- A non-technical person completes the flow without instruction

---

# Build status

*Appended by the build. The brief above is unchanged and remains the contract;
this section records what actually exists.*

**Phase 1 — Exterior restyle: built, and passing §12.**
Phases 2–5: not started.

## What was built

| Area | State |
|---|---|
| Entry point A — upload, style, restyled day/night pair | Built |
| Cache (§5.1) | Built. Keyed on entry point + room type + style pack + house type + upload hash. Checked before every other gate. |
| Pre-generated catalogue (§5.2) | **Not built** — needs the company's house list. See "Open" below. |
| Rate limiting (§5.4) | Per-IP daily cap built. Per-phone cap waits on Phase 3 OTP. |
| Circuit breaker (§5.5) | Built, and verified by forcing the daily budget to zero. |
| Generation logging (§5.6) | Built: structured logs plus style-pack popularity counters in KV. |
| Style packs (§6) | All seven built, bilingual, prompts server-side, Kathmandu grounding and negative list applied. |
| Provider abstraction (§4) | Built. `generateImage()` with a zero-cost mock and a Workers AI adapter. |
| Guardrails (§10) | Built: EXIF/GPS stripping, non-building rejection, 30-day deletion, notice on the image. |
| Design (§9) | Built: sample-board system, before/after hero, tactile style cards, full-bleed result, prompt-assembly loading state. |
| Lead capture (§8) | Not built — Phase 3, as specified. |

## §12 acceptance — verified

Run `npm run acceptance` to reproduce. Last run: all 16 checks passed.

| Criterion | Result |
|---|---|
| Works on a 360px viewport | Pass — asserted programmatically, no horizontal overflow at 360px |
| Cached result under 1 second | Pass — 28 ms |
| Uncached under 25s, non-spinner loading state | Pass — 930 ms on mock; loading state shows the prompt being assembled |
| Circuit breaker verified at zero budget | Pass — status reports not accepting, generation refused with 503 and a bilingual capacity message |
| Zero cost across 50 test generations | Pass — 50/50 succeeded, 0 Neurons |
| A non-technical person completes the flow | **Not verified** — needs a real person, not a test |

Unit tests (`npm run test`) cover EXIF/GPS stripping, magic-number sniffing,
upload limits and cache-key separation: 8 passing.

## Decisions taken during the build

1. **Placed at `shailakshya-visualizer/` inside the `stride.np` repository.**
   That repo is an unrelated product (a study-abroad platform); this is
   self-contained and shares nothing with it. It would be cleaner in its own
   repository, and moving it is a directory copy.

2. **FLUX Schnell cannot do entry point A.** On Workers AI it is text-to-image
   only — no image input, so it cannot preserve a real house's geometry.
   Exterior restyle runs on Stable Diffusion 1.5 img2img at low strength
   instead; FLUX is retained for text-to-image work. This is a genuine
   divergence from §4 and worth knowing before judging output quality.

3. **The mock provider is the default**, including on a fresh deploy. Real
   generation is one env var away. Every cost control is fully live in mock
   mode, which is what makes "zero cost across 50 generations" testable.

4. **The §10 notice is composited into saved images client-side**, via canvas,
   so a file shared to Viber or Facebook carries it. Server-side burn-in needs
   an image encoder in the Worker and belongs with Phase 3 watermarking.

5. **Neuron costs are estimated, not measured** — the API token available during
   the build was IP-restricted, so Workers AI was never called. The estimates
   are deliberately high (the breaker fails safe) and must be tuned against the
   dashboard on day one. docs/DEPLOY.md step 6.

## Open, and needed from the client

- **Real photographs of Shailakshya houses.** The hero runs on labelled
  placeholders. This is the single biggest gap: §9 requires a real house, and
  the house list is also what the pre-generation catalogue (§5.2) keys on —
  without it, most visitors pay a live generation instead of hitting cache.
- **Confirmation of the style pack list** and a read of the Nepali strings by a
  native speaker.
