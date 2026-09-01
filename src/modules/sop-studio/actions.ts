"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireScope } from "@/lib/auth/current";
import { runAiJson } from "@/lib/ai/run";
import { creditsFor } from "@/lib/modules/registry";
import { OutOfCreditsError } from "@/lib/usage";
import { getProfile, profileBrief } from "@/lib/profile";
import { country } from "@/lib/countries";
import {
  acknowledgeRisk, addVersion, bodyToSections, createDoc, deleteDoc, getDoc,
  latestVersion, saveReview, sectionsToBody,
} from "@/modules/sop-studio/data";
import { draftSystem, reviewSystem, reviseSystem } from "@/modules/sop-studio/prompts";
import { EMPTY_REVIEW, type SopDraft, type SopReview } from "@/modules/sop-studio/types";

export type ActionState = { ok: boolean; message?: string };
const MODULE = "sop-studio";

/** Turns any failure into something a student can act on. */
function explain(error: unknown): string {
  if (error instanceof OutOfCreditsError) return error.message;
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("Could not run") || msg.includes("Claude CLI failed")) {
    return `The AI engine did not respond. ${msg}`;
  }
  return `Something went wrong: ${msg}`;
}

export async function createSopDoc(formData: FormData) {
  const { scope } = await requireScope();
  const countryCode = String(formData.get("country") || "AU");
  const docType = String(formData.get("doc_type") || "sop");
  const title = String(formData.get("title") || "").trim() ||
    `${country(countryCode).name} statement`;
  const id = createDoc(scope, {
    title, country: countryCode, docType,
    university: String(formData.get("university") || ""),
    course: String(formData.get("course") || ""),
  });
  revalidatePath("/app/sop");
  redirect(`/app/sop/${id}`);
}

export async function removeSopDoc(formData: FormData) {
  const { scope } = await requireScope();
  deleteDoc(scope, String(formData.get("id")));
  revalidatePath("/app/sop");
  redirect("/app/sop");
}

export async function ackRisk(formData: FormData) {
  const { scope } = await requireScope();
  const id = String(formData.get("id"));
  acknowledgeRisk(scope, id);
  revalidatePath(`/app/sop/${id}`);
}

export async function generateDraft(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, scope } = await requireScope();
  const id = String(formData.get("id"));
  const doc = getDoc(scope, id);
  if (!doc) return { ok: false, message: "That document no longer exists." };

  const profile = getProfile(scope.userId);
  const extra = String(formData.get("notes") || "").trim();

  try {
    const draft = await runAiJson<SopDraft>(
      scope,
      {
        module: MODULE, action: "sop.draft", tier: "smart", maxTokens: 4000,
        system: draftSystem(doc.country, doc.doc_type),
        prompt:
          `STUDENT PROFILE\n${profileBrief(profile, user.fullName)}\n\n` +
          `TARGET\nUniversity: ${doc.university || "not decided"}\nCourse: ${doc.course || profile?.intended_course || "not decided"}\n\n` +
          (extra ? `THE STUDENT ALSO WANTS INCLUDED\n${extra}\n\n` : "") +
          `Write the ${country(doc.country).statement}.`,
      },
      creditsFor(MODULE, "draft"),
      { sections: [], warnings: [] },
    );

    if (!draft.sections?.length) {
      return { ok: false, message: "The AI engine returned nothing usable. Try again." };
    }
    addVersion(scope, id, sectionsToBody(draft.sections), "ai_draft", "Generated from your profile");
    revalidatePath(`/app/sop/${id}`);
    return { ok: true, message: "Draft written. Read the warnings before you touch a word of it." };
  } catch (error) {
    return { ok: false, message: explain(error) };
  }
}

export async function saveEdit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { scope } = await requireScope();
  const id = String(formData.get("id"));
  const body = String(formData.get("body") || "").trim();
  if (!getDoc(scope, id)) return { ok: false, message: "That document no longer exists." };
  if (body.length < 40) return { ok: false, message: "That is too short to save as a version." };
  addVersion(scope, id, body, "student_edit", "Your edit");
  revalidatePath(`/app/sop/${id}`);
  return { ok: true, message: "Saved as a new version." };
}

export async function reviewDoc(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, scope } = await requireScope();
  const id = String(formData.get("id"));
  const doc = getDoc(scope, id);
  if (!doc) return { ok: false, message: "That document no longer exists." };
  const version = latestVersion(scope, id);
  if (!version) return { ok: false, message: "Write or paste a statement first." };

  try {
    const review = await runAiJson<SopReview>(
      scope,
      {
        module: MODULE, action: "sop.review", tier: "smart", maxTokens: 3000,
        system: reviewSystem(doc.country),
        prompt:
          `STUDENT PROFILE\n${profileBrief(getProfile(scope.userId), user.fullName)}\n\n` +
          `STATEMENT TO ASSESS\n${version.body}`,
      },
      creditsFor(MODULE, "review"),
      EMPTY_REVIEW,
    );
    saveReview(scope, id, version.id, review);
    revalidatePath(`/app/sop/${id}`);
    return { ok: true, message: `Scored ${Math.round(review.overall)} out of 100.` };
  } catch (error) {
    return { ok: false, message: explain(error) };
  }
}

export async function reviseDoc(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, scope } = await requireScope();
  const id = String(formData.get("id"));
  const doc = getDoc(scope, id);
  if (!doc) return { ok: false, message: "That document no longer exists." };
  const version = latestVersion(scope, id);
  if (!version) return { ok: false, message: "There is nothing to revise yet." };

  try {
    const draft = await runAiJson<SopDraft>(
      scope,
      {
        module: MODULE, action: "sop.revise", tier: "smart", maxTokens: 4000,
        system: reviseSystem(doc.country),
        prompt:
          `STUDENT PROFILE\n${profileBrief(getProfile(scope.userId), user.fullName)}\n\n` +
          `CURRENT STATEMENT\n${version.body}`,
      },
      creditsFor(MODULE, "revise"),
      { sections: bodyToSections(version.body), warnings: [] },
    );
    addVersion(scope, id, sectionsToBody(draft.sections), "ai_revision", "AI revision of your version " + version.version_no);
    revalidatePath(`/app/sop/${id}`);
    return { ok: true, message: "Revised. Compare it against your own version before keeping it." };
  } catch (error) {
    return { ok: false, message: explain(error) };
  }
}
