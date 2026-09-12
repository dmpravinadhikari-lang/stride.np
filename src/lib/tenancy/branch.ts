import { cache } from "react";
import { headers } from "next/headers";
import { one } from "@/lib/db";

/**
 * The consultancy whose address this request arrived on.
 *
 * The slug comes from middleware as a header; this resolves it against the
 * database. Kept separate from host parsing so the parser stays a pure
 * function that can be reasoned about without a database.
 */

export type Branch = {
  id: string;
  slug: string;
  name: string;
  plan: string;
  accent_color: string;
  contact_email: string | null;
  contact_phone: string | null;
  active: number;
};

/**
 * Null on the public site, or when the subdomain matches no live branch.
 *
 * Wrapped in React's cache because the branch is now read by the chrome on
 * every page — header, footer, nav, page title — and without it a single
 * render would go to the database four or five times for the same row.
 */
export const currentBranch = cache(async function currentBranch(): Promise<Branch | null> {
  const slug = (await headers()).get("x-stride-branch");
  if (!slug) return null;
  return (
    one<Branch>(
      `SELECT id, slug, name, plan, accent_color, contact_email, contact_phone, active
         FROM tenants
        WHERE slug = ? AND kind = 'consultancy' AND active = 1`,
      slug,
    ) ?? null
  );
});

/** The branch reduced to what the chrome needs to draw a mark. */
export type BrandedBranch = { name: string; accent: string };

/** Null on the public site. Shaped for `BrandMark`, which takes no database. */
export async function currentBrand(): Promise<BrandedBranch | null> {
  const branch = await currentBranch();
  return branch ? { name: branch.name, accent: branch.accent_color } : null;
}

/** The slug as sent, whether or not it resolves. Used to explain a bad address. */
export async function requestedBranchSlug(): Promise<string | null> {
  return (await headers()).get("x-stride-branch");
}
