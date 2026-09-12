import Link from "next/link";
import { BRAND } from "@/lib/brand";
import type { BrandedBranch } from "@/lib/tenancy/branch";

/**
 * Whose name is over the door.
 *
 * On the apex this is STRIDE's wordmark. On a consultancy's own address it is
 * the consultancy: their initial in their accent, then their name — the same
 * treatment the sign-in card already uses, so a student who was told to go to
 * happypanda.stride.np sees Happy Panda on every page they land on, not the
 * name of the software their consultancy happens to buy.
 *
 * Takes no database and reads no headers, so a client component can render it
 * too. `Logo` is the server wrapper that resolves the branch.
 */
export function BrandMark({
  href = "/",
  tone = "dark",
  size = 19,
  branch = null,
}: {
  href?: string;
  tone?: "dark" | "light";
  size?: number;
  branch?: BrandedBranch | null;
}) {
  const label = branch ? branch.name : BRAND.name;

  return (
    <Link
      href={href}
      className="inline-flex min-h-11 min-w-0 items-center py-1 sm:min-h-0 sm:py-0"
      aria-label={`${label} home`}
    >
      {branch ? (
        <>
          <span
            aria-hidden
            className="flex shrink-0 items-center justify-center rounded-lg font-bold text-white"
            style={{
              background: branch.accent,
              width: size * 1.45,
              height: size * 1.45,
              fontSize: size * 0.78,
            }}
          >
            {branch.name.slice(0, 1).toUpperCase()}
          </span>
          {/* Truncates against whatever room the bar leaves it, rather than a
              fixed cap: a long consultancy name must not push the credits or
              the menu button off the edge of a phone. */}
          <span
            className={`h-tight ml-2.5 truncate font-bold tracking-[-0.02em] ${
              tone === "dark" ? "text-ink" : "text-white"
            }`}
            style={{ fontSize: size }}
          >
            {branch.name}
          </span>
        </>
      ) : (
        <>
          <span
            className={`h-tight font-bold tracking-[-0.045em] ${
              tone === "dark" ? "text-brand-700" : "text-white"
            }`}
            style={{ fontSize: size }}
          >
            {BRAND.wordmark}
          </span>
          <span
            aria-hidden
            className={`ml-[0.06em] inline-block self-end rounded-full ${
              tone === "dark" ? "bg-brand-400" : "bg-brand-300"
            }`}
            style={{ width: size * 0.19, height: size * 0.19, marginBottom: size * 0.09 }}
          />
        </>
      )}
    </Link>
  );
}
