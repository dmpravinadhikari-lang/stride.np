import { requireScope } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/roles";
import { listPipeline } from "@/modules/pipeline/data";
import { linksFor } from "@/modules/parents/data";
import { one } from "@/lib/db";
import { ParentLinks } from "./links";
import { Alert } from "@/components/ui";
import { requireModule } from "@/lib/auth/module-guard";

export const metadata = { title: "Parent View" };

export default async function ParentsPage({
  searchParams,
}: { searchParams: Promise<{ student?: string }> }) {
  // Entitlement check before anything is read or billed.
  await requireModule("parent-portal");
  const { user, scope } = await requireScope();
  const staff = isStaff(user.role);

  const students = staff
    ? listPipeline(scope).map((s) => ({ id: s.student_id, name: s.full_name }))
    : [{ id: user.id, name: user.fullName }];

  const { student } = await searchParams;
  const selected = staff ? (student && students.some((s) => s.id === student) ? student : students[0]?.id) : user.id;
  const selectedName = students.find((s) => s.id === selected)?.name ?? user.fullName;

  const links = selected ? linksFor(scope, selected).map((l) => ({
    id: l.id, token: l.token, parentName: l.parent_name, relation: l.relation,
    hasCode: Boolean(l.code_hash), views: l.view_count,
    lastViewed: l.last_viewed_at, createdAt: l.created_at,
  })) : [];

  const tenantName = one<{ name: string }>("SELECT name FROM tenants WHERE id = ?", scope.tenantId)?.name ?? "";

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[28px]">Parent View</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          {staff
            ? "A progress page you can send to the parents paying the fees. No account, no password, a link they open on their phone."
            : "Share your progress with your parents. They get a page showing where your application stands and what it costs. They cannot see your documents, your statement, or anything you have written."}
        </p>
      </header>

      <Alert tone="brand" title="What a parent can and cannot see">
        They see the stage, what is outstanding, the scores and the money, total cost, what is due
        before departure, and the balance the embassy requires. Never a document, a statement, or
        an interview transcript.
      </Alert>

      <ParentLinks
        staff={staff}
        students={students}
        selected={selected ?? ""}
        selectedName={selectedName}
        tenantName={tenantName}
        links={links}
      />
    </div>
  );
}
