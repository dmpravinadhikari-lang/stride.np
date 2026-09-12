import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { VOICEOVER_READY, VO_LINES } from "../script";

/**
 * The narration, one clip per line, each starting on the frame its picture
 * does. Renders nothing at all until the clips have been generated, so the
 * composition is always safe to render — a missing file would otherwise fail
 * the whole render rather than just going quiet.
 */
export const Voiceover: React.FC = () => {
  if (!VOICEOVER_READY) return null;

  return (
    <>
      {VO_LINES.map((line) => (
        <Sequence key={line.id} from={line.at} layout="none">
          <Audio src={staticFile(`happypanda/vo/${line.id}.mp3`)} />
        </Sequence>
      ))}
    </>
  );
};
