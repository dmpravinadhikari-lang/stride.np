import { NextResponse } from "next/server";
import { z } from "zod";
import { extractText, looksLikeText, MAX_UPLOAD_BYTES } from "@/modules/cv/lib/text";
import { extractCv } from "@/modules/cv/lib/extract";


import { readSession } from "@/lib/auth/session";
import { scopeOf } from "@/lib/auth/current";
import { NeedsAccountError } from "@/modules/cv/lib/ai-adapter";

/**
 * These two endpoints are the only parts of the CV maker that cost money.
 *
 * Typing a CV in by hand, choosing a template and downloading it are pure
 * client-side work and stay open to anyone. Reading a certificate photo or a
 * pasted CV is an AI call billed to a consultancy, so it needs a signed-in
 * member behind it. A signed-out visitor gets a plain explanation, not a
 * silent failure, and the builder falls back to the manual form.
 */
async function callerScope() {
  const user = await readSession();
  return user ? scopeOf(user) : null;
}

const needsAccount = () =>
  Response.json(
    {
      error:
        "Reading a CV automatically uses AI, which comes with your consultancy's account. You can still fill the form in yourself, and nothing is lost.",
      recoverable: true,
      needsAccount: true,
    },
    { status: 403 },
  );
/**
 * Reading a student's existing CV.
 *
 * Takes either an uploaded file or pasted text, and returns structured fields
 * for the builder to open with.
 *
 * The file is never written to disk and never reaches the CRM. A CV holds a
 * student's phone number, their address and their family's circumstances, and
 * the tool is free and ungated. So there is no version of this where keeping
 * the file would be a fair trade. It is parsed in memory and dropped when the
 * response is sent. The one thing that does leave the server is the extracted
 * text, sent to the extraction model when a key is configured, which the upload
 * screen says plainly before the student chooses the file.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const Pasted = z.object({ text: z.string().min(40).max(60_000) });

/** In-memory throttle, matching the lead route. Extraction is the expensive
 *  path here, so the limit is tighter. */
const hits = new Map<string, number[]>();
const WINDOW = 60_000;
const LIMIT = 6;

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT;
}

const ACCEPTED = /\.(pdf|docx?|odt|txt|md|rtf)$/i;

export async function POST(req: Request) {
  const scope = await callerScope();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? "unknown";

  if (limited(ip)) {
    return NextResponse.json(
      { error: "That is a lot of uploads in one minute. Wait a moment and try again." },
      { status: 429 },
    );
  }

  const type = req.headers.get("content-type") ?? "";

  try {
    if (type.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file arrived. Try choosing it again." }, { status: 400 });
      }
      if (file.size === 0) {
        return NextResponse.json({ error: "That file is empty." }, { status: 400 });
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: "That file is over 8MB. A CV that large is usually a scan. Export it as a PDF from Word instead." },
          { status: 413 },
        );
      }
      if (!ACCEPTED.test(file.name)) {
        return NextResponse.json(
          { error: "Use a PDF, Word, ODT or plain text file, or paste the text instead." },
          { status: 415 },
        );
      }

      const buf = Buffer.from(await file.arrayBuffer());
      const read = extractText(buf, file.name);

      if (!read.usable) {
        return NextResponse.json(
          {
            error:
              read.via === "pdf"
                ? "That PDF has no readable text in it. It is almost certainly a scan or a photograph of a printed CV. Paste the text instead, or fill the form in; it takes about five minutes."
                : "Nothing readable came out of that file. Paste the text instead, or fill the form in.",
            recoverable: true,
          },
          { status: 422 },
        );
      }

      const result = await extractCv(scope, read.text);
      return NextResponse.json({ ...result, source: read.via });
    }

    const parsed = Pasted.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Paste a bit more of your CV, at least a few lines." },
        { status: 400 },
      );
    }
    if (!looksLikeText(parsed.data.text)) {
      return NextResponse.json(
        { error: "That does not look like CV text. Paste the whole thing, headings and all.", recoverable: true },
        { status: 422 },
      );
    }

    const result = await extractCv(scope, parsed.data.text);
    return NextResponse.json({ ...result, source: "text" });
  } catch (err) {
    if (err instanceof NeedsAccountError) return needsAccount();
    console.error("[cv/import] failed:", err);
    return NextResponse.json(
      { error: "Something went wrong reading that. You can fill the form in instead, nothing is lost.", recoverable: true },
      { status: 500 },
    );
  }
}
