/**
 * Consultancy accounts are opened with a work email, never a personal one.
 *
 * Two reasons, and the second is the one that matters. A shared free mailbox
 * is how an office loses its own account when the person who opened it
 * leaves. And the domain is the evidence that the person signing up actually
 * works at the consultancy they are claiming, which is the whole basis of
 * handing them a subdomain with their students' passports in it.
 *
 * The list is the free providers people in Nepal actually use. It is not a
 * complete list of every free provider on earth, and it does not need to be:
 * anything not on it is a domain somebody had to buy.
 */
const PERSONAL = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "ymail.com", "rocketmail.com",
  "hotmail.com", "outlook.com", "live.com", "msn.com", "icloud.com", "me.com", "mac.com",
  "proton.me", "protonmail.com", "aol.com", "gmx.com", "mail.com", "zoho.com", "yandex.com",
  "rediffmail.com", "hotmail.co.uk", "outlook.co.uk", "wlink.com.np", "ntc.net.np",
  // Throwaway domains, which are the same problem wearing a different hat.
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "yopmail.com",
]);

export const domainOf = (email: string) => email.trim().toLowerCase().split("@")[1] ?? "";

export const isPersonalEmail = (email: string) => PERSONAL.has(domainOf(email));

/**
 * The subdomain a consultancy gets, taken from their email domain rather than
 * their name.
 *
 * "info@everestglobal.com.np" becomes "everestglobal", which is the name the
 * office already answers to and already prints on a card. Deriving it from
 * the typed name instead gives "everest-global-education-pvt-ltd", which
 * nobody can read down a phone line.
 */
export function slugFromEmail(email: string): string {
  const domain = domainOf(email);
  if (!domain) return "";
  // Strip the public suffix: com.np, edu.np, co.uk, com, org and so on.
  const parts = domain.split(".").filter(Boolean);
  const PUBLIC = new Set(["com", "net", "org", "edu", "gov", "co", "np", "io", "ai", "info", "biz"]);
  while (parts.length > 1 && PUBLIC.has(parts[parts.length - 1])) parts.pop();
  const name = parts[parts.length - 1] ?? "";
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

/** Words a subdomain cannot be, because the platform already uses them. */
const RESERVED = new Set([
  "www", "app", "api", "admin", "mail", "smtp", "imap", "blog", "help", "support",
  "status", "docs", "tools", "login", "signup", "account", "billing", "static", "cdn",
  "officeyak", "dashboard", "portal", "test", "staging", "dev",
]);

export const isReservedSlug = (slug: string) => RESERVED.has(slug);
