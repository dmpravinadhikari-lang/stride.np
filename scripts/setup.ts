/**
 * Creates the database and fills it with realistic sample data so the product
 * can be clicked through immediately.
 *
 *   npm run setup
 *
 * Safe to re-run: it skips anything that already exists.
 */
import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { readFileSync, mkdirSync } from "node:fs";

const DB_PATH = process.env.OFFICEYAK_DB_PATH || "./data/officeyak.db";
mkdirSync("./data", { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");
db.exec(readFileSync("src/lib/db/schema.sql", "utf8"));

const now = () => new Date().toISOString();
const uid = () => randomUUID();
const hash = (plain: string) => {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(plain, salt, 64).toString("hex")}`;
};
const run = (sql: string, ...p: Array<string | number | null>) => db.prepare(sql).run(...p);
const get = <T>(sql: string, ...p: Array<string | number | null>) => db.prepare(sql).get(...p) as T | undefined;

const PASSWORD = "officeyak1234";

function tenant(slug: string, name: string, plan: string, kind: string, email?: string): string {
  const existing = get<{ id: string }>("SELECT id FROM tenants WHERE slug = ?", slug);
  if (existing) return existing.id;
  const id = uid();
  run(
    `INSERT INTO tenants (id, slug, name, plan, kind, accent_color, contact_email, active, created_at)
     VALUES (?,?,?,?,?,'#07717F',?,1,?)`,
    id, slug, name, plan, kind, email ?? null, now(),
  );
  return id;
}

function user(
  tenantId: string, email: string, fullName: string, role: string, studentPlan: string | null = null,
): string {
  const existing = get<{ id: string }>("SELECT id FROM users WHERE email = ?", email);
  if (existing) return existing.id;
  const id = uid();
  run(
    `INSERT INTO users (id, tenant_id, email, password_hash, full_name, phone, role, student_plan, email_verified, active, created_at)
     VALUES (?,?,?,?,?,?,?,?,1,1,?)`,
    id, tenantId, email, hash(PASSWORD), fullName, null, role, studentPlan, now(),
  );
  return id;
}

function profile(userId: string, tenantId: string, p: Record<string, string | number | null>) {
  if (get("SELECT 1 FROM student_profiles WHERE user_id = ?", userId)) return;
  const cols = Object.keys(p);
  run(
    `INSERT INTO student_profiles (user_id, tenant_id, ${cols.join(", ")}, updated_at)
     VALUES (?,?,${cols.map(() => "?").join(",")},?)`,
    userId, tenantId, ...cols.map((c) => p[c]), now(),
  );
}

// --------------------------------------------------------------- platform
// The platform's own tenant. It exists so the owner account has a home row —
// it holds no students, because a student without a consultancy behind them is
// not a thing this system has any more.
const platform = tenant("officeyak", "OfficeYak Platform", "pro", "platform");
user(platform, "owner@officeyak.np", "Pravin Adhikari", "super_admin");

// ------------------------------------------------------- pilot consultancies
const panda = tenant("happypanda", "Happy Panda Education", "growth", "consultancy", "info@happypanda.com.np");
user(panda, "admin@happypanda.com.np", "Anjana Shrestha", "tenant_admin");
user(panda, "counsellor@happypanda.com.np", "Bikash Tamang", "counsellor");

const sprout = tenant("sprout", "Sprout Education", "starter", "consultancy", "hello@sprouteducation.com.np");
user(sprout, "admin@sprouteducation.com.np", "Rojina Karki", "tenant_admin");

// ------------------------------------------------------------------ students
const s1 = user(panda, "sujata@example.com", "Sujata Gurung", "student");
profile(s1, panda, {
  target_country: "AU", study_level: "masters",
  intended_course: "Master of Information Technology", target_intake: "July 2027",
  last_qualification: "BSc CSIT, Tribhuvan University, 2024", last_gpa: "3.42 / 4.0",
  study_gap_years: 1, work_experience: "Junior support engineer, WorldLink, 14 months",
  english_test: "ielts", english_score: "6.5 overall, no band below 6",
  budget_npr: 6500000, funding_source: "loan_and_family",
  sponsor_relation: "Father", sponsor_occupation: "Construction supply business, Bharatpur",
  sponsor_income_npr: 4200000,
  ties_to_nepal: "Family land in Chitwan, only daughter, father's business to take over",
  career_plan: "Network security role in Nepali banking or telecom",
});

const s2 = user(panda, "roshan@example.com", "Roshan Thapa", "student");
profile(s2, panda, {
  target_country: "UK", study_level: "masters",
  intended_course: "MSc Financial Technology", target_intake: "September 2027",
  last_qualification: "BBA, Kathmandu University, 2023", last_gpa: "3.1 / 4.0",
  study_gap_years: 2, work_experience: "Credit analyst, NIC Asia Bank, 20 months",
  english_test: "pte", english_score: "65",
  budget_npr: 8200000, funding_source: "education_loan",
  sponsor_relation: "Uncle", sponsor_occupation: "Trekking agency owner, Pokhara",
  sponsor_income_npr: 3100000,
  ties_to_nepal: "Mother is unwell, family home in Pokhara",
  career_plan: "Fintech product role at a Nepali bank",
});

const s3 = user(sprout, "manisha@example.com", "Manisha Rai", "student", null);
profile(s3, sprout, {
  target_country: "CA", study_level: "bachelors",
  intended_course: "Diploma in Hospitality Management", target_intake: "January 2027",
  last_qualification: "+2 Management, 2025", last_gpa: "3.05 / 4.0",
  study_gap_years: 0, english_test: "ielts", english_score: "6.0",
  budget_npr: 4800000, funding_source: "family_income",
  sponsor_relation: "Father", sponsor_occupation: "Hotel owner, Dharan",
  sponsor_income_npr: 2600000,
  ties_to_nepal: "Family hotel business to return to",
  career_plan: "Manage the family hotel and expand to Kathmandu",
});

// ------------------------------------------------------------ question bank
type SeedQuestion = { type: string; prompt: string; options?: string[]; answer?: string[]; guidance?: string };
type SeedSection = {
  kind: string; idx: number; title: string; instructions?: string; passage?: string;
  audio_script?: string; image_note?: string; seconds: number; questions: SeedQuestion[];
};
type SeedPaper = { exam: string; variant: string; title: string; blurb?: string; sections: SeedSection[] };

function seedPaper(file: string, status: string) {
  const data = JSON.parse(readFileSync(file, "utf8")) as SeedPaper;
  const existing = get<{ id: string }>("SELECT id FROM test_papers WHERE title = ?", data.title);
  if (existing) return existing.id;

  const paperId = uid();
  run(
    `INSERT INTO test_papers (id, exam, variant, title, blurb, status, origin, created_at, published_at)
     VALUES (?,?,?,?,?,?, 'ai', ?, ?)`,
    paperId, data.exam, data.variant, data.title, data.blurb ?? null, status, now(),
    status === "published" ? now() : null,
  );

  for (const section of data.sections) {
    const sectionId = uid();
    run(
      `INSERT INTO test_sections (id, paper_id, kind, idx, title, instructions, passage, audio_script, image_note, seconds)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      sectionId, paperId, section.kind, section.idx, section.title,
      section.instructions ?? null, section.passage ?? null, section.audio_script ?? null,
      section.image_note ?? null, section.seconds,
    );
    section.questions.forEach((q, i) => {
      run(
        `INSERT INTO test_questions (id, paper_id, section_id, idx, type, prompt, options, answer, marks, guidance)
         VALUES (?,?,?,?,?,?,?,?,1,?)`,
        uid(), paperId, sectionId, i + 1, q.type, q.prompt,
        JSON.stringify(q.options ?? []), JSON.stringify(q.answer ?? []), q.guidance ?? null,
      );
    });
  }
  return paperId;
}

