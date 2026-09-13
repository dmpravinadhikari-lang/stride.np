/**
 * Generates the reel's narration with ElevenLabs.
 *
 *   ELEVENLABS_API_KEY=... npm run voiceover -- happypanda | shilakshya | tips | alev
 *
 * One clip per line of video/src/happypanda/script.ts, written to
 * video/public/happypanda/vo/, and then READY flipped in that same file so the
 * composition starts using them. Re-run it after editing a line; it overwrites.
 *
 * The key needs the **Text to Speech** permission. A key without it
 * authenticates and then refuses every synthesis with `missing_permissions`,
 * which is the one failure that looks like a bad key and is not.
 *
 * Pick a voice with ELEVENLABS_VOICE_ID and a model with ELEVENLABS_MODEL.
 * The key is read from the environment and never written anywhere.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { VO_LINES as HAPPY_PANDA } from "../video/src/happypanda/script.ts";
import { VO_LINES as SHILAKSHYA } from "../video/src/shilakshya/script.ts";
import { VO_LINES as TIPS } from "../video/src/tips/script.ts";
import { VO_LINES as ALEV } from "../video/src/alev/script.ts";

/** Which reel to narrate. Each has its own lines, frames and output folder. */
const REELS = {
  happypanda: { lines: HAPPY_PANDA, dir: "video/public/happypanda/vo", script: "video/src/happypanda/script.ts", comp: "HappyPandaReel out/happy-panda-reel.mp4" },
  shilakshya: { lines: SHILAKSHYA, dir: "video/public/shilakshya/vo", script: "video/src/shilakshya/script.ts", comp: "ShilakshyaReel out/shilakshya-reel.mp4" },
  tips: { lines: TIPS, dir: "video/public/tips/vo", script: "video/src/tips/script.ts", comp: "HouseTipsReel out/house-tips-reel.mp4" },
  alev: { lines: ALEV, dir: "video/public/alev/vo", script: "video/src/alev/script.ts", comp: "AlevReel out/alev-reel.mp4" },
} as const;

const which = (process.argv[2] ?? "") as keyof typeof REELS;
if (!REELS[which]) {
  console.error(`Name a reel: ${Object.keys(REELS).join(" | ")}`);
  process.exit(1);
}
const REEL = REELS[which];
const VO_LINES = REEL.lines;

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error("Set ELEVENLABS_API_KEY. Nothing was written.");
  process.exit(1);
}

/**
 * The voice each reel is read in. Override with ELEVENLABS_VOICE_ID to try
 * another — any id from `GET /v2/voices` on the account.
 *
 * These are the least-wrong of the public voices rather than the right ones:
 * none of them is a Nepali speaker, so Devanagari comes out fluent but
 * foreign-accented. A cloned Nepali voice is the real fix, and the account
 * already has the slots for it.
 */
const DEFAULT_VOICE = {
  shilakshya: "Ni0cMFVFTW49wbfYsIMa", // Irshad, warm narrator
  tips: "Ni0cMFVFTW49wbfYsIMa", // the same voice, so the two Nepali reels match
  happypanda: "Xb7hH8MSUJpSbSDYk0k2", // Alice, clear educator
  alev: "JBFqnCBsd6RMkjVDRZzb", // George, warm storyteller
} as const;
const VOICE = process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE[which];

/**
 * v3 is the one that lists Nepali as a supported language — 74 of them
 * against multilingual_v2's 29, which stops at Hindi. Devanagari synthesised
 * under v2 is read as Hindi; under v3 it is read as Nepali.
 */
const MODEL = process.env.ELEVENLABS_MODEL ?? "eleven_v3";
/** Constant bitrate, which is what makes the duration check below honest. */
const FORMAT = "mp3_44100_128";
const BITRATE = 128_000;

const OUT = REEL.dir;
const SCRIPT_FILE = REEL.script;
const FPS = 30;

mkdirSync(OUT, { recursive: true });

let overran = 0;

for (const [i, line] of VO_LINES.entries()) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=${FORMAT}`,
    {
      method: "POST",
      headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: line.text,
        model_id: MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, use_speaker_boost: true },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error(`\n${line.id}: HTTP ${res.status}\n${body.slice(0, 300)}`);
    process.exit(1);
  }

  const audio = Buffer.from(await res.arrayBuffer());
  writeFileSync(`${OUT}/${line.id}.mp3`, audio);

  // The slot is however long it is until the next line starts. Constant
  // bitrate means bytes are a reliable stand-in for seconds here.
  const seconds = (audio.length * 8) / BITRATE;
  const next = VO_LINES[i + 1];
  const slot = next ? (next.at - line.at) / FPS : Infinity;
  const fits = seconds <= slot + 0.15;
  if (!fits) overran += 1;
  console.log(
    `${fits ? " " : "!"} ${line.id.padEnd(12)} ${seconds.toFixed(2)}s` +
      (next ? ` of ${slot.toFixed(2)}s` : " (runs to the end)"),
  );
}

// Flip the flag so the composition starts using the clips.
const script = readFileSync(SCRIPT_FILE, "utf8");
writeFileSync(
  SCRIPT_FILE,
  script.replace("export const VOICEOVER_READY = false;", "export const VOICEOVER_READY = true;"),
);

console.log(`\n${VO_LINES.length} clips in ${OUT}, and READY set in ${SCRIPT_FILE}.`);
if (overran) {
  console.log(
    `${overran} line${overran > 1 ? "s" : ""} marked ! run past the cut ` +
      `they sit on. Shorten the text in ${SCRIPT_FILE} and run this again — ` +
      `speeding the delivery up to fit is worse than cutting a word.`,
  );
}
console.log(`Then: cd video && npx remotion render ${REEL.comp}`);
