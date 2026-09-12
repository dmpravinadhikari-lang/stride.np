# STRIDE video

Remotion project for the motion graphics — STRIDE's own, and the reels made
for the consultancies on it. Separate from the Next.js app next to it: its own
`package.json`, its own `node_modules`, nothing shared.

## Running it

```bash
cd video
npm i
npm run dev       # Remotion Studio, scrub and edit live
```

Render either MP4:

```bash
npx remotion render StrideIntro    out/stride-intro.mp4
npx remotion render HappyPandaReel out/happy-panda-reel.mp4
```

`out/` is ignored by git — the videos are built from the source, not committed.

## What is in here

### `StrideIntro` — 19 seconds, 1920×1080, 30fps. Four scenes over one continuous
backdrop, cross-fading:

| Frames | Scene | |
|---|---|---|
| 0–132 | `scenes/Mark` | the cyan dot walks in from the left and the wordmark appears behind it, then it settles as the full stop |
| 122–302 | `scenes/Capabilities` | four cards: SOP Studio, IELTS mocks, true cost, document vault |
| 292–462 | `scenes/Pipeline` | the seven stages a student moves through, lighting as the line reaches them |
| 452–570 | `scenes/EndCard` | the mark, the tagline, the domain |

Scene ranges overlap by ten frames, which is where the cross-fade happens.
Timings live in one place, `StrideIntro.tsx`.

### `HappyPandaReel` — 15 seconds, 1080×1920, 30fps

Instagram Reels shape, for Happy Panda Education Consultancy announcing their
new site. Source in `src/happypanda/`, timings in `HappyPandaReel.tsx`.

| Frames | Scene | |
|---|---|---|
| 0–80 | `Hook` | "Our new website is live", panda with the suitcase |
| 74–150 | `Ask` | the three questions every student arrives with |
| 144–330 | `Screens` | six screens of the real site, one a second |
| 324–384 | `OnePlace` | "All of it, in one place" |
| 378–456 | `Close` | logo, address, link in bio |

Two things this composition depends on:

**The panda artwork.** `public/happypanda/` holds `panda-ticket.png`,
`panda-namaste.png`, `panda-thinking.png` and `logo.png`. What is committed
there now are **placeholders** — dashed boxes with the filename on them.
Replace each with the real artwork at the same path, transparent PNG, and
re-render. Nothing else has to change.

**The screens.** `public/happypanda/shots/` — regenerate with `npm run shots`
from the app's own root after a UI change. See the README in that folder.

`SITE` in `src/happypanda/brand.ts` is the address on the end card. It is set
to the subdomain the platform assigns, `happypanda.stride.np`; change that one
line if they are on a domain of their own.

Instagram lays its own furniture over a reel — the caption along the bottom,
the buttons up the right. `SAFE` in `src/happypanda/brand.ts` keeps anything
that has to be read clear of it.

## Staying on brand

`src/brand.ts` mirrors the app: the words from `src/lib/brand.ts`, the colours
from the `@theme` block in `src/app/globals.css`. Nothing in a scene should
hard-code a hex value — if a colour is missing from `brand.ts`, add it there.
The two are copies rather than imports because Remotion is a separate npm
project and cannot reach across the boundary, so a palette change in the app
needs the same edit here.

The stage names in `scenes/Pipeline` are the real ones from
`src/modules/pipeline/stages.ts`, minus the "Lost" off-ramp.

## Fonts

Archivo and Poppins, latin subsets, committed under `public/fonts/` and loaded
from disk rather than the Google CDN, so a render is deterministic and works
offline. Adding a weight means downloading that file and declaring it in
`src/fonts.ts`.

## Licence

Remotion is free for teams of up to three people. Beyond that a company
licence is needed — https://www.remotion.pro/license.