seedPaper("content/ielts-academic-1.json", "published");

// Topics for the generator to work through, so the first scheduled run has
// something to write rather than emailing that the queue is empty.
const TOPICS: Array<[title: string, angle: string, category: string]> = [
  ["Cost of living in Australia for a Nepali student", "Real monthly figures in NPR by city, and why the visa figure is not the same as what you will actually spend.", "Money"],
  ["Part-time work rules for students in Australia, the UK and Canada", "What hours are actually allowed, what the money realistically covers, and why no officer accepts it as funding.", "Applying"],
  ["How to explain a study gap in your application", "What counts as an acceptable explanation, what evidence backs it, and what makes a gap look like something being hidden.", "Applying"],
  ["Genuine Student statement for Australia: what assessors look for", "The specific things a GS assessor reads for, and the sentences that sink an otherwise good statement.", "Visa"],
  ["Choosing between a college diploma and a university degree abroad", "Cost, post-study work eligibility and how each is read by a visa officer.", "Choosing"],
];
for (const [title, angle, category] of TOPICS) {
  if (get("SELECT 1 FROM blog_topics WHERE title = ?", title)) continue;
  run(
    "INSERT INTO blog_topics (id, title, angle, category, status, created_at) VALUES (?,?,?,?,'queued',?)",
    uid(), title, angle, category, now(),
  );
}

