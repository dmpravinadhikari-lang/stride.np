# Brand

The previous brand belonged to a different name, so its guidelines, tokens and
handoff notes have been removed rather than left to read as though they were
written for OfficeYak. They are still in the history, at commit `552ca44`, if
anything needs referring back to.

New guidelines are expected. Until they arrive, this is what the product
actually renders, so nothing has to be guessed at:

- **The name, wordmark, domain and description**: `src/lib/brand.ts`, the only
  place they are written and the one file to change.
- **The palette, type and radii**: the `@theme` block at the top of
  `src/app/globals.css`. Every colour in the application comes from there, and
  the reasoning behind each token is beside it.
- **The mark**: `public/brand/mark.svg`, with a white and a mono version
  beside it, drawn inline by `src/components/Logo.tsx` so it takes the theme
  and costs no request. It is a placeholder carried over from the previous
  identity, kept so the product is not left without a mark, and it is the
  first thing the new guidelines should replace.

One rule in the current palette is worth carrying into whatever replaces it:
the action colour and the link colour are not the same token. A saturated fill
that carries white type at button size needs about 4.5:1, and most brand
oranges, greens and cyans do not reach it. The theme keeps a darker step for
anything with text on it.
