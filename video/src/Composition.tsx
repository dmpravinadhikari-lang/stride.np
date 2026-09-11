import { Composition } from "remotion";
import { DURATION, FPS, StrideIntro } from "./StrideIntro";

export const MyComposition = () => {
  return (
    <Composition
      id="StrideIntro"
      component={StrideIntro}
      durationInFrames={DURATION}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
