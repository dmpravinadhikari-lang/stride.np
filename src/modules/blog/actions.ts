"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth/guard";
import { deletePostFile, patchFrontMatter, readPost } from "@/lib/blog";
import { generateDraft } from "@/modules/blog/generate";
import { saveDraft } from "@/modules/blog/save";
import { addTopic, deleteTopic, getTopic, markTopic } from "@/modules/blog/topics";

export type BlogState = { ok: boolean; message?: string };
const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();

function refresh(slug?: string) {
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  revalidatePath("/app/admin/blog");
  if (slug) {
    revalidatePath(`/blog/${slug}`);
    revalidatePath(`/app/admin/blog/${slug}`);
  }
}

// ------------------------------------------------------------------ topics
export async function queueTopic(formData: FormData) {
  await requireCapability("platform:admin");
  const title = clean(formData.get("title"));
  if (title.length < 5) return;
  addTopic(
    title,
    clean(formData.get("angle")) || "Answer it plainly for a Nepali student.",
    clean(formData.get("category")) || "Applying",
  );
  refresh();
}

export async function removeTopic(formData: FormData) {
  await requireCapability("platform:admin");
  deleteTopic(clean(formData.get("id")));
  refresh();
}

// ------------------------------------------------------------------ drafts
export async function draftNow(_prev: BlogState, formData: FormData): Promise<BlogState> {
  const { scope } = await requireCapability("platform:admin");
  const topicId = clean(formData.get("topic_id"));
  const topic = topicId ? getTopic(topicId) : null;
  if (!topic) return { ok: false, message: "That topic is no longer in the queue." };

  let slug: string;
  try {
    const draft = await generateDraft(scope, topic);
    if (!draft.title || draft.markdown.length < 600) {
      return { ok: false, message: "The generator returned nothing usable. Try again, or sharpen the angle." };
    }
    slug = saveDraft(draft);
    markTopic(topic.id, "drafted");
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
  refresh(slug);
  redirect(`/app/admin/blog/${slug}`);
}

// ------------------------------------------------------------------ review
export async function saveMeta(formData: FormData) {
  await requireCapability("platform:admin");
  const slug = clean(formData.get("slug"));
  if (!readPost(slug)) return;
  patchFrontMatter(slug, {
    title: clean(formData.get("title")),
    metaTitle: clean(formData.get("meta_title")),
    metaDescription: clean(formData.get("meta_description")),
    category: clean(formData.get("category")),
    readingTime: clean(formData.get("reading_time")),
    author: clean(formData.get("author")) || "OfficeYak",
    reviewedBy: clean(formData.get("reviewed_by")) || "",
  });
  refresh(slug);
}

export async function approvePost(formData: FormData) {
  const { user } = await requireCapability("platform:admin");
  const slug = clean(formData.get("slug"));
  const when = clean(formData.get("publish_at"));
  if (!readPost(slug)) return;

  patchFrontMatter(slug, {
    status: when ? "scheduled" : "published",
    publishAt: when ? new Date(when).toISOString() : undefined,
    // Approval is a real editorial act, so it is recorded against a person.
    reviewedBy: clean(formData.get("reviewed_by")) || user.fullName,
    reviewedOn: new Date().toISOString().slice(0, 10),
  });
  refresh(slug);
}

export async function unpublishPost(formData: FormData) {
  await requireCapability("platform:admin");
  const slug = clean(formData.get("slug"));
  patchFrontMatter(slug, { status: "draft", publishAt: undefined });
  refresh(slug);
}

export async function removePost(formData: FormData) {
  await requireCapability("platform:admin");
  deletePostFile(clean(formData.get("slug")));
  refresh();
  redirect("/app/admin/blog");
}
