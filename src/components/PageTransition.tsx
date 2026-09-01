"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Replays the settle-in animation whenever the route changes.
 *
 * A layout does not re-render on navigation inside itself, so a CSS animation
 * declared there fires once on first load and never again — every later page
 * would appear instantly while the first one eased in. Keying on the pathname
 * remounts the subtree, which restarts the animation.
 *
 * The animation itself is defined by `.rise` in globals.css, and that class is
 * disabled wholesale under prefers-reduced-motion.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="rise">
      {children}
    </div>
  );
}
