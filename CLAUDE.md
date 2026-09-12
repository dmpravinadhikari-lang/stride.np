# stride.np

Two projects in one repository: the Next.js app at the root, and the Remotion
video project in `video/`.

## Videos: build them so they can be edited without code

Every video in `video/` is edited by the people who commissioned it, not only
by whoever wrote it. That means a new composition is not finished until its
words, pictures and timings are props.

When adding a video:

1. Put a Zod schema in the reel's own folder (`src/<name>/schema.ts`) covering
   every string, every image path, every duration in seconds, and the accent
   colours. Use `zColor()` from `@remotion/zod-types` for colours and
   `zTextarea()` for anything multi-line.
2. Declare the `<Composition>` **in `src/Root.tsx`**, with `defaultProps`
   written out as a plain object literal. Remotion Studio only writes the form
   back into the source when the literal is in the root file — import the
   defaults from anywhere else and the Save button greys out.
3. Give it `calculateMetadata` that derives `durationInFrames` from the timing
   props, so re-timing a scene in the form re-times the video.
4. Never read a headline or a file path from a module constant inside a scene.
   Constants are for things nobody edits: the safe area, the palette a brand
   actually owns, the font stacks.

Scenes cross-fade: each starts `OVERLAP` frames before the last one ends, and
the `layout()` helper in each schema turns seconds into those frame ranges.

## Working on a video

Run Remotion Studio (`cd video && npm run dev`) whenever you start on one, and
show progress as a published Artifact alongside — a page with the cut, a scene
index that seeks the video, and the caption, so the work can be reviewed
without reading a diff. Do this without being asked.

Facts in a client's video come from the client's own site, and nothing else.
No invented dishes, prices, hours or claims; prices are left out by default
because they move. If a claim cannot be sourced, say so rather than shipping it.

## The app

Multi-tenant by subdomain: each consultancy gets a branch subdomain with its
own name throughout. Presentational brand pieces live in
`src/components/BrandMark.tsx`.
