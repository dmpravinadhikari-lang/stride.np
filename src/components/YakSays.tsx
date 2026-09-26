import Link from "next/link";
import { Icon } from "@/components/Icon";
import { BRAND } from "@/lib/brand";

/**
 * The one place the product speaks as the machine rather than as a colleague.
 *
 * The brand book is precise about this and the precision is the point: a
 * yellow-tint callout, the prefix "Yak says:", a rotated orange square, one
 * per screen, and always with the reason or the number that produced it.
 *
 * That last rule is the one worth defending. An assistant that says "call
 * Sujata" is a horoscope. An assistant that says "call Sujata, she walked in
 * yesterday and nobody owns her" can be checked, argued with, and ignored on
 * the days it is wrong, which is what makes it worth reading on the days it
 * is right. So this component cannot be rendered without a reason: the type
 * requires one.
 *
 * One per screen, enforced by there being one call site per page rather than
 * by anything clever here. Two would make neither worth looking at.
 */
export function YakSays({
  says, because, action,
}: {
  /** What it decided, in one short sentence. No hedging, no exclamation. */
  says: string;
  /** Why, with the number that produced it. Not optional, on purpose. */
  because: string;
  action?: { label: string; href: string };
}) {
  return (
    <aside className="flex flex-wrap items-start gap-3 rounded-2xl border border-accent-300/60 bg-accent-50 px-4 py-3.5">
      {/* The rotated square, which is the mark's own geometry at small size. */}
      <span
        aria-hidden
        className="mt-1 h-3.5 w-3.5 shrink-0 rotate-45 rounded-[3px] bg-brand-500"
      />
      <p className="min-w-0 flex-1 text-[14px] leading-snug text-ink">
        <span className="font-semibold">{BRAND.aiVoicePrefix}</span>{" "}
        {says}{" "}
        <span className="text-muted">{because}</span>
      </p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-[10px] bg-ink px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-ink-2"
        >
          {action.label} <Icon name="arrow" size={14} />
        </Link>
      )}
    </aside>
  );
}
