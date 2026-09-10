"use client";

import { useRef, useState } from "react";
import {
  ACCEPTED_EXTENSIONS,
  documentLabels,
  documentValue,
  describeHaul,
  mergeDocuments,
  MAX_DOCUMENT_BYTES,
  typeFor,
  type DocumentResult,
} from "@/modules/cv/lib/documents";
import { parseCv, type Cv } from "@/modules/cv/lib/schema";
import { track } from "@/modules/cv/lib/compat";

/**
 * Building a CV out of the documents a student already has.
 *
 * This is the path most students will actually want, because they do not have a
 * CV. They have a folder of photographs of certificates on their phone. Nobody
 * has ever asked them to type their board, their campus and their percentage
 * into a form, and they should not have to.
 *
 * Each file is its own request, uploaded a few at a time. That is what makes the
 * screen honest: ten certificates tick over one by one, a blurred photograph
 * fails on its own line without taking the others with it, and the student can
 * see which document produced which fact.
 *
 * The list of what was DISCARDED is not a footnote here. It is the point. A
 * student handing over a citizenship certificate is handing over their date of
 * birth, their parents' names and their citizenship number, and the only way to
 * be trusted with that is to show them, per document, exactly what was thrown
 * away and to have thrown it away before it reached anything that persists.
 */

type Row = {
  id: string;
  name: string;
  size: number;
  status: "queued" | "reading" | "done" | "failed";
  result?: DocumentResult;
  error?: string;
};

/** How many uploads run at once. Three is kind to a Kathmandu connection. */
const LANES = 3;
const MAX_FILES = 12;

