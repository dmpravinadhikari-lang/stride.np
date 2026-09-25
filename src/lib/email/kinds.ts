/**
 * What the product will email a member of staff about.
 *
 * A fixed list, because it is also the settings screen. Each one says what it
 * is in the words the person receiving it would use, and carries the default:
 * everything is on for a new account except the owner's weekly summary, which
 * only an admin receives.
 *
 * Anything not on this list is not emailed. That is deliberate: a product
 * that mails people whenever a developer adds a call site is a product people
 * filter into a folder and stop reading.
 */
export const EMAIL_KINDS = {
  "task.assigned": {
    label: "A task is given to me",
    blurb: "Somebody assigns you a job, or a team task lands on your desk.",
    staffOnly: true,
    adminOnly: false,
  },
  "student.assigned": {
    label: "A student is given to me",
    blurb: "You become the counsellor on a file.",
    staffOnly: true,
    adminOnly: false,
  },
  "document.waiting": {
    label: "A student uploads a document",
    blurb: "Something is waiting for you to verify or send back.",
    staffOnly: true,
    adminOnly: false,
  },
  "day.digest": {
    label: "My morning list",
    blurb: "One email at the start of the day: what is late, what is due, who has nobody.",
    staffOnly: true,
    adminOnly: false,
  },
  "week.owner": {
    label: "Weekly summary for the owner",
    blurb: "Monday morning: how each office did, what stalled, what converted.",
    staffOnly: true,
    adminOnly: true,
  },
  "checklist.deadline": {
    label: "Student deadline reminders",
    blurb: "A student of yours is running out of time on a dated step.",
    staffOnly: false,
    adminOnly: false,
  },
} as const;

export type EmailKind = keyof typeof EMAIL_KINDS;
export const EMAIL_KIND_IDS = Object.keys(EMAIL_KINDS) as EmailKind[];
export const isEmailKind = (id: string): id is EmailKind => id in EMAIL_KINDS;
