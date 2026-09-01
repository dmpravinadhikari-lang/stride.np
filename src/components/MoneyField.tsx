"use client";

import { useState } from "react";
import { npr } from "@/lib/terms";
import { inputClass } from "@/components/ui";

/**
 * Money input that echoes the figure back the way a Nepali family would say it.
 * Typing 4200000 shows "NPR 42 lakh" underneath, which is how people catch a
 * missing or extra zero before it reaches a visa form.
 */
export function MoneyField({
  label, name, defaultValue, hint, placeholder,
}: {
  label: string; name: string; defaultValue: string; hint?: string; placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const digits = Number(value.replace(/[^0-9]/g, ""));
  const spoken = digits > 0 ? npr(digits) : null;

  return (
    <label className="flex flex-col gap-1.5" htmlFor={name}>
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      <input
        id={name} name={name} inputMode="numeric" className={inputClass}
        value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder}
      />
      <span className="text-[12px] leading-snug text-muted">
        {spoken ? <span className="font-semibold text-brand-600">{spoken}</span> : hint}
      </span>
    </label>
  );
}
