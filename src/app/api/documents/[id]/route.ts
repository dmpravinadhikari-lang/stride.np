import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { scopeOf } from "@/lib/auth/current";
import { getDocument, logAccess } from "@/modules/documents/data";
import { mayAccessStudent } from "@/modules/documents/access";
import { readStored } from "@/modules/documents/storage";

/**
 * The only way a stored file reaches a browser.
 *
 * Every request re-checks who is asking, and every successful read is written
 * to the access log. There is no public URL for any document, and guessing an
 * id gets you a 404 rather than a file.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await readSession();
  if (!user) return new NextResponse("Not signed in", { status: 401 });

  const scope = scopeOf(user);
  const doc = getDocument(scope, id);
  // Same response whether it does not exist or is not yours, no probing.
  if (!doc || !mayAccessStudent(scope, doc.student_id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readStored(doc.storage_path);
  } catch {
    return new NextResponse("That file is no longer on the server.", { status: 410 });
  }

  logAccess(scope, doc.id);

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": doc.mime,
      "content-length": String(bytes.length),
      "content-disposition": `inline; filename="${encodeURIComponent(doc.filename)}"`,
      // Never let a shared machine or a proxy hold on to a passport scan.
      "cache-control": "private, no-store, max-age=0",
      "x-content-type-options": "nosniff",
    },
  });
}
