# STRIDE design system

The source of truth for how the consultancy console looks. Written 18 September
2026 from the UI/UX Pro Max matches for a multi-branch staff CRM.

It is sold to consultancy owners who will never be trained on it, so the test
every screen has to pass is simple: can somebody who has never seen it work out
what to do from the screen alone.

## What the skill returned, and what we took

| Skill result | Decision |
| --- | --- |
| Style: **Flat Design** (top match for SaaS dashboards: 2D, bold colour, no shadow stacks, typography-led) | Taken. Borders and flat fills carry the layout; shadows are reserved for things that genuinely float, such as the phone drawer. |
| Type: **Plus Jakarta Sans** (matched twice for B2B SaaS and admin dashboards) | Taken for the whole interface. Poppins is a geometric consumer face whose round counters blur at 13px, which is most of a CRM. Numbers move to **JetBrains Mono**. |
| Colour: **education teal + course amber** (`#0D9488` + `#D97706`) | Adapted into pine green and marigold, on warm paper. The structure of the match is kept: one working hue, one attention hue. |
| Colour: generic SaaS blue `#2563EB` from `--design-system` | Rejected. It matched the landing-page pattern, not this product, and it would throw away the brand. |
| Pattern: hero / product demo / CTA sections | Rejected. Those are landing-page patterns. This is a console people work in all day. |
| Density dial 8 (dense dashboard, 8-32px scale) | Taken. |
| Motion dial 3 (subtle, 150-250ms, colour and opacity only) | Taken. No scroll choreography in the console. |

## Colour: pine and marigold on paper

The console has three grounds, not one: a **deep green rail** for navigation, a
**warm paper canvas** for work, and **white cards** on it. That separation is
what makes the product read as an application rather than a website with a
menu, and the paper is what stops it reading as another grey dashboard.

Marigold is the second colour on purpose. Sayapatri hangs in every doorway in
Nepal at Tihar, so the pairing is familiar here before anybody is told what it
means in the product, where it means exactly one thing: **this wants you**.

| Token | Value | Use |
| --- | --- | --- |
| `--color-brand-500` | `#0E6E52` | Primary buttons and active states. White on it, 6.1:1. |
| `--color-brand-600` | `#0B573F` | Brand text on paper, 8.8:1. Button hover. |
| `--color-brand-300` | `#5FBE93` | Brand on the rail only, 6.7:1 there. Never on paper. |
| `--color-rail` | `#0B2B21` | The rail ground. |
| `--color-accent-500` | `#E09503` | Marigold fill: badges, the count on the nav. |
| `--color-accent-600` | `#8A5702` | Marigold as text, 5.5:1 on its own tint. |
| `--color-ink` | `#16211C` | Body text. |
| `--color-muted` | `#626F68` | Secondary text. 4.9:1 on paper. |
| `--color-line` | `#E7E3DA` | Hairlines and card borders. |
| `--color-canvas` | `#FAF7F1` | Paper, the page ground. |
| `--color-panel` | `#FFFFFF` | Cards, tables, inputs. |

Neutrals are warm rather than grey, so they read as chosen next to the green
instead of borrowed from a framework.

Semantic colour is separate from the brand and never reused for decoration:
green for good, gold for watch, red for a problem, marigold for attention.

**Each pipeline stage owns a colour**, and it is the same colour in the chip,
the filter and the bar across the top of the student list. After a week people
read the colour before the word.

## Type

- **Bricolage Grotesque**: headings. Wide and slightly irregular, which is what keeps a screen of cards from reading as a spreadsheet.
- **Plus Jakarta Sans**: everything else. 500 for controls, 400 for prose.
- **JetBrains Mono**: figures only, with `font-variant-numeric: tabular-nums`, so columns of numbers line up.

Scale, tightened for density: page title 24px, section 16px, body 14px, meta
12.5px, table heading 11px uppercase with 0.08em tracking. Nothing under 12px.

## Shape and space

- Radius: cards and inputs 12px, buttons 10px, chips and pills full. The old
  20px pill-everything look read as a consumer app, not a workplace tool.
- Space: 8 / 12 / 16 / 24 / 32. Card padding 16-20px, table rows 10-12px.
- Borders over shadows. One hairline, one hover tint.

## Rules that do not bend

1. Every control is at least 40px tall, 44px for anything used daily.
2. Focus is always visible: 2px brand ring, 2px offset.
3. Icons are SVG from the house set, never emoji.
4. Every input has a visible label. Placeholders are examples, not labels.
5. Empty states say what to do next and carry the button that does it.
6. Numbers that can be acted on are links, not decoration.
7. Transitions 150-250ms, colour and opacity; nothing animates layout.
8. Search is on every console page, and "/" jumps to it.
9. A count on the nav means work is late or unowned. Nothing else earns a badge.

## The audit these rules came from

Run against every console page at 1440px and 390px: colour contrast of every
text node against its real background, pointer target sizes (counting a label
as the target for the control inside it), missing form labels and accessible
names, duplicate ids, and horizontal overflow.

What it caught, and what changed:

- The secondary grey was **4.21:1** on paper, under the 4.5:1 floor. Darkened to 4.9:1.
- Gold chip text was **3.49:1** on its own tint, red **4.34:1**, marigold **4.38:1**. All three darkened past 4.85:1.
- Phone tab labels were **10.5px**, under the 12px floor. Now 11.5px, and the resting colour is ink rather than grey.
- Two links were **20px and 22px** tall, under the 24px pointer minimum. Padded out.
- The focus ring was the brand green, which sits at **1.6:1** on the rail: invisible exactly where the keyboard lands first. It switches to the light green inside the rail.
- Two different table heading styles were in use. There is now one.

The pass is repeatable: contrast and targets are measured, not eyeballed.
