# Handoff: OfficeYak brand → stride.np codebase

## What this is
Design reference + drop-in files for rebranding the product from Stride to **OfficeYak**. `guidelines.html` is a visual reference (open in a browser); the other files are meant to be committed as-is and wired in.

## Where files go
```
public/brand/*.svg                        ← all marks (bell, horn-y, ridge, mono variants)
src/components/Logo.tsx                   ← replaces the cyan-dot Logo component
src/lib/brand.ts                          ← replaces current BRAND constant
design-system/officeyak/BRAND.md          ← rules for engineers
design-system/officeyak/brand-tokens.json ← tokens (import in Tailwind theme / CSS vars)
design-system/officeyak/guidelines.html   ← full visual guideline
```

## Code changes (in order)
1. **brand.ts** — swap constant; page titles become "…, OfficeYak"; remove the STRIDE uppercase usage.
2. **Logo.tsx** — new component; usage `<Logo size={28} />` header, `<Logo size={26} tone="dark" />` footer/rail, `<Logo size={22} tone="dark" />` sidebar, `<Logo tone="mono" />` inside currentColor contexts. Delete `src/lib/brand-mark.tsx`.
3. **globals.css / Tailwind** — map tokens: `--color-ink:#15133A --color-brand-500:#FF7A1A --color-accent:#FFC526 --color-signal:#F0407A --color-panel:#FAFAFC --color-wash:#EEEEF2 --color-line:#E4E4EA`. Tints per brand-tokens.json. Fonts: Outfit + JetBrains Mono (see `font.googleFonts`); Roboto goes.
4. **icon.tsx / apple-icon.tsx / manifest.ts** — favicon = horn-y.svg (16/32), apple/app icon = Navy tile + bell-on-dark at 64% + ridge-mono 8%.
5. **Homepage (page.tsx)** — hero gets `ridge.svg` as a full-width band along its bottom (height ~38% of hero, opacity .9, behind content); footer gets `ridge.svg` flipped (scaleY(-1)) at top, 18% opacity. Eyebrow tag "AI-powered consultancy OS". Headline "Every branch, carried like your best branch."
6. **FeatureBento / ServiceShowcase** — module accents by group: Grow = pink, Prepare = orange, Run = yellow (see tokens.moduleAccent). Metric numbers in mono with 3px brand-run rule.
7. **App shell (app/layout.tsx, nav)** — Navy rail, active item orange pill, lockup 22px dark, ridge-mono white 6% at rail foot. AI hints rendered as "Yak says:" yellow callout.
8. **Email templates** — header lockup on Paper, footer Navy with lockup dark tone; no ridge in email.

## Fidelity
High-fidelity: colours, geometry, type and copy are final.

## Assets in this package
See `public/brand/`. All SVG, viewBox-based, scale freely. `*-mono.svg` / `bell-notification.svg` use `currentColor`.
