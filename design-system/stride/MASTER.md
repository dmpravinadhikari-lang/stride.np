# STRIDE design system

The source of truth for how the consultancy console looks. Written 18 September
2026, from the UI/UX Pro Max matches for a multi-branch staff CRM, adapted to
the brand STRIDE already has.

## What the skill returned, and what we took

| Skill result | Decision |
| --- | --- |
| Style: **Flat Design** (top match for SaaS dashboards: 2D, bold colour, no shadow stacks, typography-led) | Taken. Borders and flat fills carry the layout; shadows are reserved for things that genuinely float, such as the phone drawer. |
| Type: **Plus Jakarta Sans** (matched twice for B2B SaaS and admin dashboards) | Taken for the whole interface. Poppins is a geometric consumer face whose round counters blur at 13px, which is most of a CRM. Numbers move to **JetBrains Mono**. |
| Colour: **teal primary + action accent** (`#0D9488` + `#EA580C`) | Adapted. STRIDE's teal stays, because the brand is the teal. The orange is taken as the one attention accent. |
| Colour: generic SaaS blue `#2563EB` from `--design-system` | Rejected. It matched the landing-page pattern, not this product, and it would throw away the brand. |
| Pattern: hero / product demo / CTA sections | Rejected. Those are landing-page patterns. This is a console people work in all day. |
| Density dial 8 (dense dashboard, 8-32px scale) | Taken. |
| Motion dial 3 (subtle, 150-250ms, colour and opacity only) | Taken. No scroll choreography in the console. |

## Colour

The console is built on three grounds, not one: a **dark rail** for navigation,
a **light canvas** for work, and **white cards** on it. That separation is what
makes the product read as an application rather than a website with a menu.

| Token | Value | Use |
| --- | --- | --- |
| `--color-brand-500` | `#07717F` | Primary buttons, active states. White on it is 5.7:1. |
| `--color-brand-600` | `#05545F` | Brand text on white (8.6:1), button hover. |
| `--color-brand-300` | `#50E8F4` | The signature cyan. A fill on dark only, never text. |
| `--color-rail` | `#062A31` | The sidebar ground. |
| `--color-rail-2` | `#0C3A43` | Hover inside the rail. |
| `--color-accent-500` | `#C2410C` | Attention only: late, refused, needs a decision. |
| `--color-ink` | `#0B1F23` | Body text. |
| `--color-muted` | `#63797E` | Secondary text. 4.6:1 on white. |
| `--color-line` | `#E3EAEB` | Hairlines and card borders. |
| `--color-canvas` | `#F4F7F7` | Page ground. |
| `--color-panel` | `#FFFFFF` | Cards, tables, inputs. |

Neutrals carry a slight teal bias rather than being pure grey, so they read as
chosen next to the brand instead of borrowed from a framework.

Semantic colour is separate from the brand and never reused for decoration:
teal-green for good, gold for watch, red for a problem, orange for attention.

## Type

- **Plus Jakarta Sans**: everything. 600 for headings, 500 for controls, 400 for prose.
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
