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

On this build the branch subdomain serves the STRIDE-branded public site: the
header reads "Stride" and the top call to action is "For consultancies", which
is STRIDE selling to consultancies rather than Happy Panda speaking to
students. Only `/login` puts Happy Panda's name on the page.

So the reel leans on `login` and the `app-*` screens, and lets the panda
characters and the logo carry Happy Panda's identity. If the white-labelling
is meant to reach the public pages too, that is a change in the app, not in
the video.
