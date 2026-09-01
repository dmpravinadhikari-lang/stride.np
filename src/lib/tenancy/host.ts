/**
 * Working out which consultancy a request belongs to, from its hostname.
 *
 * Every branch gets its own address — happypanda.stride.np, sprout.stride.np —
 * because a student who was told "log in at happypanda.stride.np" should land
 * on their consultancy's own page, with its name on it, not a generic login
 * that asks them which of forty consultancies they belong to.
 *
 * The apex (stride.np, www.stride.np) is the public marketing site and the
 * free calculators. It has no tenant.
 */

/** Hostnames that are the public site rather than a branch. */
const APEX_LABELS = new Set(["", "www", "app", "admin", "api", "mail", "stride"]);

/** Local development hosts, where there is no real domain to read. */
const LOCAL = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/;

export type HostInfo = {
  /** The branch slug, or null on the public site. */
  slug: string | null;
  /** True when this is the marketing site rather than a consultancy. */
  isApex: boolean;
  /** The bare hostname, port stripped. */
  host: string;
};

export function readHost(hostHeader: string | null | undefined): HostInfo {
  const host = String(hostHeader ?? "").split(":")[0].toLowerCase().trim();

  if (!host || LOCAL.test(host)) return { slug: null, isApex: true, host };

  // A subdomain of localhost is how this is exercised in development:
  // happypanda.localhost:3000 behaves exactly like happypanda.stride.np.
  if (host.endsWith(".localhost")) {
    const label = host.slice(0, -".localhost".length);
    return APEX_LABELS.has(label)
      ? { slug: null, isApex: true, host }
      : { slug: label, isApex: false, host };
  }

  const parts = host.split(".");
  // stride.np -> 2 parts, no branch. happypanda.stride.np -> 3.
  if (parts.length < 3) return { slug: null, isApex: true, host };

  const label = parts[0];
  if (APEX_LABELS.has(label)) return { slug: null, isApex: true, host };

  return { slug: label, isApex: false, host };
}

/** The address a branch should be told to use. */
export function branchUrl(slug: string, rootDomain = process.env.STRIDE_ROOT_DOMAIN || "stride.np") {
  return `${slug}.${rootDomain}`;
}
