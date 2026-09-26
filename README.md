# Handoff: Stride brand guidelines

## Overview
Complete brand system for Stride (AI-powered OS for education consultancies): logo built on the golden ratio, colour, type, voice, website/social/stationery rules and digital assets.

## About the design files
`stride-brand-guidelines.html` is a **design reference** (self-contained HTML). Do not ship it as product UI. Use it to **update the codebase**: replace the current cyan-dot wordmark in `src/components/Logo.tsx` / `src/lib/brand-mark.tsx` with the mark SVGs here, set `src/lib/brand.ts` tagline/description from `brand/BRAND.md`, and move theme tokens in `src/app/globals.css` / `design-system/stride/MASTER.md` toward `brand/brand-tokens.json`.

## Fidelity
High-fidelity. Colours, geometry and type are final.

## Where to put it in the repo
```
design-system/stride/
  BRAND.md              ← brand/BRAND.md
  brand-tokens.json     ← brand/brand-tokens.json
  guidelines.html       ← stride-brand-guidelines.html
public/brand/
  stride-mark.svg
  stride-mark-white.svg
  stride-mark-navy.svg
```
Import tokens in code: `import tokens from "@/design-system/stride/brand-tokens.json"`.

## Implementation notes
- `src/lib/brand.ts`: `tagline: "Run your consultancy on intelligence, not instinct."`; add `oneLiner` and `description` from tokens.
- Logo component: inline `stride-mark.svg` + wordmark "Stride" in Outfit 600, letter-spacing −0.035em; gap = markHeight/φ².
- Favicon (`src/app/icon.tsx`, `apple-icon.tsx`): full-colour mark on transparent (icon) and on #15133A tile, 28% radius, mark at 62% (apple/app icon).
- Primary button: #FF7A1A, white text, radius 10px, Outfit 600. Links on light: #B85C00.
- Fonts: load Outfit + JetBrains Mono from Google Fonts (guideline moves off Roboto for brand surfaces; the in-app data UI may keep Roboto Mono for numerals if preferred — the guideline's rule is only "numbers in mono").

## Assets
- brand/stride-mark*.svg — vector logo marks (golden-ratio geometry)
- assets/product/*.png — screenshots already in the repo (public/product/)

## Files
- stride-brand-guidelines.html — full visual guideline (open in browser)
- brand/BRAND.md — text quick reference
- brand/brand-tokens.json — machine-readable tokens
