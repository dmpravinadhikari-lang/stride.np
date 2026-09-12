# Screens for the Happy Panda reel

Captured from the real app, not mocked up. Phone width (390 × 844 at 2×, so
780 × 1688 px), which is what lets them sit in a vertical 1080 × 1920 frame
without being squeezed.

Regenerate them with the app running:

```bash
npm run build && npm run start      # one terminal
npm run shots                       # another
```

`scripts/screenshots.ts` holds the list and the scroll position of each shot.
Set `SHOTS_CHROME` if Chrome is not at the default macOS path.

## What is in each

| File | Screen |
|---|---|
| `login` | The sign-in page. **The one screen that carries Happy Panda's own name.** |
| `home-1` … `home-3` | The public landing page |
| `tools-1`, `tools-2` | The free tools, no account needed |
| `cost-1` | Cost calculator, in rupees |
| `uni-1` | University finder |
| `blog-1` | The guides |
| `app-*` | Sujata's file, signed in — dashboard, checklist, documents, cost, SOP, mock tests, universities |

## One thing worth knowing

These were retaken after the white-labelling went in. Every screen now carries
the consultancy's name — the mark in the header, the footer, the tab title —
and `/` on a branch address is the consultancy's own front page rather than
STRIDE's pitch to consultancy owners.

The earlier set showed "Stride" everywhere except `/login`. If a screenshot in
here ever reads "Stride" again on a branch address, something has regressed:
check `src/components/Logo.tsx` and the middleware header it depends on.
