import { Composition } from "remotion";
import { DURATION, FPS, StrideIntro } from "./StrideIntro";
import { HappyPandaReel, REEL_DURATION, REEL_FPS } from "./happypanda/HappyPandaReel";
import {
  ShilakshyaReel,
  REEL_DURATION as SH_DURATION,
  REEL_FPS as SH_FPS,
} from "./shilakshya/ShilakshyaReel";
import { TipsReel, REEL_DURATION as TIPS_DURATION, REEL_FPS as TIPS_FPS } from "./tips/TipsReel";
import { AlevReel, REEL_DURATION as AL_DURATION, REEL_FPS as AL_FPS } from "./alev/AlevReel";

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
      <Composition
        id="ShilakshyaReel"
        component={ShilakshyaReel}
        durationInFrames={SH_DURATION}
        fps={SH_FPS}
        width={1080}
        height={1920}
      />
      {/* Five tips for building a house in Nepal, each on the technical
          sheet drawn for it. */}
      <Composition
        id="HouseTipsReel"
        component={TipsReel}
        durationInFrames={TIPS_DURATION}
        fps={TIPS_FPS}
        width={1080}
        height={1920}
      />
      {/* Alev Kebab Sultanate, Naxal — their own photographs, their own
          typeface, and the dishes their menu actually lists. */}
      <Composition
        id="AlevReel"
        component={AlevReel}
        durationInFrames={AL_DURATION}
        fps={AL_FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
