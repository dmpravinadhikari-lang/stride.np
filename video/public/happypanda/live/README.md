# Screens from the live website

Captured from **www.happypandaeducation.com** — the actual site, over the
network, at phone width (390 × 844 at 2×).

Regenerate with `scripts/live-shots.mjs` from the repo root. Two things that
script has to do and a plain screenshot run does not:

- **TLS 1.2.** Chrome's default handshake does not survive this environment's
  egress proxy; `--ssl-version-max=tls1.2 --disable-quic` does.
- **Solid header.** The site's header is sticky and translucent, so anything it
  scrolls over ghosts through it and a still reads as a smudge. The script
  paints it opaque for the capture and changes nothing else.

## Not to be confused with `../shots/`

`../shots/` is the **STRIDE app** running locally — the platform in this repo.
It has IELTS mocks, a document vault, a student pipeline. The live Happy Panda
website has none of those, and an earlier cut of the reel showed them by
mistake.

If a feature is going in the video, it has to be on a screen in **this** folder.

| File | What it shows |
|---|---|
| `home` | Five countries, and the free check |
| `destinations` | Approval rates side by side — UK 96%, USA 19% |
| `australia` | "Nepal was moved to high-risk" and the 25–37% band |
| `cv-maker` | The free CV maker |
| `loan` | The education loan calculator and the monthly payment |
| `process` | The seven steps |
| `fees` | The published price list |
| `tools`, `success` | Captured for the library, not in the current cut |
