import { NextResponse } from "next/server";
import { one } from "@/lib/db";

/**
 * The question Caddy asks before it gets a certificate for a hostname.
 *
 * Every consultancy gets its own address, everest.officeyak.com, and a
 * wildcard certificate would mean a DNS challenge, an API token for the DNS
 * provider sitting on the web server, and a custom Caddy build. On-demand
 * certificates avoid all of that: Caddy asks here, and issues one only for a
 * name we say is ours.
 *
 * The check has to exist, and has to be tight. Without it anybody could point
 * their own domain at this server and have it fetch certificates until the
 * issuer rate-limits us, which would take the whole product off the air.
 *
 * It answers only yes or no. It never says which consultancies exist: an
 * unknown name and a name belonging to somebody else get exactly the same
 * 404, so this cannot be used to enumerate customers.
 */
export const dynamic = "force-dynamic";

const ROOT = (process.env.OFFICEYAK_ROOT_DOMAIN || "").toLowerCase().replace(/:\d+$/, "");

export function GET(request: Request) {
  // Caddy asks without a port; a port is stripped anyway so that the check
  // behaves the same when it is exercised by hand in development.
  const asked = (new URL(request.url).searchParams.get("domain") || "")
    .toLowerCase().trim().replace(/:\d+$/, "");
  if (!asked || !ROOT) return new NextResponse("no", { status: 404 });

  // The apex and www are ours, and are the marketing site.
  if (asked === ROOT || asked === `www.${ROOT}`) return new NextResponse("ok", { status: 200 });

  if (!asked.endsWith(`.${ROOT}`)) return new NextResponse("no", { status: 404 });

  const label = asked.slice(0, -(ROOT.length + 1));
  // One label only: a.b.officeyak.com is not a consultancy, it is somebody
  // probing.
  if (!label || label.includes(".")) return new NextResponse("no", { status: 404 });

  const known = one("SELECT 1 FROM tenants WHERE slug = ? AND active = 1", label);
  return known
    ? new NextResponse("ok", { status: 200 })
    : new NextResponse("no", { status: 404 });
}
