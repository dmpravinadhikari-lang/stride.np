"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/guard";
import { addTestimonial, removeAllExamples, removeTestimonial, setPublished } from "@/modules/testimonials/data";

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const refresh = () => { revalidatePath("/"); revalidatePath("/app/admin/testimonials"); };

export async function createTestimonial(formData: FormData) {
  await requireCapability("platform:admin");
  const name = clean(formData.get("name"));
  const quote = clean(formData.get("quote"));
  if (name.length < 2 || quote.length < 20) return;
  addTestimonial({
    name,
    role: clean(formData.get("role")) || "Student",
    quote,
    outcome: clean(formData.get("outcome")) || null,
    tint: clean(formData.get("tint")) || "sky",
  });
  refresh();
}

export async function deleteTestimonial(formData: FormData) {
  await requireCapability("platform:admin");
  removeTestimonial(clean(formData.get("id")));
  refresh();
}

export async function toggleTestimonial(formData: FormData) {
  await requireCapability("platform:admin");
  setPublished(clean(formData.get("id")), clean(formData.get("published")) === "1");
  refresh();
}

/** One button to clear every placeholder once real quotes are in. */
export async function clearExamples() {
  await requireCapability("platform:admin");
  removeAllExamples();
  refresh();
}
