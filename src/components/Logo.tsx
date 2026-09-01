import Link from "next/link";
import { BRAND } from "@/lib/brand";

/**
 * The wordmark, set in type rather than shipped as an image so it stays sharp
 * at any size and follows the theme. The red full stop is the only place that
 * colour appears in the interface.
 */
export function Logo({
  href = "/", tone = "dark", size = 19,
}: { href?: string; tone?: "dark" | "light"; size?: number }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center py-1 sm:min-h-0 sm:py-0" aria-label={`${BRAND.name} home`}>
      <span
        className={`h-tight font-bold tracking-[-0.045em] ${tone === "dark" ? "text-brand-600" : "text-white"}`}
        style={{ fontSize: size }}
      >
        {BRAND.wordmark}
      </span>
      <span
        aria-hidden
        className="ml-[0.06em] inline-block self-end rounded-full bg-signal"
        style={{ width: size * 0.19, height: size * 0.19, marginBottom: size * 0.09 }}
      />
    </Link>
  );
}
