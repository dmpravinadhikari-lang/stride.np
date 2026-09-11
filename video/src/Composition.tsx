import { Composition } from "remotion";
import { DURATION, FPS, StrideIntro } from "./StrideIntro";
import { HappyPandaReel, REEL_DURATION, REEL_FPS } from "./happypanda/HappyPandaReel";

export const MyComposition = () => {
  return (
    <>
      <Composition
        id="StrideIntro"
        component={StrideIntro}
        durationInFrames={DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {/* Instagram Reels: 9:16, which is also what TikTok and WhatsApp status
          want, so one render covers all three. */}
      <Composition
        id="HappyPandaReel"
        component={HappyPandaReel}
        durationInFrames={REEL_DURATION}
        fps={REEL_FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
