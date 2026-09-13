# Reference images

Everything in this folder is a placeholder. Swapping in the real photography is
a file replacement — no code changes anywhere.

## The hero (required before launch)

SPEC §9 is explicit: the hero is a live before/after slider on a **real
Shailakshya house**, and there is to be no stock photography. The two SVGs here
stand in until those photos exist.

| File | What it should become |
|---|---|
| `hero-before.svg` | A real Shailakshya house, photographed straight on. |
| `hero-after.svg` | The **same** house, restyled — ideally run through the visualizer itself. |

Replace both with `hero-before.webp` and `hero-after.webp`, then update the two
constants at the top of `web/src/main.ts`. Shoot both from the identical camera
position: the slider only works if the two frames register against each other.

## Style card references (optional)

Each style pack card looks for `reference/<pack-id>.webp` and quietly falls back
to its flat material swatch when the file is absent, so you can add these one at
a time as photography comes in.

    modern-minimal.webp      traditional-newari.webp
    contemporary-concrete.webp  warm-wood.webp
    brick-courtyard.webp     luxury-marble.webp
    compact-urban.webp

Around 600×400, WebP, under 60 KB each — these load on 3G phone connections.
