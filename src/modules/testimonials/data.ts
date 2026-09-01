import { all, now, one, run, uid } from "@/lib/db";

export type Testimonial = {
  id: string;
  name: string;
  role: string;
  quote: string;
  outcome: string | null;
  tint: string;
  is_example: number;
  published: number;
  sort_order: number;
};

export const TINTS = ["sky", "lilac", "mint", "peach", "amber", "rose"] as const;

export const publishedTestimonials = () =>
  all<Testimonial>("SELECT * FROM testimonials WHERE published = 1 ORDER BY sort_order, created_at");

export const allTestimonials = () =>
  all<Testimonial>("SELECT * FROM testimonials ORDER BY is_example, sort_order, created_at");

export const exampleCount = () =>
  all<{ n: number }>("SELECT COUNT(*) n FROM testimonials WHERE is_example = 1")[0]?.n ?? 0;

export function addTestimonial(t: {
  name: string; role: string; quote: string; outcome: string | null; tint: string;
}) {
  run(
    `INSERT INTO testimonials (id, name, role, quote, outcome, tint, is_example, published, sort_order, created_at)
     VALUES (?,?,?,?,?,?,0,1,0,?)`,
    uid(), t.name, t.role, t.quote, t.outcome, t.tint, now(),
  );
}

export const removeTestimonial = (id: string) =>
  run("DELETE FROM testimonials WHERE id = ?", id);

export const setPublished = (id: string, published: boolean) =>
  run("UPDATE testimonials SET published = ? WHERE id = ?", published ? 1 : 0, id);

export const removeAllExamples = () =>
  run("DELETE FROM testimonials WHERE is_example = 1");

export const getTestimonial = (id: string) =>
  one<Testimonial>("SELECT * FROM testimonials WHERE id = ?", id);
