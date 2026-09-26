# Keeping a consultancy's data safe

OfficeYak holds the most sensitive paperwork a Nepali family owns: passports,
bank statements, property valuations, academic records, and a list of exactly
which students are about to leave the country with money in their accounts. A
consultancy that loses that loses its licence and its reputation in the same
week.

This document is the plan. It is written in three parts: what is true today,
what is next, and what we will never do. Each item says why, because a control
nobody understands is a control somebody switches off.

---

## 1. What is true today

### Tenant isolation

Every read goes through a `Scope`, which carries the consultancy id, the
person, their position and how far they see. There is no query in the product
that reads student data without one. Cross-consultancy reads are possible only
through capabilities marked platform-wide, held by one account.

*Why this shape:* a filter a screen chooses to apply is a filter a new screen
forgets. The scope is the only way the data is reachable at all.

### Who can do what

Four layers, resolved in `src/lib/auth/access.ts`:

1. **Role** is the outer bound. A student is never handed a staff capability.
2. **Position** is the job: managing director, branch manager, senior
   counsellor, counsellor, front desk, documentation officer, visa and
   admissions officer, instructor, accountant, marketing officer, auditor.
   Each carries a set of capabilities.
3. **Exceptions** are granted or refused to one person by name and beat the
   position. Three states, so there is always a way back to "follow the job".
4. **Scope** is how far somebody sees: their own files, their office, or every
   office. A separate axis from what they may do.

Every screen and every server action asks. Hiding a link is a courtesy; the
refusal happens on the server.

*Why positions rather than checkboxes:* an owner configuring twenty-five
checkboxes per person gets it wrong, and gets it wrong in the permissive
direction. Choosing "Front desk" is one decision that is right.

### Documents

Encrypted with AES-256-GCM **before** they touch the disk, under a key from
the environment (`OFFICEYAK_FILE_KEY`), never stored beside the data. The
authentication tag means an altered file fails to open rather than returning
quietly corrupted bytes. There is no public URL for any document: serving one
goes through a route that re-checks the asker, and a guessed id returns 404.

*Why application-level and not only full-disk encryption:* full-disk
encryption protects a machine that is switched off. It does nothing about a
stolen backup tarball, a mis-scoped rsync, a hosting company's snapshot, or a
support engineer with shell access on a running box. In all of those the
volume is mounted, and with application-level sealing what leaks is
ciphertext.

### Passwords and sessions

scrypt with a per-account salt; the plaintext is never stored, logged or
recoverable. The session cookie is `id.hmac`, httpOnly, sameSite lax, secure
in production, and the id is meaningless without the signature. Changing a
password ends every other session. Anybody can end their other sessions from
their account page.

### The clock at the counter

The shared front-desk device holds a hashed device token and a PIN per person.
What that device can do is deliberately tiny: name the staff of one office and
punch their clock. It cannot read a student, a document or a salary, and its
cookie is refused by every console page.

### The audit trail

`audit_log` records the act, never the contents: payroll opened, a document
opened, somebody's position changed. Nothing in the product deletes from it.
An owner reads it on the Security screen.

*Why reads and not only writes:* for payroll and documents, reading **is** the
sensitive act. A trail of changes would miss the only thing worth catching.

### At the edge

Content-Security-Policy with no plugins, no framing and scripts limited to this
site plus Google's tag and sign-in; `frame-ancestors 'none'`; nosniff;
strict-origin-when-cross-origin; HSTS; `Permissions-Policy` allowing camera
nowhere, microphone and geolocation only to us, payment nowhere. `/app` and
`/p` are `private, no-store` so a passport never sits in a shared browser's
cache. Server Actions check Origin against a named list.

Rate limits on login, signup, walk-in forms and AI spend, keyed per account and
per device, so password guessing and credit draining both cost more than they
are worth.

### Backups

`npm run backup` writes one encrypted archive of the database and the uploaded
documents, sealed with AES-256-GCM before it leaves the machine, restorable
with `--restore`. Encrypted at creation rather than after upload, because a
backup is the single most attractive object in the system: one file with every
passport in it.

---

## 2. What is next, in order

Ordered by how much risk each removes per day of work, not by how it reads on
a pricing page.

1. **Two-factor for staff accounts.** TOTP, required for any position holding
   `payroll:run` or `students:documents`, optional for the rest. The realistic
   attack on a consultancy is a reused password, not a clever exploit.
2. **Postgres with row-level security.** The same tenant id pushed into the
   database session, so a bug in application code still cannot read another
   consultancy's rows. Today isolation is enforced in one place; then it would
   be enforced in two.
3. **Key rotation for documents.** `OFFICEYAK_FILE_KEY` versioned, with a
   re-seal job, so a suspected key exposure is a job to run rather than a
   migration to invent.
4. **Retention, stated and enforced.** A document has an expiry; after a
   student departs, files that are not marked keep are deleted on a schedule
   and the deletion is recorded. The safest way to hold a passport scan is not
   to hold it any longer than the visa took.
5. **Export and erasure on request.** A student asks; the consultancy presses
   one button and gets a complete archive or a complete deletion, with a
   record of which. Nepal's Individual Privacy Act 2075 gives that right, and
   an office that cannot answer it in a day will not answer it at all.
6. **Signed download links with a short life**, so a document opened on a
   phone cannot be forwarded as a working URL.
7. **Anomaly alerts.** Forty documents opened in an hour, a login from a new
   country, a position raised at midnight: mail the owner. The trail already
   holds the facts; nobody reads a trail.
8. **A restore drill, quarterly, written down.** An untested backup is a
   belief, not a backup.

---

## 3. What we will not do

- **We will not store a password in a form we can read.** Not for support, not
  for migration, not temporarily.
- **We will not put student data in an email.** Notifications say what
  happened and link to the screen; they never carry the document, the passport
  number or the bank balance.
- **We will not add a "see everything" switch** for support staff. Reaching
  into a consultancy's data means a deliberate, logged act by one platform
  account.
- **We will not send anything to an analytics tool that identifies a
  student.** Counts, not people.
- **We will not train anything on a consultancy's files.** The AI features
  send what the student wrote in the tool they are using, and nothing else.

---

## 4. If something goes wrong

1. Cut the access: switch the account off, which ends its sessions.
2. Read the trail: `audit_log` says what that account opened, and when.
3. Rotate what was exposed: session secret, file key, backup key, SMTP
   credentials, in that order.
4. Tell the consultancy the same day, in plain words: what was reached, whose
   data, and what we have done. Before anybody asks.
5. Write down what let it happen, and fix that rather than the symptom.

A consultancy's own obligation to the families it serves is the same shape,
which is why the Security screen shows them the trail rather than only
promising there is one.
