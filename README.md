# OfficeYak

A study-abroad platform for Nepal's consultancy ecosystem. Consultancies rent it
white-labelled for their students; students can also sign up directly.

**Built so far:**
- **Phase 1** — the platform spine, SOP Studio, AI Mock Interview
- **Phase 2** — IELTS mock tests: timed sections, instant marking for Listening and Reading, AI band scoring for Writing and Speaking, and the trainer review screen for the question bank
- **Student Pipeline** (the consultancy side) — staff create student logins, move them through eight stages, assign counsellors, set next actions, and see every mock, interview and statement that student has produced
- **Document Vault** — 32 document types specific to Nepal and to each destination, upload, staff verification, an AI check for what is missing or contradicts the profile, and automatic deletion of sensitive documents after 90 days
- **True Cost Calculator** — the whole cost in NPR, and separately the balance each destination requires you to show, quoted with its source
- **University Finder** and **Scholarship Finder** — matched against real grades, budget and English score
- **Parent View** — a read-only progress and cost page for the people paying, opened by link and code rather than an account
- **Application Checklist** — 30 process steps dated backwards from the intake month, with a nightly email reminding students what is overdue
- **Seven free public tools** at `/tools`, usable with no account at all
- **Reports** — funnel, stalled students, counsellor load, engagement and a daily chase list, per consultancy
- **Admin console** — tenants and plans, the permission matrix, engine health, Google Analytics status and what is costing money
- **Google sign-in** alongside email and password

---

The brand, its name, wordmark and domain, lives in `src/lib/brand.ts`, and the
palette in the `@theme` block of `src/app/globals.css`. Both follow the
guidelines in `docs/brand/BRAND.md`, with the tokens in
`public/brand/brand-tokens.json` and the marks beside them.

The mark is the bell a yak wears, drawn in the three brand colours, and the
wordmark carries the horn-Y in place of the letter. Night Navy `#15133A` and
Paper `#FAFAFC` do the work of the page; pink, orange and yellow are used
sparingly, and sit together at full size only in the mark and the ridge.

One rule is worth knowing before editing anything: the action colour and the
link colour are not the same token. OfficeYak Orange `#FF7A1A` is a fill and
carries white type only above 24px, where it measures 2.6:1. Anything with
text on it, a button or a link, uses `#A85300` instead, which carries white at
5.38:1 and reads on Paper at 5.16:1.

## Running it on this Mac

Open Terminal, then:

```bash
cd /Users/pa/officeyak && npm run dev
```

Then open **http://localhost:3000** in your browser. Press `Ctrl+C` in Terminal to stop it.

### Logging in

Every sample account uses the password **`officeyak1234`**.

| Email | Who they are |
|---|---|
| `owner@officeyak.com` | You — the platform owner. Sees the admin panel. |
| `admin@happypanda.com.np` | Happy Panda Education, consultancy admin (Growth plan) |
| `counsellor@happypanda.com.np` | Happy Panda, counsellor |
| `admin@sprouteducation.com.np` | Sprout Education, consultancy admin (Starter plan) |
| `sujata@example.com` | Student at Happy Panda, applying to Australia |
| `roshan@example.com` | Student at Happy Panda, applying to the UK |
| `manisha@example.com` | Direct student, applying to Canada |

### Starting over with fresh data

```bash
npm run reset && npm run setup
```

---

## The AI switch

Nothing in OfficeYak talks to Claude directly. Modules ask the platform a question
("score this writing task") and one setting decides who answers it. Change it in
`.env.local`, then restart:

| `OFFICEYAK_AI_PROVIDER` | What happens | When to use it |
|---|---|---|
| `sample` *(current)* | Built-in realistic canned answers | Building, demoing, screenshots. No account, no cost, works offline. |
| `claude-cli` | Runs the `claude` command on this machine | Real answers while you build. **One request at a time** — a laptop demo, never real students. |
| `anthropic-api` | The real Claude API | The only option once actual students use it. Needs `ANTHROPIC_API_KEY`. |

To use `claude-cli` you would install it once yourself:

