import Link from "next/link";
import { redirect } from "next/navigation";
import { requireScope } from "@/lib/auth/current";
import { can } from "@/lib/auth/access";
import { isStaff } from "@/lib/auth/roles";
import { listPipeline } from "@/modules/pipeline/data";
import { documentCount, latestCheck } from "@/modules/documents/data";
import { stageOf } from "@/modules/pipeline/stages";
import { country } from "@/lib/countries";
import { Card, Chip, Empty, Meter, PageHeader, type Tone } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { requireModule } from "@/lib/auth/module-guard";

export const metadata = { title: "Document Vault, OfficeYak" };

export default async function DocumentsIndex() {
  // Entitlement check before anything is read or billed.
  await requireModule("documents");
  const { user, scope } = await requireScope();
  // A receptionist has no business in here, whatever link they were sent.
  if (user.role !== "student" && !can(user, "students:documents")) redirect("/app");
  // A student has exactly one vault: their own.
  if (!isStaff(user.role)) redirect(`/app/documents/${user.id}`);

  const students = listPipeline(scope);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Documents"
        sub="Every student's paperwork, and how close their file is to being submittable."
      />

      {students.length === 0 ? (
        <Empty icon={<Icon name="folder" size={22} />} title="No students yet">
          A vault is made for each student when you add them.
        </Empty>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {students.map((s) => {
              const count = documentCount(scope, s.student_id);
              const check = latestCheck(scope, s.student_id);
              const st = stageOf(s.stage);
              return (
                <li key={s.student_id}>
                  <Link href={`/app/documents/${s.student_id}`} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-wash/40">
                    <div className="min-w-0">
                      <div className="text-[14.5px] font-semibold text-ink">{s.full_name}</div>
                      <div className="mt-0.5 text-[12.5px] text-muted">
                        {s.target_country ? `${country(s.target_country).flag} ${country(s.target_country).name} · ` : ""}
                        {count} document{count === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {check && (
                        <div className="w-28">
                          <div className="num text-right text-[12px] text-muted">{check.readiness}% ready</div>
                          <div className="mt-1">
                            <Meter value={check.readiness} tone={check.readiness >= 80 ? "teal" : check.readiness >= 50 ? "gold" : "danger"} />
                          </div>
                        </div>
                      )}
                      <Chip tone={st.tone as Tone}>{st.label}</Chip>
                      <Icon name="arrow" size={16} className="text-muted" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
