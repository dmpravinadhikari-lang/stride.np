/**
 * Generates the reel's narration with ElevenLabs.
 *
 *   ELEVENLABS_API_KEY=... npm run voiceover -- happypanda
 *   ELEVENLABS_API_KEY=... npm run voiceover -- shilakshya
 *
 * One clip per line of video/src/happypanda/script.ts, written to
 * video/public/happypanda/vo/, and then READY flipped in that same file so the
 * composition starts using them. Re-run it after editing a line; it overwrites.
 *
 * The key needs the **Text to Speech** permission. A key without it
 * authenticates and then refuses every synthesis with `missing_permissions`,
 * which is the one failure that looks like a bad key and is not.
 *
 * Pick a voice with ELEVENLABS_VOICE_ID — any id from your ElevenLabs library.
 * The default is one of their public voices so this runs with no setup.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { VO_LINES as HAPPY_PANDA } from "../video/src/happypanda/script.ts";
import { VO_LINES as SHILAKSHYA } from "../video/src/shilakshya/script.ts";

/** Which reel to narrate. Each has its own lines, frames and output folder. */
const REELS = {
  happypanda: { lines: HAPPY_PANDA, dir: "video/public/happypanda/vo", script: "video/src/happypanda/script.ts" },
  shilakshya: { lines: SHILAKSHYA, dir: "video/public/shilakshya/vo", script: "video/src/shilakshya/script.ts" },
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
 * Rachel, one of ElevenLabs' public voices. Override for your own — and do,
 * for the Nepali reel: the multilingual model will read Devanagari in any
 * voice, but a Nepali or Indian-accented one lands very differently.
 */
const VOICE = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
/** Multilingual, so the same script can be recorded in Nepali. */
const MODEL = process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2";
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
        voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.25 },
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
const comp = which === "shilakshya" ? "ShilakshyaReel out/shilakshya-reel.mp4" : "HappyPandaReel out/happy-panda-reel.mp4";
console.log(`Then: cd video && npx remotion render ${comp}`);
