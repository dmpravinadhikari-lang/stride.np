import { NextResponse } from "next/server";
import { authorizeUrl, googleConfigured, makeState, STATE_COOKIE } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google-not-configured", request.url));
  }
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/app";
  const state = makeState(next);
  const redirectUri = new URL("/api/auth/google/callback", url.origin).toString();

  const response = NextResponse.redirect(authorizeUrl(redirectUri, state));
  // The state is echoed back by Google and compared with this cookie, which is
  // what stops someone else's callback being replayed into your browser.
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
