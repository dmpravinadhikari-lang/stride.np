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
      className={`group flex min-h-[38px] items-center gap-2.5 rounded-[10px] px-2.5 text-[13.5px] font-medium transition-colors ${
        active ? "bg-rail-3 font-semibold text-white" : "text-rail-ink/75 hover:bg-rail-2 hover:text-white"
      }`}
    >
      <Icon
        name={icon} size={17}
        className={active ? "text-brand-300" : state === "open" ? "text-rail-ink/55 group-hover:text-brand-300" : "text-rail-ink/35"}
      />
      <span className={`flex-1 truncate ${state === "open" ? "" : "text-rail-ink/45"}`}>{label}</span>
      {badge ? (
        <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums text-rail">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
      {state === "soon" && (
        <span className="rounded-full bg-rail-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rail-ink/50">Soon</span>
      )}
      {state === "locked" && <Icon name="lock" size={14} className="text-rail-ink/45" label="Not on your plan" />}
    </Link>
  );
}
