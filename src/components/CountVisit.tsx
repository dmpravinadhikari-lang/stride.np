"use client";

import { useEffect } from "react";

/**
 * Reports that a free tool was opened, once per mount.
 *
 * Deliberately fire-and-forget with `keepalive`, so it never delays the page
 * and never shows the visitor an error if it fails — a counter is not worth
 * one moment of anybody's attention. Nothing identifying is sent: the request
 * body is the tool's name and nothing else.
 */
export function CountVisit({ tool }: { tool: string }) {
  useEffect(() => {
    fetch("/api/count", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tool, kind: "opened" }),
      keepalive: true,
    }).catch(() => {});
  }, [tool]);

  return null;
}

/** Call when a visitor actually gets an answer out of a tool. */
export function countCompleted(tool: string) {
  fetch("/api/count", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tool, kind: "completed" }),
    keepalive: true,
  }).catch(() => {});
}