```bash
npm install -g @anthropic-ai/claude-code
```

then run `claude login` in a terminal and sign in. The admin panel shows whether
each engine is available.

---

## What's here

```
src/
  app/            every screen (Next.js App Router)
  components/     shared buttons, cards, chips — the whole visual system
  lib/
    ai/           the swappable AI engine and the three providers
    auth/         accounts, passwords, sessions, roles
    db/           the database and its schema
    modules/      THE MODULE REGISTRY — how features get added
    plans.ts      prices, student limits, monthly AI credits
    countries.ts  the six destinations and their rules
    usage.ts      the credit meter
  modules/
    sop-studio/     SOP Studio
    ai-interview/   AI Mock Interview
    mock-tests/     IELTS & PTE mocks — bands.ts and marking.ts are the two
                    files worth understanding here
    pipeline/       the consultancy-side student board (staff only)
    documents/      the vault — kinds.ts is the Nepal document catalogue,
                    access.ts is the single rule for who may open a file
    cost/           data.ts holds every cost figure and visa threshold
    finder/         the university and scholarship catalogues
    parents/        the parent link, its code gate, and summary.ts — which
                    decides exactly what a parent is allowed to see
    checklist/      steps.ts is the process; schedule.ts turns it into dates
    tools/          eligibility, loan EMI and destination comparison
  app/tools/        the public, no-login versions of every zero-cost tool
content/          the question bank as JSON — one file per paper
scripts/          setup and reset
data/officeyak.db    the database (a single file, ignored by git)
```

### Adding a feature later

Add one entry to `src/lib/modules/registry.ts`:

```ts
{
  id: 'scholarship-finder',
  name: 'Scholarship Finder',
  plans: ['growth', 'pro', 'student_premium'],   // who has paid for it
  roles: ['student', 'counsellor'],              // who may open it
  credits: { match: 1 },                         // AI cost per use
  route: '/app/scholarships',
  status: 'live', phase: 4, group: 'Decide',
}
```

It then appears in the sidebar for exactly the right people, is locked behind the
right plan, is metered, and shows in the admin panel — with no other file touched.
The ten modules already listed there are how the roadmap shows up in the product.

---

## Marking a mock test

Listening and Reading are marked in the app, not by AI: `marking.ts` accepts the
spelling and formatting variants IELTS accepts (`£180` = `180`, `the internet` =
`internet`, `two` = `2`), and `bands.ts` converts the raw score using the published
band tables. Writing and Speaking go to the AI, scored against the four official
criteria, with Task 2 weighted double.

Two honesty rules are built in and should stay:

- **Speaking in text mode reports no pronunciation band.** It reports 0 and says
  it was not assessed, rather than inventing one from typed words.
- **A single-section practice never produces an overall band or a whole-test
  report.** It would mean commenting on three skills the student did not sit.

### Adding a paper to the bank

Drop a JSON file in `content/` shaped like `ielts-academic-1.json` and add one
`seedPaper(...)` line in `scripts/setup.ts`. Papers start unpublished; a trainer
reviews every question at `/app/mock-tests/bank/<paper id>` and the platform owner
publishes it. Trainer verdicts and notes are kept against each question.

## The two sides of the product

A **student** sees only their own work. A **counsellor or consultancy admin** sees
every student at their branch, and nobody else's. The pipeline module is the only
place that reads across students, and every query in it still requires the tenant
to match — which is why `/app/pipeline` redirects a student straight back to their
own dashboard, and why Happy Panda cannot see a Sprout student through any route.

Staff create student accounts from the pipeline. The app shows a one-time password
once, for the counsellor to hand over; there is no email yet to send it with.
Plan student limits are enforced at that moment, counting everyone not yet
Departed or Lost.

## Documents

`kinds.ts` lists the 32 documents a Nepali student actually has to produce, in the
words their bank and consultancy use, filtered by destination and by how far
along the student is. Australia asks for a CoE, the UK for a CAS, Canada for a PAL
and a GIC — the checklist changes accordingly.

