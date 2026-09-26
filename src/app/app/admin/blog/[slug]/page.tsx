import Link from "next/link";
import "@/app/blog/blog.css";
import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth/guard";
import { isLive, readPost } from "@/lib/blog";
import { approvePost, removePost, saveMeta, unpublishPost } from "@/modules/blog/actions";
import { Alert, Button, Card, Chip, Field, inputClass, type Tone } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ReviewPost({ params }: { params: Promise<{ slug: string }> }) {
  await requireCapability("platform:admin");
  const { slug } = await params;
  const post = readPost(slug);
  if (!post) notFound();

  const live = isLive(post);
  const badge: { text: string; tone: Tone } =
    post.status === "draft" ? { text: "Awaiting review", tone: "gold" }
    : live ? { text: "Live", tone: "teal" }
    : { text: `Scheduled ${post.publishAt ? new Date(post.publishAt).toLocaleDateString() : ""}`, tone: "brand" };

  const aiDrafted = post.author === "OfficeYak";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/app/admin/blog" className="inline-flex min-h-[40px] items-center text-[12.5px] font-semibold text-muted hover:text-brand-600">← All posts</Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <h1 className="display text-[26px]">{post.title}</h1>
            <Chip tone={badge.tone}>{badge.text}</Chip>
            {aiDrafted && <Chip tone="grey">AI draft</Chip>}
          </div>
          <p className="mt-1.5 text-[13.5px] text-muted">
            content/blog/{post.slug}.md · {post.category} · {post.readingTime}
          </p>
        </div>
        {live && (
          <Link href={`/blog/${post.slug}`} target="_blank"
            className="rounded-full border border-line-2 px-4 py-2 text-[13px] font-semibold text-ink-2 hover:border-brand-400 hover:text-brand-600">
            View on the site ↗
          </Link>
        )}
      </header>

      {aiDrafted && post.status === "draft" && (
        <Alert tone="gold" title="Check every figure before this goes out">
          Written by the AI from a topic line. It was instructed never to invent a threshold, but
          the only thing between a wrong number and a family acting on it is you reading this.
          Pay particular attention to amounts, deadlines and percentages, and check each source
          below actually says what the post claims.
        </Alert>
      )}

      <Card className="p-5">
        <h2 className="h-tight text-[16px]">Front matter</h2>
        <form action={saveMeta} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="slug" value={post.slug} />
          <div className="sm:col-span-2">
            <Field label="Title" name="title">
              <input id="title" name="title" defaultValue={post.title} className={inputClass} />
            </Field>
          </div>
          <Field label="Meta title" name="meta_title" hint="Under 60 characters.">
            <input id="meta_title" name="meta_title" defaultValue={post.metaTitle} className={inputClass} />
          </Field>
          <Field label="Category" name="category">
            <input id="category" name="category" defaultValue={post.category} className={inputClass} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Meta description" name="meta_description" hint="Under 160 characters. This is what appears under the blue link.">
              <textarea id="meta_description" name="meta_description" rows={2} defaultValue={post.metaDescription} className={inputClass} />
            </Field>
          </div>
          <Field label="Author" name="author">
            <input id="author" name="author" defaultValue={post.author} className={inputClass} />
          </Field>
          <Field label="Reviewed by" name="reviewed_by" hint="A real person. This is published on the post.">
            <input id="reviewed_by" name="reviewed_by" defaultValue={post.reviewedBy} className={inputClass} />
          </Field>
          <Field label="Reading time" name="reading_time">
            <input id="reading_time" name="reading_time" defaultValue={post.readingTime} className={inputClass} />
          </Field>
          <div className="flex items-end"><Button type="submit" variant="secondary">Save front matter</Button></div>
        </form>
        <p className="mt-3 border-t border-line pt-3 text-[12.5px] leading-relaxed text-muted">
          The body is edited in the markdown file itself. If a draft's body is wrong, fix it there
          or delete the draft, do not publish around it.
        </p>
      </Card>

      {post.sources.length > 0 && (
        <Card className="p-5">
          <h2 className="h-tight text-[16px]">Sources to verify</h2>
          <p className="mt-1 text-[13px] text-muted">Open each one and confirm it says what the post claims.</p>
          <ul className="mt-3 flex flex-col gap-2">
            {post.sources.map((s) => (
              <li key={s.url} className="flex flex-wrap items-center gap-2 text-[13.5px]">
                <a href={s.url} target="_blank" rel="noreferrer" className="font-semibold text-brand-600 hover:underline">{s.label} ↗</a>
                <span className="truncate text-[12px] text-muted">{s.url}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-line bg-wash/60 px-5 py-3">
          <h2 className="h-tight text-[15px]">Read it as a reader would</h2>
        </div>
        <div className="px-5 py-6 sm:px-8">
          <p className="text-[17px] leading-relaxed text-ink-2">{post.metaDescription}</p>
          <div className="prose-officeyak mt-7" dangerouslySetInnerHTML={{ __html: post.html }} />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="h-tight text-[16px]">Decision</h2>
        <form action={approvePost} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="slug" value={post.slug} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Publish on" name="publish_at" hint="Leave blank to publish immediately.">
              <input id="publish_at" name="publish_at" type="datetime-local"
                defaultValue={post.publishAt ? post.publishAt.slice(0, 16) : ""} className={inputClass} />
            </Field>
            <Field label="Reviewed by" name="reviewed_by" hint="Recorded on the post and in its schema.">
              <input id="reviewed_by" name="reviewed_by" defaultValue={post.reviewedBy} className={inputClass} />
            </Field>
          </div>
          <div>
            <Button type="submit">{live ? "Update and keep live" : "Approve and publish"}</Button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          {post.status !== "draft" && (
            <form action={unpublishPost}>
              <input type="hidden" name="slug" value={post.slug} />
              <button type="submit" className="rounded-[10px] border border-line-2 px-4 py-2 text-[13px] font-semibold text-ink-2 hover:border-gold-600/50 hover:text-gold-600">
                Take it down
              </button>
            </form>
          )}
          <form action={removePost}>
            <input type="hidden" name="slug" value={post.slug} />
            <button type="submit" className="rounded-full px-4 py-2 text-[13px] font-semibold text-muted hover:text-danger-600">
              Delete the file
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}
