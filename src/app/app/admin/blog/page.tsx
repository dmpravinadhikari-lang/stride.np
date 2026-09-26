import Link from "next/link";
import { requireCapability } from "@/lib/auth/guard";
import { everyPost, isLive } from "@/lib/blog";
import { allTopics } from "@/modules/blog/topics";
import { queueTopic, removeTopic } from "@/modules/blog/actions";
import { DraftNow } from "./draft-now";
import { Button, Card, Chip, Field, inputClass, StatTile, type Tone } from "@/components/ui";

export const metadata = { title: "Blog, Stride" };
export const dynamic = "force-dynamic";

export default async function BlogAdmin() {
  await requireCapability("platform:admin");
  const posts = everyPost();
  const topics = allTopics();

  const drafts = posts.filter((p) => p.status === "draft");
  const scheduled = posts.filter((p) => p.status === "scheduled");
  const live = posts.filter(isLive);
  const queued = topics.filter((t) => t.status === "queued");

  const label = (p: (typeof posts)[number]): { text: string; tone: Tone } => {
    if (p.status === "draft") return { text: "Awaiting review", tone: "gold" };
    if (p.status === "scheduled") {
      return isLive(p)
        ? { text: "Live", tone: "teal" }
        : { text: `Scheduled ${p.publishAt ? new Date(p.publishAt).toLocaleDateString() : ""}`, tone: "brand" };
    }
    return { text: "Live", tone: "teal" };
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href="/app/admin" className="inline-flex min-h-[40px] items-center text-[12.5px] font-semibold text-muted hover:text-brand-600">← Admin console</Link>
        <h1 className="display mt-1.5 text-[28px]">Blog</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Posts are markdown files in <code className="rounded bg-wash px-1.5 py-0.5 text-[13px]">content/blog</code>.
          A draft is written from the topic queue every three days and waits here. Nothing goes
          public until you have read it and pressed publish.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Awaiting review" value={drafts.length} tone={drafts.length ? "gold" : "teal"} sub="drafts to read" />
        <StatTile label="Scheduled" value={scheduled.filter((p) => !isLive(p)).length} sub="going out on a date" />
        <StatTile label="Live" value={live.length} sub="on the public site" tone="teal" />
        <StatTile label="Topics queued" value={queued.length} sub="fuel for the generator" />
      </div>

      <DraftNow topics={queued.map((t) => ({ id: t.id, title: t.title }))} />

      <section>
        <h2 className="h-tight text-[17px]">Posts</h2>
        <div className="mt-3 flex flex-col gap-2">
          {posts.length === 0 && <Card className="px-5 py-8 text-center text-[14px] text-muted">No posts yet.</Card>}
          {posts.map((p) => {
            const l = label(p);
            return (
              <Link key={p.slug} href={`/app/admin/blog/${p.slug}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-panel px-5 py-4 hover:border-brand-400">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14.5px] font-semibold text-ink">{p.title}</span>
                    <Chip tone={l.tone}>{l.text}</Chip>
                    {p.author === "Stride" && <Chip tone="grey">AI draft</Chip>}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-muted">
                    {p.category} · {p.readingTime} · updated {p.updatedOn} · reviewed by {p.reviewedBy}
                  </div>
                </div>
                <span className="shrink-0 text-[12.5px] font-semibold text-brand-600">Review →</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="h-tight text-[17px]">Topic queue</h2>
        <p className="mt-1 text-[13px] text-muted">
          The generator takes the oldest queued topic each run. Keep a few ahead of it.
        </p>
        <Card className="mt-3 p-5">
          <form action={queueTopic} className="grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Field label="Topic" name="title">
                <input id="title" name="title" required className={inputClass} placeholder="Cost of living in Sydney for a Nepali student" />
              </Field>
            </div>
            <Field label="Category" name="category">
              <select id="category" name="category" className={inputClass} defaultValue="Money">
                {["Australia", "UK", "Canada", "USA", "Money", "Tests", "Visa", "Applying", "Choosing"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <div className="flex items-end"><Button type="submit">Add to queue</Button></div>
            <div className="sm:col-span-4">
              <Field label="Angle" name="angle" hint="What this piece should argue, so two topics do not become the same article.">
                <input id="angle" name="angle" className={inputClass} placeholder="Real monthly figures in NPR, and why the visa figure is lower than the truth" />
              </Field>
            </div>
          </form>
        </Card>

        {topics.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {topics.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-ink">{t.title}</span>
                    <Chip tone={t.status === "queued" ? "brand" : t.status === "done" ? "teal" : "grey"}>{t.status}</Chip>
                  </div>
                  <p className="text-[12.5px] text-muted">{t.angle}</p>
                </div>
                <form action={removeTopic}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="text-[12px] font-semibold text-muted hover:text-danger-600">Remove</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
