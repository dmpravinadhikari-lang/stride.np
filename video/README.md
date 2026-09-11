# STRIDE video

Remotion project for STRIDE's motion graphics. Separate from the Next.js app
next to it: its own `package.json`, its own `node_modules`, nothing shared.

## Running it

```bash
cd video
npm i
npm run dev       # Remotion Studio, scrub and edit live
```

Render the 1920×1080 MP4:

```bash
npx remotion render StrideIntro out/stride-intro.mp4
```

`out/` is ignored by git — the video is built from the source, not committed.

## What is in here

`StrideIntro` — 19 seconds, 1920×1080, 30fps. Four scenes over one continuous
backdrop, cross-fading:

| Frames | Scene | |
|---|---|---|
| 0–132 | `scenes/Mark` | the cyan dot walks in from the left and the wordmark appears behind it, then it settles as the full stop |
| 122–302 | `scenes/Capabilities` | four cards: SOP Studio, IELTS mocks, true cost, document vault |
| 292–462 | `scenes/Pipeline` | the seven stages a student moves through, lighting as the line reaches them |
| 452–570 | `scenes/EndCard` | the mark, the tagline, the domain |

Scene ranges overlap by ten frames, which is where the cross-fade happens.
Timings live in one place, `StrideIntro.tsx`.

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
