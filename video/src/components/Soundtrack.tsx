import React from "react";
import { Audio, interpolate, staticFile, useVideoConfig } from "remotion";
import { z } from "zod";

/**
 * The sound on a reel: a music bed, a voiceover, or both.
 *
 * Both are optional and both are props, so a track is added by dropping a file
 * into `public/` and typing its name into the form — no code. An empty
 * filename renders silence, which is the default: a reel posted with no audio
 * is a reel you can add Instagram's own music to in the app, and that is
 * usually the better move (see the README).
 *
 * When a voiceover is present the music ducks under it by a fixed amount.
 * Real ducking follows the speech envelope; this does not, because a constant
 * duck is honest about what it is and never pumps.
 */
export const soundSchema = z.object({
  file: z.string().describe("Path under public/ — empty for silence"),
  volume: z.number().min(0).max(1),
  fadeIn: z.number().min(0).max(6).describe("Seconds"),
  fadeOut: z.number().min(0).max(6).describe("Seconds"),
  /** Where in the track to start, for a bed whose good part is 20s in. */
  startAt: z.number().min(0).describe("Seconds into the file"),
  loop: z.boolean().describe("Repeat a track shorter than the reel"),
});

export type Sound = z.infer<typeof soundSchema>;

export const silence: Sound = {
  file: "",
  volume: 0.35,
  fadeIn: 0.5,
  fadeOut: 1,
  startAt: 0,
  loop: true,
};

const Track: React.FC<{ sound: Sound; scale?: number }> = ({
  sound,
  scale = 1,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (!sound.file) return null;

  const inFrames = Math.max(1, Math.round(sound.fadeIn * fps));
  const outFrames = Math.max(1, Math.round(sound.fadeOut * fps));
  // Kept strictly increasing however short the reel or long the fades.
  const a = Math.min(inFrames, durationInFrames / 2);
  const b = Math.max(
    a + 1,
    durationInFrames - Math.min(outFrames, durationInFrames / 2),
  );

  return (
    <Audio
      src={staticFile(sound.file)}
      loop={sound.loop}
      trimBefore={
        sound.startAt > 0 ? Math.round(sound.startAt * fps) : undefined
      }
      volume={(frame) =>
        interpolate(frame, [0, a, b, durationInFrames], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }) *
        sound.volume *
        scale
      }
    />
  );
};

export const Soundtrack: React.FC<{
  music?: Sound;
  voice?: Sound;
  duck?: number;
}> = ({ music, voice, duck = 0.4 }) => (
  <>
    {music ? <Track sound={music} scale={voice?.file ? duck : 1} /> : null}
    {voice ? <Track sound={voice} /> : null}
  </>
);
