"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Chip } from "@/components/ui";

/**
 * Plays the listening script using the browser's own speech synthesis.
 *
 * This is deliberate for phase 2: no audio files to record or host, no speech
 * provider to pay for, and it works offline. The voice is robotic — real
 * recorded audio replaces this in phase 3 without touching anything else,
 * because the script already lives on the section.
 *
 * Like the real test, it plays once.
 */
export function ListeningPlayer({ script }: { script: string }) {
  const [state, setState] = useState<"idle" | "playing" | "finished" | "unsupported">("idle");
  const [showScript, setShowScript] = useState(false);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) setState("unsupported");
    return () => { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); };
  }, []);

  function play() {
    if (state !== "idle") return;
    const u = new SpeechSynthesisUtterance(script);
    u.rate = 0.95;
    u.lang = "en-GB";
    u.onend = () => setState("finished");
    u.onerror = () => setState("finished");
    utterance.current = u;
    setState("playing");
    window.speechSynthesis.speak(u);
  }

  return (
    <div className="rounded-2xl border border-line bg-panel px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="h-tight text-[15px]">Recording</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {state === "unsupported"
              ? "Your browser cannot play this. Read the transcript below instead."
              : state === "finished"
                ? "Finished. Like the real test, it does not play again."
                : "Plays once only, exactly as in the real test. Have your answers ready as you listen."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {state === "playing" && <Chip tone="brand">Playing</Chip>}
          {state === "finished" && <Chip tone="grey">Played</Chip>}
          {state === "idle" && (
            <Button type="button" onClick={play} size="sm">▶ Play the recording</Button>
          )}
        </div>
      </div>

      {(state === "finished" || state === "unsupported") && (
        <div className="mt-3 border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setShowScript((s) => !s)}
            className="text-[12.5px] font-semibold text-brand-600 hover:underline"
          >
            {showScript ? "Hide transcript" : "Show transcript"}
          </button>
          {showScript && (
            <p className="scroll-soft mt-2.5 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl bg-wash px-4 py-3 text-[13px] leading-relaxed text-ink-2">
              {script}
            </p>
          )}
          {!showScript && (
            <p className="mt-1.5 text-[12px] text-muted">
              Check it after you submit — reading it now defeats the point.
            </p>
          )}
        </div>
      )}

      <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
        Computer-generated voice. Real recorded audio with Nepali-relevant accents arrives in phase 3;
        the questions and marking do not change.
      </p>
    </div>
  );
}
