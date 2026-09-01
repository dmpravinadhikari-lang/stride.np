import { Chip } from "@/components/ui";

export function ToolIntro({ title, sub }: { title: string; sub: string }) {
  return (
    <header className="max-w-2xl">
      <Chip tone="teal">Free · no account needed</Chip>
      <h1 className="display mt-3.5 text-[32px] sm:text-[38px]">{title}</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-ink-2">{sub}</p>
    </header>
  );
}
