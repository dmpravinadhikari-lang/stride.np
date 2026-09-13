import React from "react";
import { Audio, Sequence, staticFile } from "remotion";

export type Line = { id: string; at: number; text: string };

/**
 * The narration, one clip per line, each starting on the frame its screen
 * does.
 *
 * One file per line rather than one long track, because the reel's cuts move:
 * re-time a scene in the form and each line still lands on the picture it
 * belongs to. `ready` is flipped by `scripts/voiceover.ts` once every clip
 * exists — without the guard a missing file fails the whole render rather
 * than just going quiet.
 */
export const VoiceLines: React.FC<{
  lines: Line[];
  /** Folder under `public/`, e.g. "alev/vo". */
  dir: string;
  ready: boolean;
  volume?: number;
}> = ({ lines, dir, ready, volume = 1 }) => {
  if (!ready) return null;
  return (
    <>
      {lines.map((line) => (
        <Sequence key={line.id} from={line.at} layout="none">
          <Audio src={staticFile(`${dir}/${line.id}.mp3`)} volume={volume} />
        </Sequence>
      ))}
    </>
  );
};
