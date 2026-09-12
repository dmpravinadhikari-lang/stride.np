import React from "react";
import { Frame } from "../components/Frame";
import { Head, Rise, Say } from "../components/Type";
import { AL } from "../brand";

/**
 * One signature dish: the photograph in an arch, its name under it, and the
 * line the restaurant's own menu uses to describe it.
 */
export const Dish: React.FC<{
  src: string;
  name: string;
  say: string;
  shape?: "arch" | "band";
}> = ({ src, name, say, shape = "arch" }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 34,
      textAlign: "center",
    }}
  >
    <Rise up={34}>
      <Frame
        src={src}
        w={shape === "band" ? 912 : 840}
        h={shape === "band" ? 730 : 1010}
        shape={shape}
        over={66}
        drift={0.09}
      />
    </Rise>
    <Rise delay={7}>
      <Head size={72} colour={AL.gold}>
        {name}
      </Head>
      <div style={{ marginTop: 12 }}>
        <Say>{say}</Say>
      </div>
    </Rise>
  </div>
);
