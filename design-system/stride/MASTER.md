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
| Type: **Roboto** (the skill's Material Design 3 match, "data-heavy B2B dashboards") | Taken for the whole interface, headings included. Numbers in **Roboto Mono**. |
| Colour: **education teal + course amber** (`#0D9488` + `#D97706`) | Replaced. Pravin asked for a Google-like, playful palette, so the product uses Google's own four hues. The skill's structure survives: one working hue, the rest semantic. |
| Colour: generic SaaS blue `#2563EB` from `--design-system` | Rejected. It matched the landing-page pattern, not this product, and it would throw away the brand. |
| Pattern: hero / product demo / CTA sections | Rejected. Those are landing-page patterns. This is a console people work in all day. |
| Density dial 8 (dense dashboard, 8-32px scale) | Taken. |
| Motion dial 3 (subtle, 150-250ms, colour and opacity only) | Taken. No scroll choreography in the console. |

## Colour: the four Google hues

Blue works, and green, yellow and red carry meaning. Nobody in Nepal needs
these explained: they are the colours of the apps already open in the next tab.

The chrome is a **tinted surface**, not a dark slab. The rail is a light panel
with a tonal pill behind whatever you are looking at, the shape people know
from Gmail and Drive, so "where am I" never has to be worked out.

| Token | Value | Use |
| --- | --- | --- |
| `--color-brand-500` | `#1A73E8` | Primary buttons, links, active states. White on it, 4.5:1. |
| `--color-brand-600` | `#1967D2` | Link and button text, 5.1:1 on the canvas. |
| `--color-rail` | `#F0F4F9` | The rail surface. |
| `--color-rail-3` | `#C2E7FF` | The active pill, with `#041E49` on it at 12.6:1. |
| `--color-accent-500` | `#FBBC04` | Yellow, fill only: nav counts, cards that want you. Ink on it, 9.4:1. |
| `--color-accent-600` | `#9A5400` | Yellow as text, darkened to 5.4:1 on its own tint. |
| `--color-teal-500` / `-700` | `#34A853` / `#146C2E` | Green: done, on track. |
| `--color-danger-600` | `#C5221F` | Red: late, refused, a problem. |
| `--color-ink` | `#202124` | Body text. |
| `--color-muted` | `#5F6368` | Secondary text, 5.8:1. |
| `--color-canvas` | `#F8FAFD` | The page ground. |

**Google's own text shades were not accessible enough at small sizes** and were
darkened rather than shipped: green `#1E8E3E` read 3.70:1 on its tint, red
`#D93025` 4.05:1, amber `#B06000` 4.34:1. The bright originals stay as fills,
where they are recognisable and safe.

Colour is playful here but never decorative. Yellow means one thing: **this
wants you**. It marks the count on the nav and tints the cards on Home that
need a person today; a card that is fine stays white.

Avatars take one of four fixed hues from a hash of the name, so a person is
the same colour everywhere, the way Google's are.

**Each pipeline stage owns a colour**, and it is the same colour in the chip,
the filter and the bar across the top of the student list. After a week people
read the colour before the word.

## Type

- **Roboto**: everything. 500 for headings and controls, 400 for prose. It is the face Material is drawn in and the one every Android phone in Nepal already renders, so the interface matches the phone it is held on.
- **Roboto Mono**: figures only, with `font-variant-numeric: tabular-nums`.

The personality here comes from colour and shape, not from a second typeface
fighting the first.

Scale, tightened for density: page title 24px, section 16px, body 14px, meta
12.5px, table heading 11px uppercase with 0.08em tracking. Nothing under 12px.

## Shape and space

- Radius: cards 16px, inputs 12px, and **every button, chip and nav item is a
  pill**. Material's shapes, and they read as pressable at a glance.
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
