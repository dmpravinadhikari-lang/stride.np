import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { VOICEOVER_READY, VO_LINES } from "../script";

/**
 * The narration, one clip per line, each starting on the frame its screen
 * does. Renders nothing until the clips exist — a missing file would fail the
 * whole render rather than just going quiet.
 */
export const Voiceover: React.FC = () => {
  if (!VOICEOVER_READY) return null;
  return (
    <>
      {VO_LINES.map((line) => (
        <Sequence key={line.id} from={line.at} layout="none">
          <Audio src={staticFile(`shilakshya/vo/${line.id}.mp3`)} />
        </Sequence>
      ))}
    </>
  );
};
