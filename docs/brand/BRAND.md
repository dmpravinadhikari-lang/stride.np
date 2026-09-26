# OfficeYak — brand quick reference for the codebase

**Name:** OfficeYak (one word, capital O + Y). Domain officeyak.com. Internally "the Yak". Never "OY".
**One-liner:** The AI-powered operating system for education consultancies.
**Tagline:** Carries the whole office. Climbs with you.

## Logo
- Mark: the **bell** (`public/brand/bell.svg`; `bell-on-dark.svg` on Navy; `bell-white.svg` / `bell-navy.svg` / `bell-black.svg` mono).
- Wordmark: "Office" 600 + **horn-Y** glyph + "ak" 700, Outfit, tracking −3.5%. Use `src/components/Logo.tsx` — do not typeset "OfficeYak" as plain text where the lockup is expected.
- Horn-Y is full colour on Paper/Navy only. On orange/pink → white mono; on yellow → navy mono. Bell follows the same rule.
- Gap = 0.3 × bell height. Clear space = bell ÷ 2. Min lockup 120px, bell 16px, horn-Y 12px.
- Never: stretch, tilt, recolour, drop shadow, logo on photo without glass plate, logo on gradient, cartoon yak.

## Colour (tokens in brand-tokens.json)
Night Navy #15133A (text/structure) · Yak Orange #FF7A1A (the one action colour) · Summit Yellow #FFC526 (highlight, Ink text on it) · Rhododendron Pink #F0407A (accent only) · Paper #FAFAFC · Mist #EEEEF2.
Proportion per surface ≈ 60 Paper / 22 Navy / 10 Orange / 5 Yellow / 3 Pink. Order of the run is always pink → orange → yellow.
Text pairs: Ink on Paper ✓ · White on Navy ✓ · Ink on Yellow ✓ · White on Orange ≥24px only · never Ink on Orange, never White on Yellow. Links on light: #B85C00.

> Two corrections made in the build, and the only places the code departs from
> this document.
>
> **1. The active nav pill.** The dashboard section asks for an orange pill,
> and the colour section forbids Ink on Orange and allows White on Orange only
> at 24px and up. A nav label is 13.5px, so neither ink is permitted. Measured:
> white on Yak Orange is 2.61:1, Ink on Yak Orange is 6.79:1, and darkening the
> orange until white passes takes it to roughly #BC5700, which drops to 3.8:1
> against the Navy rail and starts vanishing into it. The product uses **Ink on
> the Yak Orange pill**: exact brand colour, unmistakable, readable.
>
> **2. The link colour.** #B85C00 measures 4.41:1 on Paper and 3.97:1 on Mist, just
> under the 4.5:1 that 15px text needs. The product uses **#A85300**, the same
> hue two steps darker: 5.16:1 on Paper, 4.65:1 on Mist, and white on it at
> 5.38:1 where a button needs a fill. Everything else here is followed as
> written.

## Type
Outfit for everything (400/500/600/700), JetBrains Mono for every number (IDs, scores, money, dates). Sentence case everywhere. No exclamation marks.

## Website
- 1200px max, 12 col, 24 gutter, 8px scale. Sections 96/56px. Cards r16, buttons r10, inputs r8.
- Rhythm: Paper hero (ridge along bottom) → alternating Paper/Mist → one Navy proof band → Navy footer (ridge flipped at top, 18%).
- One orange primary button above the fold. Header: lockup 28px left, nav Graphite 15/500, "Log in" text + orange "Book a demo".
- Imagery: real screenshots in r16 frame with 1px Mist border; warm candid office photos behind a glass plate if the logo sits on them; the ridge as texture. No globes/planes/Everest/prayer flags.

## Dashboard (product UI)
- Navy rail 190–240px, lockup 22px "dark" tone, ridge-mono white 6% at rail foot, active item = orange pill.
- Content on Paper; cards white, 1px Mist, r12. KPI number in mono 22px with a 3px rule in brand run order.
- Stage pills: 10% tint + tint ink (New = pink, Counselling = orange, Offer = green, Visa filed = navy).
- AI recommendation: yellow-tint callout, prefix **"Yak says:"**, rotated orange square, one per screen, always with the reason/number.

## Icons
- Favicon: horn-y.svg at 16/32, bell.svg 48+. App icon: Navy tile, bell-on-dark at 64%, ridge-mono 8%. Notification: bell-notification.svg (currentColor silhouette, no band).
- Watermark: bell-navy 6% on Paper / bell-white 8% on Navy, cropped to a corner.

## Voice
Plain, specific, human. Students/counsellors/branches, not users. Facts not slogans. AI copy states what it decided, never "AI-powered" on a button.

Full visual reference: `design-system/officeyak/guidelines.html`.
