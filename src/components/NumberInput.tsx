"use client";

import { useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/ui";

/**
 * A numeric field that remembers what you actually typed.
 *
 * The obvious approach, parse on every keystroke and feed the number back in
 * as the value, silently eats the decimal point, because "6." parses to 6 and
 * redisplays as "6". You can never reach 6.5. So the text lives here and only
 * the parsed number is handed upward.
 */
export function NumberInput({
  number, onNumber, decimal = false, id, name, placeholder, disabled, className,
}: {
  number: number;
  onNumber: (n: number) => void;
  /** Allow a decimal point. IELTS bands and interest rates need it. */
  decimal?: boolean;
  id?: string; name?: string; placeholder?: string; disabled?: boolean; className?: string;
}) {
  const [text, setText] = useState(number ? String(number) : "");
  const lastEmitted = useRef(number);

  // Adopt a change the parent made itself, switching country resets tuition,
  // for instance, without clobbering a half-typed number.
  useEffect(() => {
    if (number !== lastEmitted.current) {
      setText(number ? String(number) : "");
      lastEmitted.current = number;
    }
  }, [number]);

  function handle(raw: string) {
    const cleaned = decimal
      ? raw.replace(/[^0-9.]/g, "").replace(/(\.[^.]*)\./g, "$1")   // at most one point
      : raw.replace(/[^0-9]/g, "");
    setText(cleaned);
    const parsed = Number(cleaned);
    const value = Number.isFinite(parsed) ? parsed : 0;
    lastEmitted.current = value;
    onNumber(value);
  }

  return (
    <input
      id={id} name={name} disabled={disabled} placeholder={placeholder}
      inputMode={decimal ? "decimal" : "numeric"}
      className={className ?? inputClass}
      value={text}
      onChange={(e) => handle(e.target.value)}
    />
  );
}