export function DocumentsPanel({
  onUse,
  onBack,
}: {
  onUse: (cv: Cv, results: DocumentResult[]) => void;
  onBack: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const done = rows.filter((r) => r.status === "done" && r.result);
  const results = done.map((r) => r.result!);
  const useful = results.filter((r) => r.kind !== "unreadable");

  const patch = (id: string, next: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...next } : r)));

  async function readOne(row: Row, file: File) {
    patch(row.id, { status: "reading" });
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/cv/documents", { method: "POST", body: form });
      const json = await res.json();

      if (!res.ok) {
        // The feature being switched off is one fact about the site, not a fact
        // about this file. It gets the banner once, and the row says something
        // short, otherwise the same paragraph repeats down twelve rows.
        if (json.unavailable) {
          setUnavailable(json.error);
          patch(row.id, { status: "failed", error: "Not read: document reading is switched off." });
          return;
        }
        patch(row.id, { status: "failed", error: json.error ?? "Could not read this one." });
        return;
      }
      patch(row.id, {
        status: "done",
        result: { ...json, cv: parseCv(json.cv) } as DocumentResult,
      });
      track("cv_document_read", { kind: json.kind ?? "other" });
    } catch {
      patch(row.id, { status: "failed", error: "That upload did not get through. Try it again." });
    }
  }

  async function add(files: FileList | File[] | null) {
    if (!files) return;
    const picked = Array.from(files).slice(0, Math.max(0, MAX_FILES - rows.length));
    if (!picked.length) return;

    // Everything checkable is checked here, before a byte is uploaded, an
    // iPhone HEIC photo is the most likely file a student will pick, and
    // telling them so instantly beats a minute of upload and a 415.
    const queued: { row: Row; file: File }[] = [];
    const rejected: Row[] = [];

    picked.forEach((file, i) => {
      const id = `${Date.now()}-${i}-${file.name}`;
      const base: Row = { id, name: file.name, size: file.size, status: "queued" };
      const { mediaType, hint } = typeFor(file.name);
      if (!mediaType) {
        rejected.push({ ...base, status: "failed", error: hint ?? "Use a photo (JPEG, PNG) or a PDF." });
      } else if (file.size > MAX_DOCUMENT_BYTES) {
        rejected.push({ ...base, status: "failed", error: "Over 6MB. One page per file, and a normal phone photo is fine." });
      } else if (file.size === 0) {
        rejected.push({ ...base, status: "failed", error: "That file is empty." });
      } else {
        queued.push({ row: base, file });
      }
    });

    setRows((prev) => [...prev, ...queued.map((q) => q.row), ...rejected]);
    if (!queued.length) return;

    setBusy(true);
    track("cv_documents_uploaded", { count: queued.length });

    // A small pool rather than all at once: twelve parallel uploads on a slow
    // connection finish no sooner and all of them look stuck while they run.
    const pending = [...queued];
    await Promise.all(
      Array.from({ length: Math.min(LANES, pending.length) }, async () => {
        for (;;) {
          const job = pending.shift();
          if (!job) return;
          await readOne(job.row, job.file);
        }
      }),
    );
    setBusy(false);
  }

  function use() {
    const cv = mergeDocuments(useful);
    track("cv_documents_used", { documents: useful.length });
    onUse(cv, useful);
  }

  const merged = useful.length ? mergeDocuments(useful) : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl">
          <h3 className="text-2xl font-bold text-ink">Send us your documents.</h3>
          <p className="mt-3 leading-relaxed text-ink-2">
            Marksheets, certificates, your IELTS report, experience letters. Word files and PDFs
            straight from your email, or photos from your phone, whatever you have.
          </p>
        </div>
      </div>

      {/* --- What is worth sending, and what is not. */}
      <div className="mb-5 grid gap-2 sm:grid-cols-2">
        {(["transcript", "test-report", "experience-letter", "certificate", "training", "award"] as const).map(
          (kind) => (
            <div key={kind} className="flex items-start gap-2.5 rounded-2xl bg-wash px-4 py-3">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-ink)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="mt-1 shrink-0">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span className="text-[0.88rem] leading-snug text-ink-2">
                <strong className="font-semibold text-ink">{documentLabels[kind]}</strong>:{" "}
                {documentValue[kind]}
              </span>
            </div>
          ),
        )}
      </div>

      <p className="mb-6 rounded-2xl border border-line bg-white px-5 py-4 text-[0.86rem] leading-relaxed text-ink-2">
        <strong className="text-ink">You do not need to send your citizenship or passport.</strong>{" "}
        If you do, we take only the spelling of your name from them, which is worth having, because
        every application has to match your passport, and nothing else at all. A citizenship
        certificate is mostly date of birth, your father&apos;s name and a certificate number, and
        none of those belong on a CV or anywhere near our servers.
      </p>

      {/* --- The dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void add(e.dataTransfer.files);
        }}
        className={`rounded-card border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-brand bg-brand-50" : "border-line-2 bg-white"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="sr-only"
          onChange={(e) => void add(e.target.files)}
        />
        <button
          type="button"
          disabled={busy || rows.length >= MAX_FILES}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-[0.95rem] font-bold text-navy shadow-[0_8px_24px_-10px_rgba(54,210,255,0.9)] transition-colors hover:bg-brand-light disabled:opacity-40 disabled:shadow-none"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4m0 0L7 9m5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          {rows.length ? "Add more documents" : "Choose your documents"}
        </button>
        <p className="mt-3 text-[0.82rem] text-muted">
          Word, PDF or a photo. Up to {MAX_FILES} files, 6MB each. You can pick several at once.
        </p>
      </div>

      {unavailable && (
        <p className="mt-4 rounded-2xl bg-warn-50 px-5 py-4 text-[0.9rem] leading-relaxed text-warn">
          {unavailable}
        </p>
      )}

      {/* --- The files */}
      {rows.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl border border-line bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-[0.9rem] font-semibold text-ink">{row.name}</p>
                  {row.status === "done" && row.result && (
                    <p className="mt-1 text-[0.86rem] leading-snug text-ink-2">
                      {row.result.summary}
                    </p>
                  )}
                  {row.status === "failed" && (
                    <p className="mt-1 text-[0.86rem] leading-snug text-hard">{row.error}</p>
                  )}
                </div>
                <Status row={row} />
              </div>

              {row.status === "done" && row.result && row.result.discarded.length > 0 && (
                <p className="mt-3 border-t border-line pt-3 text-[0.82rem] leading-relaxed text-muted">
                  <strong className="font-semibold text-ink-2">Left off deliberately:</strong>{" "}
                  {row.result.discarded.join(", ")}. These are on the document and must not be on a
                  CV.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* --- What we got */}
      {merged && !busy && (
        <div className="mt-5 rounded-card border border-brand-200 bg-brand-50 p-6">
          <p className="font-bold text-ink">
            Read {useful.length} document{useful.length === 1 ? "" : "s"}: {describeHaul(merged)}.
          </p>
          <p className="mt-2 text-[0.88rem] leading-relaxed text-ink-2">
            {merged.name ? `Name taken as "${merged.name}". ` : ""}
            Nothing is final: the next screens let you correct every field, and you will see the
            whole CV as you go.
          </p>
        </div>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full px-5 py-3 text-[0.9rem] font-bold text-muted transition-colors hover:text-navy"
        >
          Back
        </button>
        <button
          type="button"
          disabled={busy || !useful.length}
          onClick={use}
          className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3.5 text-[0.95rem] font-bold text-white transition-opacity hover:bg-navy-90 disabled:opacity-40"
        >
          {busy ? "Reading…" : "Use these details"}
          {!busy && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
              <path d="M5 12h14m-6-7 7 7-7 7" />
            </svg>
          )}
        </button>
        {!busy && rows.length > 0 && !useful.length && (
          <span className="text-[0.85rem] text-muted">
            Nothing readable yet. Try a clearer photo, or go back and fill the form in.
          </span>
        )}
      </div>

      <p className="mt-6 text-[0.82rem] leading-relaxed text-muted">
        <strong className="text-ink-2">What happens to these files.</strong> Each one is read in
        memory and dropped when the page answers. Nothing is written to our servers, nothing reaches
        our CRM, and none of it is treated as an enquiry. The document is passed to an extraction
        model to pull the fields out, and the CV it produces is stored only in this browser.
      </p>
    </div>
  );
}

function Status({ row }: { row: Row }) {
  if (row.status === "queued") {
    return <span className="shrink-0 text-[0.8rem] font-semibold text-muted">Waiting</span>;
  }
  if (row.status === "reading") {
    return (
      <span className="inline-flex shrink-0 items-center gap-2 text-[0.8rem] font-semibold text-brand-ink">
        <span className="relative flex h-2 w-2">
          <span className="hp-ping absolute inline-flex h-full w-full rounded-full bg-brand" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-ink" />
        </span>
        Reading
      </span>
    );
  }
  if (row.status === "failed") {
    return (
      <span className="shrink-0 rounded-full bg-hard-50 px-2.5 py-1 text-[0.72rem] font-bold text-hard">
        Skipped
      </span>
    );
  }

  const kind = row.result?.kind ?? "other";
  const unreadable = kind === "unreadable";
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[0.72rem] font-bold ${
        unreadable ? "bg-warn-50 text-warn" : "bg-good-50 text-good"
      }`}
    >
      {documentLabels[kind]}
    </span>
  );
}