// ------------------------------------------------------- example testimonials
// Placeholder copy so the section can be designed and demoed. Every one is
// flagged is_example = 1, which puts a visible "Example — not a real quote"
// label on the public page. The admin deletes them all with one button.
//
// Weighted the way the homepage is: two voices from inside a consultancy, one
// from a student, because the person being convinced by that section owns the
// branch rather than sits in front of the desk.
const EXAMPLES: Array<[name: string, role: string, quote: string, outcome: string | null, tint: string]> = [
  ["Anjana S.", "Director, consultancy in Kathmandu", "A counsellor left in the middle of the intake and took nothing with him, because none of it was in his head any more. The one who replaced him read six months of notes in an afternoon and rang the families the same day. That is the thing I was actually paying for and did not know it.", "Nothing lost in handover", "sky"],
  ["Bikash T.", "Counsellor, Happy Panda Education", "I used to chase twelve students by memory and a diary. Now I open one board in the morning and it tells me who is stuck and what is overdue. The parents stopped calling me every week too, because they can see it themselves.", "Twelve files, one screen", "mint"],
  ["Sujata G.", "Student at a Kathmandu consultancy", "My counsellor put the real number on the desk in the first meeting — almost 60 lakh visible in the account, not just the tuition. Finding that out a year early is the only reason we managed it. My father had time to arrange the loan properly instead of panicking.", "Visa granted", "rose"],
];
for (const [name, role, quote, outcome, tint] of EXAMPLES) {
  if (get("SELECT 1 FROM testimonials WHERE name = ?", name)) continue;
  run(
    `INSERT INTO testimonials (id, name, role, quote, outcome, tint, is_example, published, sort_order, created_at)
     VALUES (?,?,?,?,?,?,1,1,0,?)`,
    uid(), name, role, quote, outcome, tint, now(),
  );
}

