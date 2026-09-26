import { requirePermission } from "@/lib/auth/current";
import { all, scalar } from "@/lib/db";
import { PageHeader, Panel, Chip, Card } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { recentAudit } from "@/lib/security/audit";
import { whenText } from "@/lib/dates";
import { POSITIONS, positionOf, defaultPositionFor } from "@/lib/auth/positions";
import Link from "next/link";

export const metadata = { title: "Security, Stride" };
export const dynamic = "force-dynamic";

/**
 * What is protecting this consultancy's data, said plainly, with evidence.
 *
 * Every product claims to be secure on its pricing page. The claim is worth
 * something only if the owner can see the mechanism working on their own
 * data: who holds a key to what, what was opened this week, how many places
 * each account is signed in. So this screen is half statement and half log,
 * and the log is the half that matters.
 */
export default async function SecurityPage() {
  const user = await requirePermission("audit:view");

  const trail = recentAudit(user.tenantId, 40);
  const staff = all<{ id: string; full_name: string; role: string; position: string | null }>(
    `SELECT id, full_name, role, position FROM users
      WHERE tenant_id = ? AND role <> 'student' AND active = 1`,
    user.tenantId,
  );
  const sessions = scalar(
    `SELECT COUNT(*) FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE u.tenant_id = ? AND s.expires_at > ?`,
    user.tenantId, new Date().toISOString(),
  );
  const documents = scalar("SELECT COUNT(*) FROM documents WHERE tenant_id = ?", user.tenantId);
  const withPay = staff.filter((p) =>
    positionOf(p.position ?? defaultPositionFor(p.role)).grants.includes("payroll:run"),
  );
  const withDocs = staff.filter((p) =>
    positionOf(p.position ?? defaultPositionFor(p.role)).grants.includes("students:documents"),
  );

  const facts: Array<{ icon: IconName; title: string; body: string; tint: string; ink: string }> = [
    {
      icon: "lock", title: "Documents are sealed on disk",
      body: `${documents === 0 ? "Every document uploaded is" : `All ${documents} files are`} encrypted with AES-256 before ${documents === 0 ? "it touches" : "they touch"} the server's disk, under a key held in the environment and not beside the data. A stolen backup is ciphertext.`,
      tint: "bg-tint-sky", ink: "text-tint-sky-ink",
    },
    {
      icon: "people", title: "One consultancy cannot see another",
      body: "Every query in the product is written against a scope that carries your consultancy's id. It is not a filter a screen chooses to apply; it is how the data is read at all.",
      tint: "bg-tint-lilac", ink: "text-tint-lilac-ink",
    },
    {
      icon: "user", title: "Passwords are never stored",
      body: "Only a scrypt hash with a per-account salt. Changing a password signs out every other device, and nobody here can read yours, including us.",
      tint: "bg-tint-mint", ink: "text-tint-mint-ink",
    },
    {
      icon: "file", title: "Private screens are recorded",
      body: "Opening payroll or a student's document is written to the trail below, with who did it and when. Nothing in Stride deletes from that trail.",
      tint: "bg-tint-amber", ink: "text-tint-amber-ink",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Security"
        sub="What protects your students' information, and what has been opened lately."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {facts.map((f) => (
          <Card key={f.title} className="flex gap-3 p-5">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${f.tint} ${f.ink}`}>
              <Icon name={f.icon} size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-[14.5px] font-semibold text-ink">{f.title}</span>
              <span className="mt-1 block text-[13px] leading-snug text-muted">{f.body}</span>
            </span>
          </Card>
        ))}
      </div>

      {/* --------------------------------------------------------- the keys */}
      <Panel
        title="Who holds a key"
        note="The two things worth checking every month."
        actions={
          <Link
            href="/app/access"
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-line-2 px-3.5 text-[13px] font-semibold text-ink-2 hover:bg-wash"
          >
            Change who can do what <Icon name="arrow" size={14} />
          </Link>
        }
      >
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
          <div>
            <div className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">Can open payroll</div>
            <div className="num mt-1 text-[24px] font-semibold text-ink">{withPay.length}</div>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {withPay.map((p) => <li key={p.id}><Chip tone="gold">{p.full_name}</Chip></li>)}
            </ul>
          </div>
          <div>
            <div className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">Can open documents</div>
            <div className="num mt-1 text-[24px] font-semibold text-ink">{withDocs.length}</div>
            <p className="mt-1.5 text-[12.5px] leading-snug text-muted">
              Passports, bank letters and transcripts. Everybody else is refused by the server, not
              just left without a link.
            </p>
          </div>
          <div>
            <div className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">Signed in now</div>
            <div className="num mt-1 text-[24px] font-semibold text-ink">{sessions}</div>
            <p className="mt-1.5 text-[12.5px] leading-snug text-muted">
              Live sessions across your staff. Anybody can end their own others from their account
              page; a password change ends them all.
            </p>
          </div>
        </div>
      </Panel>

      {/* -------------------------------------------------------- the trail */}
      <Panel title="What has been opened" note="Payroll, documents and changes to access. Newest first.">
        {trail.length === 0 ? (
          <p className="px-5 py-5 text-[13.5px] text-muted">
            Nothing recorded yet. This fills as your office works.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {trail.map((t) => (
              <li key={t.id} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 px-5 py-2.5">
                <Chip tone={t.action.startsWith("payroll") ? "gold" : t.action.startsWith("access") ? "lilac" : "sky"}>
                  {t.action.replace(".", " ")}
                </Chip>
                <span className="min-w-0 flex-1 text-[13.5px] text-ink">
                  <span className="font-medium">{t.actor_name ?? "The system"}</span>
                  {t.subject_name ? <> · {t.subject_name}</> : null}
                  {t.detail ? <span className="text-muted"> · {t.detail}</span> : null}
                </span>
                <span className="shrink-0 text-[12px] text-muted">{whenText(t.created_at.slice(0, 10))}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Card className="p-5">
        <h2 className="h-tight text-[15px]">What we ask of you</h2>
        <ul className="mt-2.5 flex flex-col gap-2 text-[13.5px] leading-snug text-ink-2">
          <li className="flex gap-2.5">
            <Icon name="check" size={16} className="mt-0.5 shrink-0 text-teal-700" />
            Give each person the position they actually hold. Most breaches in an office are
            somebody having a key they were never meant to be given.
          </li>
          <li className="flex gap-2.5">
            <Icon name="check" size={16} className="mt-0.5 shrink-0 text-teal-700" />
            Switch an account off the day somebody leaves. Their sessions end with it.
          </li>
          <li className="flex gap-2.5">
            <Icon name="check" size={16} className="mt-0.5 shrink-0 text-teal-700" />
            Never share one login between a desk. The trail above is only worth reading when each
            name is one person.
          </li>
          <li className="flex gap-2.5">
            <Icon name="check" size={16} className="mt-0.5 shrink-0 text-teal-700" />
            Use the front desk clock rather than passing a password around the counter.
          </li>
        </ul>
      </Card>

      <p className="text-[12.5px] text-muted">
        {POSITIONS.length} positions are available, each with its own set of permissions. Nothing
        about your consultancy is visible to another consultancy on Stride.
      </p>
    </div>
  );
}