**Files are never on a public address.** They are written to `data/uploads/` under
tenant and student folders with random names, and the only way one reaches a
browser is `/api/documents/<id>`, which re-checks the requester every time and
writes the read to an access log. A request from another consultancy gets the same
404 as a request for an id that does not exist.

**Retention is enforced, not promised.** Passports, citizenship and everything
financial are marked sensitive and given a 90-day expiry on upload. `npm run purge`
deletes the expired ones and their rows; on the server that runs nightly from cron:

```bash
0 3 * * * cd /srv/officeyak && npm run purge >> /var/log/officeyak-purge.log 2>&1
```

A student can press **Keep** on any sensitive document to cancel its expiry.

## Keeping the money figures current

`src/modules/cost/data.ts` is the only place cost figures live, and it separates
two kinds of number that must never be confused:

- **Visa funds are a rule.** Each destination's published requirement, quoted with
  its source and the date it applies from — Australia AUD 29,710, Canada CAD 23,448
  from 1 Sept 2026, UK £1,171/month outside London, and so on.
- **Everything else is an estimate.** Tuition and living ranges for planning. A
  student with an offer letter types their real figure in and the estimate is
  ignored.

Exchange rates sit in the same file with a `RATES_AS_OF` date that the calculator
prints on screen. Review both a couple of times a year, or whenever a destination
announces a change — one file, no code.

`src/modules/finder/` holds the university and scholarship catalogues the same way.
The universities are a starter set; a consultancy extends it with the institutions
it actually has agreements with.

## The parent page

Parents get a **link, not an account**. Most parents paying for a Nepali student
abroad will not create a login or remember a password, but they will open a link
sent on Viber. The link carries a long random token and, by default, a six-digit
code the counsellor reads out by phone — the code must not travel in the same
message as the link, and the app says so.

`summary.ts` is the whole privacy boundary. A parent sees the stage, what paperwork
is still outstanding *by name*, the practice scores, the next action, and the
money. They never see a document, the statement, or an interview transcript. If
you add something to a parent's view, add it there and nowhere else.

Either the student or a staff member can create a link, and either can revoke one
instantly.

## Free tools and the paid line

Everything under `/tools` works with no account: eligibility check, true cost,
education loan EMI, university finder, scholarship finder, destination compare
and the application timeline. They are lookups and arithmetic, so they cost
nothing to serve — and they are how students find OfficeYak at all.

An account is needed only for what costs money per use: marked mock tests, mock
interviews, SOP scoring and the AI document check. Keep that line where it is.

## Reminders

The checklist emails students when something is overdue or lands within a
fortnight — one message per student per morning, never one per task.

Email is switched the same way the AI engine is, in `.env.local`:

| `OFFICEYAK_EMAIL_PROVIDER` | What happens |
|---|---|
| `outbox` *(current)* | Writes the message to `data/outbox/` and sends nothing. You can read exactly what would have gone out. |
| `smtp` | A real mail server, using the `SMTP_*` settings. |

The job runs inside the app so it shares the same scheduling code the student
sees on screen. On the server, cron calls it:

```bash
0 6 * * * curl -fsS -H "Authorization: Bearer $OFFICEYAK_CRON_SECRET" http://127.0.0.1:3000/api/cron/alerts
```

Every message is written to the `notifications` table before it is sent, with a
dedupe key, so a failed send is retried and the same reminder never goes twice.

## Who can do what

`src/lib/auth/permissions.ts` is the single source of truth. Every capability is
listed there against every role, and the admin console renders that table
straight from the code, so what is documented cannot drift from what is
enforced. Screens and actions go through `requireCapability()` and
`allowed()` in `src/lib/auth/guard.ts` rather than checking roles inline.

Two rules sit on top of the table and always apply:

1. **Tenant isolation.** A capability never crosses consultancies, except the
   three marked platform-wide.
2. **Ownership.** A student always reaches their own records.

Verified behaviour: a student is bounced from reports, pipeline and admin; a
counsellor gets reports and pipeline but not admin; a consultancy admin gets the
same plus branch settings; only the platform owner gets the admin console.

## Google sign-in

