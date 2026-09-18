"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";

export function NavLink({
  href, icon, label, state, exact = false, badge,
}: {
  href: string; icon: IconName; label: string;
  state: "open" | "locked" | "soon"; exact?: boolean; badge?: number;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href) && href !== "/app";

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-[40px] items-center gap-3 rounded-full px-3.5 text-[13.5px] font-medium transition-colors ${
        active ? "bg-rail-3 font-medium text-brand-900" : "text-ink-2 hover:bg-rail-2"
      }`}
    >
      <Icon
        name={icon} size={17}
        className={active ? "text-brand-900" : state === "open" ? "text-rail-ink" : "text-muted/60"}
      />
      <span className={`flex-1 truncate ${state === "open" ? "" : "text-muted"}`}>{label}</span>
      {badge ? (
        <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums text-ink">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
      {state === "soon" && (
        <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Soon</span>
      )}
      {state === "locked" && <Icon name="lock" size={14} className="text-muted" label="Not on your plan" />}
    </Link>
  );
}
