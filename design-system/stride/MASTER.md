# Stride design system

This file used to hold a generated palette and type scale. It no longer does,
because the brand now has its own definition and two sources of truth is one
too many.

- **The guidelines**: `docs/brand/BRAND.md`, with the full visual reference in
  `docs/brand/stride-brand-guidelines.html`.
- **The tokens**: `public/brand/brand-tokens.json`.
- **What the product actually renders**: the `@theme` block at the top of
  `src/app/globals.css`, which is where every colour, font and radius in the
  application comes from.

Where the built product departs from the guidelines, the reason is written
beside the token in `globals.css`. There is one such departure today: the link
colour, which the guidelines give as #B85C00 "at 5.1:1" and which measures
4.41:1 on Paper. The product uses #A85300, the same hue two steps darker.
