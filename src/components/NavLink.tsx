"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href, icon, label, state, exact = false,
}: {
  href: string; icon: string; label: string;
  state: "open" | "locked" | "soon"; exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href) && href !== "/app";

  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors ${
        active ? "bg-brand-50 text-brand-700" : "text-ink-2 hover:bg-wash"
      }`}
    >
      <span className={state === "open" ? "" : "opacity-45"} aria-hidden>{icon}</span>
      <span className={`flex-1 truncate ${state === "open" ? "" : "text-muted"}`}>{label}</span>
      {state === "soon" && (
        <span className="rounded-full bg-wash px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-muted">Soon</span>
      )}
      {state === "locked" && (
        <span className="text-[11px] text-muted" aria-label="Locked on your plan">🔒</span>
      )}
    </Link>
  );
}
