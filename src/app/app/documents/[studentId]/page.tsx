import Link from "next/link";
import { notFound } from "next/navigation";
import { requireScope } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/roles";
import { one } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import { country } from "@/lib/countries";
import { mayAccessStudent } from "@/modules/documents/access";
import { latestCheck, listDocuments, RETENTION_DAYS } from "@/modules/documents/data";
import { CATEGORIES, kindById, requiredFor } from "@/modules/documents/kinds";
import { stageOf } from "@/modules/pipeline/stages";
import { Card, Chip, Meter, SeverityChip, type Tone } from "@/components/ui";
import { UploadPanel } from "./upload-panel";
import { DocRowItem } from "./doc-row";
import { CheckButton } from "./check-button";

export default async function VaultPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const { user, scope } = await requireScope();
  if (!mayAccessStudent(scope, studentId)) notFound();

  const student = one<{ full_name: string }>("SELECT full_name FROM users WHERE id = ?", studentId);
  if (!student) notFound();

  const staff = isStaff(user.role);
  const profile = getProfile(studentId);
  const stage = one<{ stage: string }>(
    "SELECT stage FROM pipeline_entries WHERE student_id = ? AND tenant_id = ?", studentId, scope.tenantId,
  )?.stage ?? "applying";

  const docs = listDocuments(scope, studentId);
  const byKind = new Map(docs.map((d) => [d.kind, d]));
  const required = requiredFor(profile?.target_country ?? null, stage);
  const held = required.filter((k) => byKind.has(k.id)).length;
  const check = latestCheck(scope, studentId);
  const st = stageOf(stage);

  return (
    <div className="flex flex-col gap-6">
      <header>
        {staff && (
          <Link href="/app/documents" className="inline-flex min-h-[40px] items-center text-[12.5px] font-semibold text-muted hover:text-brand-600">← All vaults</Link>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <h1 className="display text-[26px]">{staff ? student.full_name : "Your documents"}</h1>
          {staff && <Chip tone={st.tone as Tone}>{st.label}</Chip>}
        </div>
        <p className="mt-1.5 text-[14px] text-ink-2">
          {profile?.target_country
            ? `${country(profile.target_country).flag} ${country(profile.target_country).name}. The list below is what this destination asks for at this stage.`
            : "Choose a target country in the profile and this list becomes specific to it."}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-panel px-5 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Collected</div>
          <div className="num mt-1 text-2xl font-semibold text-ink">{held} / {required.length}</div>
          <div className="mt-1.5"><Meter value={held} max={required.length} tone={held === required.length ? "teal" : "brand"} /></div>
        </div>
        <div className="rounded-2xl border border-line bg-panel px-5 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">File readiness</div>
          <div className="num mt-1 text-2xl font-semibold text-ink">{check ? `${check.readiness}%` : ", "}</div>
          <div className="mt-1 text-[12px] text-muted">
            {check ? `checked ${new Date(check.created_at).toLocaleDateString()}` : "not checked yet"}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-panel px-5 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Uploaded</div>
          <div className="num mt-1 text-2xl font-semibold text-ink">{docs.length}</div>
          <div className="mt-1 text-[12px] text-muted">
            {docs.filter((d) => d.status === "verified").length} verified by staff
          </div>
        </div>
      </div>

      <CheckButton studentId={studentId} hasDocs={docs.length > 0} />

      {check && (check.missing.length > 0 || check.issues.length > 0) && (
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-wash/60 px-5 py-3">
            <h2 className="h-tight text-[15px]">What this file still needs</h2>
          </div>
          {check.summary && (
            <p className="border-b border-line px-5 py-4 text-[14px] leading-relaxed text-ink">{check.summary}</p>
          )}
          {check.missing.length > 0 && (
            <div className="border-b border-line px-5 py-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Missing</h3>
              <ul className="mt-2.5 flex flex-col gap-3">
                {check.missing.map((m, i) => (
                  <li key={i}>
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityChip severity={m.severity} />
                      <span className="h-tight text-[14px]">{m.label}</span>
                    </div>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{m.why}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {check.issues.length > 0 && (
            <div className="px-5 py-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Doesn't add up</h3>
              <ul className="mt-2.5 flex flex-col gap-3">
                {check.issues.map((m, i) => (
                  <li key={i} className="flex gap-2.5">
                    <SeverityChip severity={m.severity} />
                    <p className="text-[13.5px] leading-relaxed text-ink-2">{m.issue}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="border-t border-line bg-wash/40 px-5 py-3 text-[12px] leading-relaxed text-muted">
            This check reasons about which documents are present and whether they agree with the
            profile. It does not read inside the files, and it is not a substitute for your
            counsellor's eyes.
          </p>
        </Card>
      )}

      <UploadPanel studentId={studentId} required={required.map((k) => ({ id: k.id, label: k.label, sensitive: k.sensitive }))} />

      {CATEGORIES.map((category) => {
        const kinds = required.filter((k) => k.category === category);
        if (!kinds.length) return null;
        return (
          <Card key={category} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-wash/60 px-5 py-3">
              <h2 className="h-tight text-[15px]">{category}</h2>
              <span className="num text-[12px] text-muted">
                {kinds.filter((k) => byKind.has(k.id)).length} / {kinds.length}
              </span>
            </div>
            <ul className="divide-y divide-line">
              {kinds.map((k) => (
                <DocRowItem
                  key={k.id}
                  kind={{ id: k.id, label: k.label, hint: k.hint, sensitive: k.sensitive }}
                  doc={byKind.get(k.id) ? {
                    id: byKind.get(k.id)!.id,
                    filename: byKind.get(k.id)!.filename,
                    bytes: byKind.get(k.id)!.bytes,
                    status: byKind.get(k.id)!.status,
                    note: byKind.get(k.id)!.note,
                    expires_at: byKind.get(k.id)!.expires_at,
                    keep: byKind.get(k.id)!.keep === 1,
                    created_at: byKind.get(k.id)!.created_at,
                  } : null}
                  staff={staff}
                />
              ))}
            </ul>
          </Card>
        );
      })}

      <p className="text-[12px] leading-relaxed text-muted">
        Files are stored on the server, never on a public address, and every time one is opened it
        is written to an access log. Documents marked sensitive, passports, citizenship, and
        everything financial, are deleted {RETENTION_DAYS} days after upload unless kept
        deliberately.
      </p>
    </div>
  );
}
