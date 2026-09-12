# Voiceover and music for the Happy Panda reel

Two things I cannot make in this session: a licensed music track, and a
synthetic voice. Both of these are ways to get real audio onto the cut.

## Music: use Instagram's own library first

Upload the reel silent — which is how it renders — and pick a track inside
Instagram. Their library is licensed for the platform, it costs nothing, and
reels using it are not muted or region-blocked the way a baked-in commercial
track can be. It is also the one audio choice that helps reach rather than
risking it.

Bake a track in only if it has to be the same everywhere the file goes
(YouTube Shorts, TikTok, a WhatsApp broadcast, the website). Then: drop the
file into `video/public/happypanda/`, set `AUDIO` in
`src/happypanda/brand.ts` to its path, and re-render. The composition already
has the `<Audio>` in it, off until that constant is set.

## Voiceover: generated, or recorded on a phone

Generated is one command from the repo root:

```bash
ELEVENLABS_API_KEY=... npm run voiceover
cd video && npx remotion render HappyPandaReel out/happy-panda-reel.mp4
```

The lines and their frames live in `src/happypanda/script.ts`, so the
narration is pinned to the cut rather than drifting against it. The key needs
the **Text to Speech** permission — without it every call comes back
`missing_permissions`, which reads like a bad key and is not one.

Recorded by a person still beats it for this audience. Any quiet room, phone
held a hand's width away, off the desk so it does not pick up knocks. Send me
the file the same way as the artwork and I will line it up.

Twenty seconds is tight. This script is written to be read briskly but not
rushed — about 45 words. Each line is timed to the cut it sits on.

| In | Line |
|---|---|
| 0:00 | Happy Panda Education's new website is live. |
| 0:02.5 | Which country? What are my odds? What will it cost? |
| 0:05.0 | Five countries, with the real approval rates. |
| 0:06.5 | UK, ninety-six percent. Australia, twenty-five. |
| 0:08.0 | Even the bad news, told straight. |
| 0:09.5 | A free CV maker. |
| 0:11.0 | Know the loan before you sign it. |
| 0:12.5 | Seven steps. Always know which one you're on. |
| 0:14.0 | And every fee, published. |
| 0:15.3 | Published, not promised. |
| 0:17.3 | happypandaeducation.com. Link in bio. |

Reading it in Nepali works as well or better for this audience — the timings
hold, the word count will not, so shorten rather than speed up.

## A caption for the post

> Our new website is live. Five countries, with the approval rate for each one
> published and dated — UK 96%, USA 19%. A free CV maker, a loan calculator,
> the seven steps, and every fee we charge, in writing.
>
> Link in bio 🐼