Create an OAuth client at `console.cloud.google.com`, add
`<your site>/api/auth/google/callback` as an authorised redirect URI, and put the
ID and secret in `.env.local`. Until then the button does not appear at all and
the endpoint returns a clear error rather than half-working.

Signing in with a Google account whose email already exists **links** the two
rather than creating a second account. New Google users land in the direct
student pool, exactly like an email signup.

## Google Analytics

Put a GA4 measurement ID in `NEXT_PUBLIC_GA_ID`. The tag loads on the marketing
pages and the free tools only — never under `/app`, and never on a parent's
progress page. A parent opening a link about their child's visa application has
not agreed to be measured.

## Mobile, and the app that comes later

**Nine out of ten broadband connections in Nepal are mobile.** Desktop is the
minority case, so the interface is built phone-first and the desktop sidebar is
the special case rather than the default.

On a phone the app shell is a slim top bar, a **bottom tab bar** with the four
things people open daily, and a drawer for everything else. That is deliberately
the shape a native app takes, so the navigation does not have to be relearnt
when one exists.

### It installs already

`manifest.ts` plus `public/sw.js` make OfficeYak an installable PWA — a home-screen
icon, a full-screen shell, and an offline page when mobile data drops. No app
store, no download over metered data, no second codebase.

The service worker is deliberately small. It caches the offline page and Next's
content-hashed build assets and **nothing else** — never `/app`, `/api` or `/p`,
because a cached copy of one person's file on a shared phone is a privacy
problem rather than a speed win.

### The API the native app will use

`/api/v1/*` is versioned JSON, so a shipped app never breaks under a deploy.

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/v1/auth/login` | none | Exchange email and password for a bearer token |
| `POST /api/v1/auth/logout` | bearer | Revoke that token |
| `GET /api/v1/me` | bearer | Profile, credits, and the capability list the app builds its nav from |
| `GET /api/v1/checklist` | bearer | The dated plan |
| `POST /api/v1/checklist` | bearer | Tick a step off |
| `GET /api/v1/cost` | none | The cost calculator as JSON |
| `GET /api/v1/universities` | none | Matcher, with the same verdicts the web shows |
| `GET /api/v1/scholarships` | none | Catalogue with values |
| `GET /api/v1/guides` | none | The blog |

The web stays on cookies; the app gets bearer tokens. **Both resolve to the same
`Scope`**, so tenant isolation and every permission check behave identically
whichever door a request came through. Only the token hash is stored.

When you build the app, Expo or React Native against this API is the shortest
path — the business logic, the permission table and the tenant wall all stay
here rather than being reimplemented on a phone.

## Two rules that keep this safe

**Consultancy isolation.** Every row of consultancy data carries a `tenant_id`, and
every query filters on it. When this moves to PostgreSQL on the Contabo server,
the database enforces the same rule a second time, so a bug in one module still
cannot leak another consultancy's students.

**Nothing uses AI without being counted.** Every call goes through `runAi()`, which
checks the monthly allowance first and records what it cost afterwards — even on
`sample`, so your usage data is real from the first student.

---

## Still to come

- **Phase 2 remaining** — more papers in the bank, PTE alongside IELTS, real recorded listening audio, voice mode for interviews
- **Phase 3** — deploy to Contabo: domain, HTTPS, PostgreSQL, email, nightly backups
- **Phase 4** — student pipeline, document vault, cost calculator, university and scholarship finders, parent view
- **Phase 5** — Khalti/eSewa checkout, SMS alerts, per-consultancy domains, analytics

The full plan: <https://claude.ai/code/artifact/46e03bbb-5d07-45ae-9628-fdd955f2faa6>

---

## Brand assets in this package

See `public/brand/`. Every mark is SVG and viewBox-based, so it scales freely;
`*-mono.svg` and `bell-notification.svg` draw in `currentColor`.

## The homepage mockup

`website/officeyak-homepage.html` is the high-fidelity reference for the
homepage, and its inline styles are the values to copy. `docs/brand/BRAND.md`
records where the build departs from it and why.
