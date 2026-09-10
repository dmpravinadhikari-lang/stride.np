import { NextResponse } from "next/server";

/**
 * One response shape for the whole API, so a client written once keeps working.
 * Errors carry a stable machine-readable code alongside the human sentence.
 */
export const ok = <T>(data: T, init?: ResponseInit) =>
  NextResponse.json({ ok: true, data }, { status: 200, ...init });

export const fail = (status: number, code: string, message: string) =>
  NextResponse.json({ ok: false, error: { code, message } }, { status });

export const unauthorised = () =>
  fail(401, "unauthorised", "Sign in again. This token is missing, expired or revoked.");

export const forbidden = () =>
  fail(403, "forbidden", "This account cannot do that.");

/** The API is versioned so a shipped app never breaks under a deploy. */
export const API_VERSION = "1";