// ------------------------------------------------------------ pipeline rows
// Consultancy students belong on the board from the moment they exist.
function pipelineEntry(studentId: string, tenantId: string, stage: string, counsellorId: string | null, source: string, nextAction?: string) {
  if (get("SELECT 1 FROM pipeline_entries WHERE student_id = ?", studentId)) return;
  run(
    `INSERT INTO pipeline_entries (student_id, tenant_id, stage, counsellor_id, source, next_action, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    studentId, tenantId, stage, counsellorId, source, nextAction ?? null, now(), now(),
  );
}

const bikash = get<{ id: string }>("SELECT id FROM users WHERE email = ?", "counsellor@happypanda.com.np")?.id ?? null;
pipelineEntry(s1, panda, "applying", bikash, "Walk-in, Putalisadak", "Chase the bank balance certificate");
pipelineEntry(s2, panda, "test_prep", bikash, "Referral from a past student", "Book PTE date once he hits 65 in a mock");
pipelineEntry(s3, sprout, "enquiry", null, "Walk-in, saw the Facebook page");

/**
 * A history for each file.
 *
 * The timeline is the whole argument for the CRM, and an empty one argues
 * nothing. These are backdated so a new consultancy opening the demo sees what
 * three weeks of properly recorded work looks like.
 */
function activity(
  tenantId: string, studentId: string | null, actorLabel: string,
  kind: string, summary: string, daysAgo: number,
) {
  const at = new Date(Date.now() - daysAgo * 864e5).toISOString();
  run(
    `INSERT INTO activity_log (id, tenant_id, student_id, actor_id, actor_label, kind, summary, detail, created_at)
     VALUES (?,?,?,NULL,?,?,?,NULL,?)`,
    uid(), tenantId, studentId, actorLabel, kind, summary, at,
  );
}

const BIKASH = "Bikash Shrestha";
const PANDA_ADMIN = "Anita Maharjan";

// Sujata — furthest along, applying to Australia.
activity(panda, s1, PANDA_ADMIN, "account.created",     "Sujata Gurung enrolled by Anita Maharjan.", 24);
activity(panda, s1, PANDA_ADMIN, "account.invited",     "Sign-in details sent to sujata@example.com.", 24);
activity(panda, s1, "Sujata Gurung", "account.first_login", "Sujata Gurung signed in for the first time.", 23);
activity(panda, s1, BIKASH,       "counsellor.assigned", "Counsellor set to Bikash Shrestha.", 23);
activity(panda, s1, "Sujata Gurung", "profile.updated",  "Profile completed — Australia, MSc Data Science, July 2027 intake.", 22);
activity(panda, s1, "Sujata Gurung", "practice.mock_test", "IELTS mock submitted — overall 6.5, writing 5.5.", 19);
activity(panda, s1, BIKASH,       "note.added",          "Called about the writing band. Booking her onto the Tuesday class.", 18);
activity(panda, s1, "Sujata Gurung", "doc.uploaded",     "Passport uploaded (passport-sujata.pdf).", 15);
activity(panda, s1, BIKASH,       "doc.verified",        "passport-sujata.pdf verified by Bikash Shrestha.", 15);
activity(panda, s1, "Sujata Gurung", "practice.sop",     "Statement scored — 71, flagged thin on ties to Nepal.", 12);
activity(panda, s1, BIKASH,       "stage.changed",       "Stage moved to Applying.", 9);
activity(panda, s1, "Sujata Gurung", "doc.uploaded",     "Bank balance certificate uploaded (nic-asia-balance.pdf).", 6);
activity(panda, s1, BIKASH,       "doc.rejected",        "nic-asia-balance.pdf sent back: dated before the six-month window.", 5);
activity(panda, s1, BIKASH,       "action.set",          "Next action: Chase the bank balance certificate (due in 3 days).", 2);

// Roshan — still in test prep for the UK.
activity(panda, s2, BIKASH,       "account.created",     "Roshan Thapa enrolled by Bikash Shrestha.", 17);
activity(panda, s2, BIKASH,       "account.invited",     "Sign-in details sent to roshan@example.com.", 17);
activity(panda, s2, "Roshan Thapa", "account.first_login", "Roshan Thapa signed in for the first time.", 16);
activity(panda, s2, "Roshan Thapa", "practice.mock_test", "PTE mock submitted — overall 58, target 65.", 11);
activity(panda, s2, "Roshan Thapa", "practice.interview", "Mock credibility interview completed — scored 62.", 8);
activity(panda, s2, BIKASH,       "note.added",          "Struggled on the sponsor question. Father to bring salary slips Sunday.", 8);
activity(panda, s2, BIKASH,       "action.set",          "Next action: Book PTE date once he hits 65 in a mock.", 4);

// Manisha — a fresh enquiry at the other consultancy, so the wall has two sides.
activity(sprout, s3, "Sabina Karki", "account.created",  "Manisha Rai enrolled by Sabina Karki.", 3);
activity(sprout, s3, "Sabina Karki", "account.invited",  "Sign-in details sent to manisha@example.com.", 3);
activity(sprout, s3, "Sabina Karki", "note.added",       "Walked in about Canada hospitality diplomas. Budget looks tight — run the true cost with her.", 3);


console.log(`
OfficeYak is set up.  Database: ${DB_PATH}

  Log in with any of these — the password is the same for all:

  PASSWORD: ${PASSWORD}

  owner@officeyak.np                    Platform owner (sees the admin panel)
  admin@happypanda.com.np            Consultancy admin, Happy Panda (Growth plan)
  counsellor@happypanda.com.np       Counsellor, Happy Panda
  admin@sprouteducation.com.np       Consultancy admin, Sprout (Starter plan)
  sujata@example.com                 Student, Happy Panda, applying to Australia
  roshan@example.com                 Student, Happy Panda, applying to the UK
  manisha@example.com                Student, Sprout, applying to Canada

  Now run:  npm run dev
`);
