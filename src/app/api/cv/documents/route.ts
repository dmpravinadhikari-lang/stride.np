import { NextResponse } from "next/server";
import {
  canReadDocuments,
  canReadText,
  MAX_DOCUMENT_BYTES,
  readDocumentImage,
  readDocumentText,
  typeFor,
} from "@/modules/cv/lib/read-document";
import { parseTextDocument } from "@/modules/cv/lib/read-text-document";
import { extractText } from "@/modules/cv/lib/text";


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
 * Reading one of a student's documents.
 *
 * HOW A FILE IS ROUTED, which is the whole of this file:
 *
 *   Word, ODT, text        Text is in the file. Read it, with the model if a
 *                          key is configured and with regexes if not. Works
 *                          offline either way.
 *   PDF                    Try for a text layer first, one exported from Word
 *                          has one. If there is none it was scanned, so treat
 *                          it as a photograph.
 *   JPEG, PNG, WebP, GIF   A photograph. No text exists, so this needs the
 *                          model and there is no honest fallback.
 *
 * That order is the fix for the bug that made this feature useless. The first
 * version sent everything to the vision model, so with no key every single
 * upload came back "switched off", and Word files, which is what an experience
 * letter usually is, were not even accepted. Now only photographs need a key.
 *
 * One file per request. Ten certificates arrive as ten short requests the
 * browser fires a few at a time, so the student watches them tick over and a
 * blurred photo fails on its own line instead of taking the batch down.
 *
 * Nothing is stored. The file is held in memory for the length of this request,
 * read, and dropped. It never touches the disk, never reaches the CRM, and is
 * not treated as an enquiry. A citizenship certificate and a passport are the
 * two documents most worth stealing from a consultancy, and the safest place to
 * put them is nowhere.
 */
export const runtime = "nodejs";
export const maxDuration = 120;

/** Per IP. Generous, because a student uploading eight certificates is normal. */
const hits = new Map<string, number[]>();
const WINDOW = 120_000;
const LIMIT = 24;

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT;
}

export async function POST(req: Request) {
  const scope = await callerScope();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? "unknown";

  if (limited(ip)) {
    return NextResponse.json(
      { error: "That is a lot of documents at once. Wait a minute, then send the rest." },
      { status: 429 },
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file arrived. Try choosing it again." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "That file is empty." }, { status: 400 });
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      return NextResponse.json(
        { error: "That file is over 6MB. A photo of one certificate should be well under that. Try a single page." },
        { status: 413 },
      );
    }

    const { mediaType, via, hint } = typeFor(file.name);
    if (!mediaType || !via) {
      return NextResponse.json(
        { error: hint ?? "Use a photo (JPEG, PNG), a PDF, or a Word document." },
        { status: 415 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());

    // --- Anything that might carry text: try to read it.
    if (via === "text" || via === "either") {
      const read = extractText(buf, file.name);

      if (read.usable) {
        const result = canReadText()
          ? await readDocumentText(scope, read.text, file.name).catch(() => parseTextDocument(read.text, file.name))
          : parseTextDocument(read.text, file.name);
        return NextResponse.json({ ...result, filename: file.name, read: canReadText() ? "model" : "text" });
      }

      // A Word file with no readable text is empty or corrupt; there is nothing
      // else to try, because there was never an image in it.
      if (via === "text") {
        return NextResponse.json(
          { error: "Nothing readable came out of that document. Check it opens, or send a photo of the printed copy instead." },
          { status: 422 },
        );
      }
      // A PDF with no text layer was scanned or photographed. Fall through.
    }

    // --- A photograph, or a scanned PDF. Only the model can read these.
    if (!canReadDocuments()) {
      return NextResponse.json(
        {
          error:
            via === "either"
              ? "That PDF is a scan. There is no text in it, only a picture, and reading pictures is switched off on this site. Send the Word version if you have one, or type the details in."
              : "Reading photos is switched off on this site. Send a PDF or Word version of the document if you have one, or type the details in. It takes about five minutes.",
          unavailable: true,
        },
        { status: 503 },
      );
    }

    const result = await readDocumentImage(scope, { mediaType, base64: buf.toString("base64") }, file.name);
    return NextResponse.json({ ...result, filename: file.name, read: "vision" });
  } catch (err) {
    if (err instanceof NeedsAccountError) return needsAccount();
    console.error("[cv/documents] failed:", err);
    return NextResponse.json(
      { error: "That one could not be read. Try a clearer photo, or skip it and type the details in." },
      { status: 500 },
    );
  }
}
