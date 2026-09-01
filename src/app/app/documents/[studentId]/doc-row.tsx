import { deleteDocument, keepDocument, verifyDocument } from "@/modules/documents/actions";
import { Chip } from "@/components/ui";

const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

function daysLeft(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5);
}

export function DocRowItem({
  kind, doc, staff,
}: {
  kind: { id: string; label: string; hint: string; sensitive: boolean };
  doc: {
    id: string; filename: string; bytes: number; status: string; note: string | null;
    expires_at: string | null; keep: boolean; created_at: string;
  } | null;
  staff: boolean;
}) {
  const left = doc?.expires_at ? daysLeft(doc.expires_at) : null;

  return (
    <li className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-semibold text-ink">{kind.label}</span>
          {!doc && <Chip tone="grey">Not uploaded</Chip>}
          {doc?.status === "verified" && <Chip tone="teal">Verified</Chip>}
          {doc?.status === "rejected" && <Chip tone="danger">Sent back</Chip>}
          {doc?.status === "uploaded" && <Chip tone="gold">Awaiting check</Chip>}
          {kind.sensitive && <Chip tone="grey">Sensitive</Chip>}
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{kind.hint}</p>

        {doc && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[12.5px]">
            <a
              href={`/api/documents/${doc.id}`} target="_blank" rel="noreferrer"
              className="inline-flex min-h-11 items-center font-semibold text-brand-600 hover:underline sm:min-h-0"
            >
              {doc.filename}
            </a>
            <span className="num text-muted">{kb(doc.bytes)}</span>
            <span className="text-muted">{new Date(doc.created_at).toLocaleDateString()}</span>
            {left !== null && !doc.keep && (
              <span className={left <= 14 ? "font-semibold text-danger-600" : "text-muted"}>
                deletes in {left} day{left === 1 ? "" : "s"}
              </span>
            )}
            {doc.keep && <span className="text-teal-700">kept</span>}
          </div>
        )}

        {doc?.note && <p className="mt-1.5 text-[12.5px] text-danger-600">{doc.note}</p>}
      </div>

      {doc && (
        <div className="flex flex-wrap items-center gap-1.5">
          {kind.sensitive && (
            <form action={keepDocument}>
              <input type="hidden" name="id" value={doc.id} />
              <input type="hidden" name="keep" value={doc.keep ? "0" : "1"} />
              <button type="submit" className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-line-2">
                {doc.keep ? "Let it expire" : "Keep"}
              </button>
            </form>
          )}
          {staff && (
            <>
              <form action={verifyDocument}>
                <input type="hidden" name="id" value={doc.id} />
                <input type="hidden" name="status" value="verified" />
                <button type="submit" className="rounded-lg bg-teal-100 px-2.5 py-1.5 text-[12px] font-semibold text-teal-700 hover:bg-teal-100/70">
                  Verify
                </button>
              </form>
              <form action={verifyDocument} className="flex items-center gap-1">
                <input type="hidden" name="id" value={doc.id} />
                <input type="hidden" name="status" value="rejected" />
                <input name="note" placeholder="Why?" className="w-24 rounded-lg border border-line px-2 py-1.5 text-[12px] focus:border-brand-400 focus:outline-none" />
                <button type="submit" className="rounded-lg bg-danger-100 px-2.5 py-1.5 text-[12px] font-semibold text-danger-600 hover:bg-danger-100/70">
                  Send back
                </button>
              </form>
            </>
          )}
          <form action={deleteDocument}>
            <input type="hidden" name="id" value={doc.id} />
            <button type="submit" className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:text-danger-600">
              Delete
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
