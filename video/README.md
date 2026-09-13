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
npx remotion render ShilakshyaReel out/shilakshya-reel.mp4
npx remotion render HouseTipsReel  out/house-tips-reel.mp4
npx remotion render AlevReel       out/alev-reel.mp4
```

`out/` is ignored by git — the videos are built from the source, not committed.

## Editing without touching code

`HouseTipsReel` and `AlevReel` declare a schema, so Remotion Studio draws a
form for everything in them. Run `npm run dev`, pick the composition, open the
right-hand panel, and you get a text box per headline, a path per photograph,
a colour picker per accent and a number per scene length — previewing every
keystroke. **Save** writes the values straight back into `src/Root.tsx`, so an
edit made in the browser is a commit you can push.

Three things worth knowing:

- **Swapping a photograph** is a path under `public/`. Drop the new file into
  `public/alev/` (any name), type the path, done — no code change. Keep the
  long side around 1400px; the originals off a website are usually far bigger
  than a 1080-wide render needs.
- **Timings are seconds, not frames.** Change one and the composition's length
  changes with it — `calculateMetadata` recomputes it, so the timeline never
  disagrees with the video.
- **Lists are lists.** `dishes` and `tips` can be added to, reordered and
  deleted from in the form. Add a sixth tip and the reel gets longer.

## Sound

`HouseTipsReel` and `AlevReel` both take a **music** track and a **voiceover**,
as fields in the same form: a path under `public/`, a volume, fade in and out
in seconds, where in the track to start, and whether to loop a bed shorter
than the reel. An empty filename is silence, which is the default. When a
voiceover is set the music ducks under it by a fixed amount.

```
public/music/your-track.mp3   →   music.file = "music/your-track.mp3"
```

**For Instagram, silent is often the right answer.** Adding a trending track
inside the Instagram app puts your reel into that track's audio feed, where
people browse it — a bed baked into the MP4 cannot be discovered that way, and
Instagram may mute the whole video if it recognises a track you do not have
the rights to. Bake in the voiceover and any sound effects; add the music in
the app.

Where a baked-in track is right — a website loop, a screen in the showroom,
something sent on WhatsApp — it has to be a licensed one. The YouTube Audio
Library and Pixabay are free and safe; Uppbeat and Epidemic Sound are paid and
better. Never a commercial song.

### Voiceover

`scripts/voiceover.ts` generates narration with ElevenLabs, one clip per line:

```bash
ELEVENLABS_API_KEY=... npm run voiceover -- shilakshya
```

The key needs the **Text to Speech** permission — a key without it
authenticates and then refuses every synthesis, which is the one failure that
looks like a bad key and is not.

`StrideIntro`, `HappyPandaReel` and `ShilakshyaReel` predate this and still
take their words from their own files. Converting them is the same three steps
described in the repository's `CLAUDE.md`.

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

### `HouseTipsReel` — 19 seconds, 1080×1920, 30fps

Five things people building in Nepal actually skip — the soil test, where
setback is measured from, the completion certificate, the BOQ, and the water —
each on a technical sheet drawn for it. Source in `src/tips/`, words and
timings in the form.

The house is drawn **outside** the scenes, on its own clock, so it keeps
building straight through every cut instead of restarting with each card:
stage 1 pegs the plot, 2 pours the foundation, 3 raises the frame, 4 fills the
walls and adds the floor above, 5 finishes it — parapet, water tank, windows,
paint. The sky walks through five gradients as it goes, so the house is
finished in an afternoon light it started the morning without.

The tips are in `copy.ts`. They carry **no numbers** for ground coverage,
setback or FAR on purpose: every municipality publishes its own bylaws and they
differ, so one palika's figure would be wrong for most of the people watching.
The tip says to go and read yours.

### `ShilakshyaReel` — 20 seconds, 1080×1920, 30fps

Instagram Reels shape, for Shilakshya Griha Nirman. Source in `src/shilakshya/`.

| Frames | Scene | |
|---|---|---|
| 0–96 | `Hook` | "घर त बनाउने, तर खर्च कति?" |
| 90–468 | `Screens` | seven screens of shilakshya.com.np, 1.8s each |
| 462–528 | `Turn` | "सबै कुरा, एकै ठाउँमा।" |
| 522–600 | `Close` | the white wordmark, the address, link in bio |

Set in **Mukta**, which is drawn for Devanagari and carries a Latin of the same
weight — so a line like "Confusion छ?" sets in one face instead of two that
never quite line up. Both subsets are in `public/fonts/`.

The screens are in `public/shilakshya/live/`, captured from the site by
`node scripts/shilakshya-shots.mjs`. Two things that capture has to handle: the
site sits behind a SiteGround captcha that a plain request cannot pass (a real
browser rides it out once and the cookie carries), and the cost estimate is
behind a six-step wizard the script drives to the end so the reel shows a real
total rather than an empty form.

The backdrop is `components/Backdrop.tsx` over `components/icons.tsx` — dozer,
crane, cement mixer, bricks, hard hat, shovel, trowel, spirit level and a roof
truss, drifting over a blueprint grid. Add plant by drawing it into
`icons.tsx` and adding a row to `FLOATS`.

Narration: `src/shilakshya/script.ts`, nine lines in Nepali pinned to the cut.
`npm run voiceover -- shilakshya` generates them.

### `HappyPandaReel` — 20 seconds, 1080×1920, 30fps

Instagram Reels shape, for Happy Panda Education Consultancy announcing their
new site. Source in `src/happypanda/`, timings in `HappyPandaReel.tsx`.

| Frames | Scene | |
|---|---|---|
| 0–80 | `Hook` | "Our new website is live", panda with the suitcase |
| 74–156 | `Ask` | the three questions every student arrives with |
| 150–465 | `Screens` | seven screens of the real site, a second and a half each |
| 459–525 | `OnePlace` | "All of it, in one place" |
| 519–600 | `Close` | logo, address, link in bio |

The screen order is in `scenes/Screens.tsx`. CV Maker sits second, straight
after the login, because it is the thing a student can use the same day without
asking anyone for anything. The document vault is deliberately left out: it is
a good screen on a file with documents in it and a screen of zeros on one
without, and the seeded student has none.

The backdrop is `components/Backdrop.tsx` over `components/icons.tsx` — the
paperwork and the places, drawn as silhouettes rather than fetched: an
aeroplane from above, a passport, a boarding pass, a suitcase, a mortarboard, a
globe, Big Ben, the Sydney Opera House and a maple leaf, drifting at low
opacity, plus a dashed flight path with an aircraft actually flying along the
same curve the dashes are drawn from. Add a destination by drawing it into
`icons.tsx` and adding a row to `FLOATS`.

Two things this composition depends on:

**The panda artwork.** `public/happypanda/` holds `panda-ticket.png`,
`panda-namaste.png`, `panda-thinking.png` and `logo.png` — the real artwork,
transparent PNG. The characters are 1024 square and the logo 1920 x 742.

Each one carries its own transparent margin, so the scenes size them by their
full image width, not by the character inside it: `Panda`'s `width` in
`scenes/Hook`, `Ask`, `OnePlace` and `Close` is the PNG's width. Swapping in
artwork cropped tighter will make the character read bigger at the same number.
The logo sits on a white card in `Close` because it is blue on white and would
otherwise disappear into the blue ground.

**The screens.** `public/happypanda/live/` — the live website, captured with
`node scripts/live-shots.mjs video/public/happypanda/live`.

Not `public/happypanda/shots/`. That folder is the **STRIDE app** in this repo,
captured locally by `npm run shots`, and it is a different product: it has
IELTS mocks, a document vault and a student pipeline, none of which exist on
happypandaeducation.com. An earlier cut of this reel showed them, which was
wrong. Anything that goes in the video has to come from `live/`.

**Sound.** The reel renders silent, and both tracks are opt-in.

*Narration.* `src/happypanda/script.ts` holds every line and the frame it
starts on — the same frames as the scene boundaries above, so a line lands as
its picture does. Generate the clips with:

```bash
ELEVENLABS_API_KEY=... npm run voiceover      # from the repo root
```

It writes one MP3 per line to `public/happypanda/vo/`, flips `VOICEOVER_READY`
in `script.ts`, and prints each clip's length against the slot it has to fit,
marking any that overrun. Shorten the line and run it again rather than
speeding the delivery up. `ELEVENLABS_VOICE_ID` picks the voice; the model is
multilingual, so the same script records in Nepali.

The key needs the **Text to Speech** permission. One without it authenticates
and then refuses every synthesis with `missing_permissions` — the one failure
that looks like a bad key and is not.

*Music.* `AUDIO` in `src/happypanda/brand.ts` names a file under `public/` to
mux in; left null there is no music at all, which is what you want if it is
going to be picked inside Instagram. `VOICEOVER.md` has the reasoning and a
caption for the post.

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
