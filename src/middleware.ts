import { NextResponse, type NextRequest } from "next/server";
import { readHost } from "@/lib/tenancy/host";

/**
 * Reads the consultancy out of the hostname and passes it down as a request
 * header, so server components can brand the page without every one of them
 * parsing the Host themselves.
 *
 * Middleware runs on the edge and cannot open the database, so it deliberately
 * does no lookup, it forwards the slug as text and the page resolves it. An
 * unknown slug is therefore handled where there is a database to say so,
 * rather than being guessed at here.
 *
 * This does not perform access control. Authentication and tenant isolation
 * stay in the server actions and page guards, where they can be tested and
 * where a misconfigured matcher cannot silently switch them off.
 */
export function middleware(request: NextRequest) {
  const { slug } = readHost(request.headers.get("host"));

  const headers = new Headers(request.headers);
  // Strip any inbound copy first: without this, a caller could set the header
  // themselves and choose which consultancy's branding to be shown.
  headers.delete("x-stride-branch");
  if (slug) headers.set("x-stride-branch", slug);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    // Everything except Next's own assets and the icon routes, which never
    // vary by consultancy and should not pay for a middleware hop.
    "/((?!_next/static|_next/image|favicon.ico|icon|icon-192|icon-512|icon-maskable|apple-icon|sw.js|manifest.webmanifest).*)",
  ],
};
