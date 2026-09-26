import Link from "next/link";
import { Icon } from "@/components/Icon";
import { requireScope } from "@/lib/auth/current";
import {
  listAttempts, paperQuestionCount, publishedPapers, sectionsOf,
  SECTION_LABEL, type SectionKind,
} from "@/modules/mock-tests/data";
import { startMock } from "@/modules/mock-tests/actions";
import { bandTone, showBand } from "@/modules/mock-tests/bands";
import { isStaff } from "@/lib/auth/roles";
import { Button, Card, Chip, Empty, StatTile } from "@/components/ui";
import { requireModule } from "@/lib/auth/module-guard";

export const metadata = { title: "IELTS & PTE Mocks, Stride" };

const MINUTES = (s: number) => Math.round(s / 60);

export default async function MockTestsPage() {
  // Entitlement check before anything is read or billed.
  await requireModule("mock-tests");
  const { user, scope } = await requireScope();
  const papers = publishedPapers();
  const attempts = listAttempts(scope);

  const completed = attempts.filter((a) => a.status === "complete" && a.overall_band !== null);
  const best = completed.reduce<number>((b, a) => Math.max(b, a.overall_band ?? 0), 0);
  const latest = completed[0]?.overall_band ?? null;
  const trend = completed.length >= 2 && completed[0].overall_band !== null && completed[1].overall_band !== null
    ? completed[0].overall_band - completed[1].overall_band
    : null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="display text-[28px]">IELTS &amp; PTE Mocks</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Timed, and honest about the band it gives you. Listening and Reading marked instantly;
          Writing and Speaking scored against the four official criteria, with your own sentences
          quoted back at you.
        </p>
      </header>

      {completed.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Latest overall" value={showBand(latest)} sub={`${completed.length} completed`} tone={bandTone(latest)} />
          <StatTile label="Best overall" value={showBand(best)} sub="across all attempts" tone={bandTone(best)} />
          <StatTile
            label="Change" tone={trend === null ? "grey" : trend >= 0 ? "teal" : "danger"}
            value={trend === null ? "Not yet" : `${trend >= 0 ? "+" : ""}${trend.toFixed(1)}`}
            sub={trend === null ? "Sit another to compare" : "since your previous attempt"}
          />
        </div>
      )}

      {papers.length === 0 ? (
        <Empty icon={<Icon name="file" size={22} />} title="No papers published yet">
          A paper has to be reviewed by a trainer before students can sit it.
        </Empty>
      ) : papers.map((paper) => {
        const sections = sectionsOf(paper.id);
        const totalMinutes = MINUTES(sections.reduce((sum, s) => sum + s.seconds, 0));
        return (
          <Card key={paper.id} className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-wash/60 px-5 py-4">
              <div>
                <h2 className="h-tight text-[17px]">{paper.title}</h2>
                <p className="mt-1 text-[13px] text-muted">{paper.blurb}</p>
              </div>
              <div className="flex items-center gap-2">
                <Chip tone="grey">{paperQuestionCount(paper.id)} questions</Chip>
                <Chip tone="grey">{totalMinutes} min</Chip>
                {isStaff(user.role) && (
                  <Link href={`/app/mock-tests/bank/${paper.id}`} className="rounded-full px-3 py-1 text-[12px] font-semibold text-brand-600 hover:underline">
                    Review bank →
                  </Link>
                )}
              </div>
            </div>

            <div className="px-5 py-5">
              <form action={startMock} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="paper_id" value={paper.id} />
                <Button type="submit" size="md">Sit the full mock (10 credits)</Button>
                <span className="text-[13px] text-muted">or practise one section:</span>
              </form>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {sections.map((s) => (
                  <form key={s.id} action={startMock}>
                    <input type="hidden" name="paper_id" value={paper.id} />
                    <input type="hidden" name="only_kind" value={s.kind} />
                    <button
                      type="submit"
                      className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-left transition-colors hover:border-brand-400"
                    >
                      <div className="text-[14px] font-semibold text-ink">{SECTION_LABEL[s.kind as SectionKind]}</div>
                      <div className="mt-0.5 text-[12px] text-muted">
                        {MINUTES(s.seconds)} min ·{" "}
                        {s.kind === "listening" || s.kind === "reading" ? "marked instantly" : "AI scored"}
                      </div>
                    </button>
                  </form>
                ))}
              </div>

              <p className="mt-4 text-[12px] leading-relaxed text-muted">
                Trainer-reviewed practice material. Bands are indicative, not an official IELTS
                result, and this paper is shorter than a full test, one listening section and one
                reading passage.
              </p>
            </div>
          </Card>
        );
      })}

      <section>
        <h2 className="h-tight text-[17px]">Your attempts</h2>
        {attempts.length === 0 ? (
          <div className="mt-3">
            <Empty icon={<Icon name="clock" size={22} />} title="Nothing sat yet">
              Start with one section rather than the full mock. Reading is the fastest way to find
              out where you actually are.
            </Empty>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {attempts.map((a) => (
              <Link key={a.id} href={`/app/mock-tests/${a.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-line bg-panel px-4 py-3.5 hover:border-brand-400">
                <div className="min-w-0">
                  <div className="truncate text-[14.5px] font-semibold text-ink">
                    {a.paper_title}
                    {a.only_kind && <span className="text-muted"> · {SECTION_LABEL[a.only_kind as SectionKind]} only</span>}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-muted">
                    {a.mode === "full" ? "Full mock" : "Sectional practice"} · {new Date(a.started_at).toLocaleString()}
                  </div>
                </div>
                {a.status === "complete"
                  ? <Chip tone={bandTone(a.overall_band)}>Band {showBand(a.overall_band)}</Chip>
                  : <Chip tone="gold">In progress</Chip>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
