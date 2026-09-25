/**
 * Where a student came from.
 *
 * A fixed list, not free text. The point of it is the report: an owner needs
 * to know whether the Facebook spend produces students or only phone numbers,
 * and that comparison breaks the moment the same channel is typed as "FB",
 * "facebook" and "Facebook ad" in three offices.
 */
export const SOURCES = {
  walk_in:   { label: "Walk-in",   blurb: "Came through the door." },
  referral:  { label: "Referral",  blurb: "Sent by a past student, a parent or a school." },
  facebook:  { label: "Facebook",  blurb: "Page, group or lead ad." },
  instagram: { label: "Instagram", blurb: "Profile, story or DM." },
  tiktok:    { label: "TikTok",    blurb: "Where a lot of Nepali students actually are." },
  website:   { label: "Website",   blurb: "Your own site or a free tool on it." },
  phone:     { label: "Phone",     blurb: "Rang the office." },
  event:     { label: "Event",     blurb: "Education fair, school visit or seminar." },
  other:     { label: "Other",     blurb: "Anything else. Say where in the note." },
} as const;

export type Source = keyof typeof SOURCES;
export const SOURCE_IDS = Object.keys(SOURCES) as Source[];
export const isSource = (id: string): id is Source => id in SOURCES;
export const sourceOf = (id: string | null) =>
  (id && isSource(id) ? SOURCES[id] : SOURCES.other);

/**
 * Older files carry free text, and a report that ignores them would show a
 * conversion rate for half the office. This maps the spellings people
 * actually typed onto the fixed list.
 */
export function normaliseSource(raw: string | null | undefined): Source {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return "other";
  if (isSource(s)) return s;
  if (s.includes("walk")) return "walk_in";
  if (s.includes("refer")) return "referral";
  if (s.includes("insta") || s === "ig") return "instagram";
  if (s.includes("face") || s.includes("meta") || s === "fb") return "facebook";
  if (s.includes("tik")) return "tiktok";
  if (s.includes("web") || s.includes("site") || s.includes("form")) return "website";
  if (s.includes("phone") || s.includes("call")) return "phone";
  if (s.includes("fair") || s.includes("event") || s.includes("seminar") || s.includes("school")) return "event";
  return "other";
}
