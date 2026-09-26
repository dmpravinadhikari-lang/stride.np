-- ---------------------------------------------------------------------------
-- Stride database schema.
--
-- Written in portable SQL. Today it runs on SQLite (a single file in /data).
-- On the Contabo server it becomes PostgreSQL: the tables are identical, and
-- PostgreSQL adds row-level security so the tenant_id rule below is enforced
-- by the database itself rather than only by application code.
--
-- THE ONE RULE: every table that holds consultancy data carries tenant_id,
-- and every query goes through src/lib/db/scope.ts which will not let you
-- forget it.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenants (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,          -- happypanda -> happypanda.stride.com.np
  name           TEXT NOT NULL,
  plan           TEXT NOT NULL DEFAULT 'starter',
  kind           TEXT NOT NULL DEFAULT 'consultancy', -- 'consultancy' | 'direct'
  accent_color   TEXT NOT NULL DEFAULT '#07717F',
  contact_email  TEXT,
  contact_phone  TEXT,
  address        TEXT,
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES tenants(id),
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  phone          TEXT,
  role           TEXT NOT NULL,                 -- super_admin|tenant_admin|counsellor|student
  student_plan   TEXT,                          -- direct students only: free|premium
  email_verified INTEGER NOT NULL DEFAULT 0,
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL,
  last_seen_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Which modules a consultancy has switched on, over and above its plan.
CREATE TABLE IF NOT EXISTS tenant_modules (
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  module_id  TEXT NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id, module_id)
);

-- One row per student. Every AI module reads this so the student is never
-- asked the same question twice.
CREATE TABLE IF NOT EXISTS student_profiles (
  user_id            TEXT PRIMARY KEY REFERENCES users(id),
  tenant_id          TEXT NOT NULL REFERENCES tenants(id),
  target_country     TEXT,                      -- AU NZ UK IE US CA
  study_level        TEXT,                      -- bachelors|masters|diploma|phd
  intended_course    TEXT,
  target_intake      TEXT,
  academic_summary   TEXT,
  last_qualification TEXT,
  last_gpa           TEXT,
  study_gap_years    INTEGER,
  work_experience    TEXT,
  english_test       TEXT,                      -- ielts|pte|toefl|duolingo|none
  english_score      TEXT,
  budget_npr         INTEGER,
  funding_source     TEXT,
  sponsor_relation   TEXT,
  sponsor_occupation TEXT,
  sponsor_income_npr INTEGER,
  ties_to_nepal      TEXT,
  career_plan        TEXT,
  updated_at         TEXT
);

-- Every AI call ever made, with what it cost. This is what stops a flat-fee
-- subscription being eaten by one enthusiastic student.
CREATE TABLE IF NOT EXISTS usage_events (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id),
  user_id       TEXT NOT NULL REFERENCES users(id),
  module_id     TEXT NOT NULL,
  action        TEXT NOT NULL,
  credits       INTEGER NOT NULL DEFAULT 0,
  provider      TEXT NOT NULL,
  model         TEXT,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  est_cost_usd  REAL NOT NULL DEFAULT 0,
  ok            INTEGER NOT NULL DEFAULT 1,
  ms            INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_usage_tenant_time ON usage_events(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_user_time ON usage_events(user_id, created_at);

-- ------------------------------ SOP Studio --------------------------------
CREATE TABLE IF NOT EXISTS sop_documents (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id),
  user_id     TEXT NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  country     TEXT NOT NULL,
  doc_type    TEXT NOT NULL,      -- sop|gs_statement|personal_statement|study_plan
  university  TEXT,
  course      TEXT,
  status      TEXT NOT NULL DEFAULT 'drafting',
  acknowledged_risk INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sop_user ON sop_documents(user_id);

CREATE TABLE IF NOT EXISTS sop_versions (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id),
  document_id TEXT NOT NULL REFERENCES sop_documents(id),
  version_no  INTEGER NOT NULL,
  source      TEXT NOT NULL,      -- ai_draft|student_edit|ai_revision
  body        TEXT NOT NULL,
  word_count  INTEGER NOT NULL DEFAULT 0,
  note        TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sopver_doc ON sop_versions(document_id, version_no);

CREATE TABLE IF NOT EXISTS sop_reviews (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id),
  document_id TEXT NOT NULL REFERENCES sop_documents(id),
  version_id  TEXT NOT NULL REFERENCES sop_versions(id),
  overall     INTEGER NOT NULL DEFAULT 0,
  criteria    TEXT NOT NULL DEFAULT '[]',   -- JSON array of {key,label,score,comment}
  findings    TEXT NOT NULL DEFAULT '[]',   -- JSON array of {severity,title,detail,quote}
  integrity   TEXT NOT NULL DEFAULT '{}',   -- JSON {aiLikelihood,clicheCount,notes[]}
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sopreview_doc ON sop_reviews(document_id, created_at);

-- ---------------------------- AI Mock Interview ---------------------------
CREATE TABLE IF NOT EXISTS interview_sessions (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id),
  user_id      TEXT NOT NULL REFERENCES users(id),
  kind         TEXT NOT NULL,     -- us_f1|uk_credibility|ca_study_permit|au_gs|admission|scholarship
  country      TEXT NOT NULL,
  mode         TEXT NOT NULL DEFAULT 'text',
  status       TEXT NOT NULL DEFAULT 'in_progress',
  question_budget INTEGER NOT NULL DEFAULT 10,
  report       TEXT,              -- JSON, written when the session completes
  started_at   TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_interview_user ON interview_sessions(user_id, started_at);

CREATE TABLE IF NOT EXISTS interview_turns (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id),
  session_id  TEXT NOT NULL REFERENCES interview_sessions(id),
  idx         INTEGER NOT NULL,
  question    TEXT NOT NULL,
  intent      TEXT,              -- what the officer is really testing
  answer      TEXT,
  score       INTEGER,
  evaluation  TEXT,              -- JSON {verdict,strengths[],weaknesses[],modelAnswer}
  is_followup INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  answered_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_turns_session ON interview_turns(session_id, idx);

-- --------------------------- Mock tests (phase 2) --------------------------
-- The question bank. Papers are AI-generated, then corrected by a trainer
-- before they can be published, a paper is only sat by students once it is
-- 'published'. Trainer corrections are kept as bank_reviews so the bank keeps
-- improving instead of freezing at launch.
CREATE TABLE IF NOT EXISTS test_papers (
  id          TEXT PRIMARY KEY,
  exam        TEXT NOT NULL,               -- ielts | pte
  variant     TEXT NOT NULL DEFAULT 'academic',
  title       TEXT NOT NULL,
  blurb       TEXT,
  status      TEXT NOT NULL DEFAULT 'draft', -- draft | in_review | published | retired
  origin      TEXT NOT NULL DEFAULT 'ai',    -- ai | trainer | imported
  created_at  TEXT NOT NULL,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS test_sections (
  id           TEXT PRIMARY KEY,
  paper_id     TEXT NOT NULL REFERENCES test_papers(id),
  kind         TEXT NOT NULL,              -- listening | reading | writing | speaking
  idx          INTEGER NOT NULL,
  title        TEXT NOT NULL,
  instructions TEXT,
  passage      TEXT,                       -- reading text
  audio_script TEXT,                       -- listening script, spoken by the player
  image_note   TEXT,                       -- description of a Task 1 chart
  seconds      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sections_paper ON test_sections(paper_id, idx);

CREATE TABLE IF NOT EXISTS test_questions (
  id         TEXT PRIMARY KEY,
  paper_id   TEXT NOT NULL REFERENCES test_papers(id),
  section_id TEXT NOT NULL REFERENCES test_sections(id),
  idx        INTEGER NOT NULL,
  type       TEXT NOT NULL,                -- mcq | tfng | ynng | gap | matching | short | essay | speaking
  prompt     TEXT NOT NULL,
  options    TEXT NOT NULL DEFAULT '[]',   -- JSON array
  answer     TEXT NOT NULL DEFAULT '[]',   -- JSON array of accepted answers
  marks      INTEGER NOT NULL DEFAULT 1,
  guidance   TEXT,                         -- why the answer is the answer
  flagged    INTEGER NOT NULL DEFAULT 0    -- a trainer marked this one as needing work
);
CREATE INDEX IF NOT EXISTS idx_questions_section ON test_questions(section_id, idx);

-- Trainer corrections. This is the loop that keeps the bank honest.
CREATE TABLE IF NOT EXISTS bank_reviews (
  id          TEXT PRIMARY KEY,
  paper_id    TEXT NOT NULL REFERENCES test_papers(id),
  question_id TEXT REFERENCES test_questions(id),
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  verdict     TEXT NOT NULL,               -- approve | fix | reject
  note        TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bankreviews_paper ON bank_reviews(paper_id, created_at);

CREATE TABLE IF NOT EXISTS test_attempts (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id),
  user_id      TEXT NOT NULL REFERENCES users(id),
  paper_id     TEXT NOT NULL REFERENCES test_papers(id),
  mode         TEXT NOT NULL DEFAULT 'full', -- full | sectional
  only_kind    TEXT,                         -- set when mode = sectional
  status       TEXT NOT NULL DEFAULT 'in_progress',
  overall_band REAL,
  report       TEXT,
  started_at   TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON test_attempts(user_id, started_at);

CREATE TABLE IF NOT EXISTS attempt_sections (
  id           TEXT PRIMARY KEY,
  attempt_id   TEXT NOT NULL REFERENCES test_attempts(id),
  tenant_id    TEXT NOT NULL REFERENCES tenants(id),
  section_id   TEXT NOT NULL REFERENCES test_sections(id),
  kind         TEXT NOT NULL,
  idx          INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending', -- pending | in_progress | done
  raw_score    INTEGER,
  max_score    INTEGER,
  band         REAL,
  feedback     TEXT,                          -- JSON, AI scoring for writing/speaking
  started_at   TEXT,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_attsections_attempt ON attempt_sections(attempt_id, idx);

CREATE TABLE IF NOT EXISTS attempt_answers (
  id          TEXT PRIMARY KEY,
  attempt_id  TEXT NOT NULL REFERENCES test_attempts(id),
  tenant_id   TEXT NOT NULL REFERENCES tenants(id),
  section_id  TEXT NOT NULL REFERENCES test_sections(id),
  question_id TEXT NOT NULL REFERENCES test_questions(id),
  response    TEXT,
  correct     INTEGER,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_answers_attempt ON attempt_answers(attempt_id, question_id);

-- ------------------------- Student pipeline (phase 4) ----------------------
-- Consultancy-side data about a student: where they are in the process, who is
-- looking after them, and what was last said. Kept separate from
-- student_profiles because that belongs to the student and this belongs to the
-- consultancy.
CREATE TABLE IF NOT EXISTS pipeline_entries (
  student_id      TEXT PRIMARY KEY REFERENCES users(id),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  stage           TEXT NOT NULL DEFAULT 'enquiry',
  counsellor_id   TEXT REFERENCES users(id),
  source          TEXT,
  next_action     TEXT,
  next_action_due TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pipeline_tenant ON pipeline_entries(tenant_id, stage);

CREATE TABLE IF NOT EXISTS pipeline_notes (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  author_id  TEXT NOT NULL REFERENCES users(id),
  body       TEXT NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'note',   -- note | stage_change
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pnotes_student ON pipeline_notes(student_id, created_at);

-- ------------------------- Document vault (phase 4) ------------------------
-- Files never live on a public URL. The row records where the file is; serving
-- it goes through a route that checks who is asking every single time.
--
-- expires_at implements the retention decision: financial documents are deleted
-- 90 days after the intake closes unless the student opts to keep them.
CREATE TABLE IF NOT EXISTS documents (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id),
  student_id   TEXT NOT NULL REFERENCES users(id),
  kind         TEXT NOT NULL,
  label        TEXT,
  filename     TEXT NOT NULL,
  mime         TEXT NOT NULL,
  bytes        INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by  TEXT NOT NULL REFERENCES users(id),
  status       TEXT NOT NULL DEFAULT 'uploaded',  -- uploaded | verified | rejected
  note         TEXT,
  expires_at   TEXT,
  keep         INTEGER NOT NULL DEFAULT 0,        -- student asked to keep it past expiry
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_student ON documents(student_id, kind);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(expires_at);

-- Who opened which file, and when. Consultancy owners ask for this.
CREATE TABLE IF NOT EXISTS document_access (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id),
  document_id TEXT NOT NULL REFERENCES documents(id),
  viewer_id   TEXT NOT NULL REFERENCES users(id),
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_docaccess_doc ON document_access(document_id, created_at);

CREATE TABLE IF NOT EXISTS document_checks (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  readiness  INTEGER NOT NULL DEFAULT 0,
  result     TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_doccheck_student ON document_checks(student_id, created_at);

-- -------------------------- Parent portal (phase 4) ------------------------
-- Parents get a link, not an account. Most parents paying for a Nepali student
-- abroad will not create a login, remember a password, or install anything, 
-- but they will open a link a counsellor sends them on Viber.
--
-- The link carries a long random token and, optionally, a short code the
-- counsellor says out loud. The page behind it shows PROGRESS AND MONEY ONLY:
-- never documents, never the SOP text, never an interview transcript.
CREATE TABLE IF NOT EXISTS parent_links (
  id            TEXT PRIMARY KEY,
  token         TEXT NOT NULL UNIQUE,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id),
  student_id    TEXT NOT NULL REFERENCES users(id),
  created_by    TEXT NOT NULL REFERENCES users(id),
  parent_name   TEXT NOT NULL,
  relation      TEXT NOT NULL,
  code_hash     TEXT,
  revoked       INTEGER NOT NULL DEFAULT 0,
  view_count    INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_parentlinks_student ON parent_links(student_id);

-- ------------------------ Application checklist (phase 4) ------------------
-- Progress against the process steps. A row appears only once a student has
-- touched a step; anything absent is simply "not started".
CREATE TABLE IF NOT EXISTS checklist_items (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  step_id    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'todo',   -- todo | doing | done | skipped
  due_on     TEXT,                            -- overrides the computed date
  done_at    TEXT,
  note       TEXT,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_checklist_unique ON checklist_items(student_id, step_id);

-- Outbound email. Queued here first so nothing is lost when a send fails, and
-- so there is a record of what was sent to whom.
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  user_id    TEXT NOT NULL REFERENCES users(id),
  channel    TEXT NOT NULL DEFAULT 'email',   -- email now; sms slots in later
  kind       TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'queued',  -- queued | sent | failed
  error      TEXT,
  /** Stops the same reminder going out twice. */
  dedupe_key TEXT,
  created_at TEXT NOT NULL,
  sent_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe ON notifications(dedupe_key);

-- A shared device at the counter.
--
-- Three people use one machine at a front desk, and making each of them type
-- an email and a password to clock in means they stop clocking in. So the
-- DEVICE is enrolled once by an admin, against one office, and after that a
-- person identifies themselves with a short PIN.
--
-- The token is stored hashed: a row of this table read by somebody who should
-- not have it is then still not a working device.
CREATE TABLE IF NOT EXISTS kiosk_devices (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id),
  branch_id    TEXT NOT NULL REFERENCES branches(id),
  label        TEXT NOT NULL,
  token_hash   TEXT NOT NULL,
  created_by   TEXT NOT NULL REFERENCES users(id),
  created_at   TEXT NOT NULL,
  last_seen_at TEXT,
  active       INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_kiosk_tenant ON kiosk_devices(tenant_id, active);

-- Enquiries, before they are students.
--
-- A walk-in gives a name and a number. That is not an account: making one
-- would mean inventing an email address, and an invented address is one a
-- reminder is sent to for the next two years. So an enquiry lives here until
-- somebody commits, and converting it is what creates the student.
--
-- Two required columns, name and phone, and that split is the whole design.
-- A form that demands a passport number before it will open a file is a form
-- that gets a made-up passport number.
CREATE TABLE IF NOT EXISTS leads (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id),
  branch_id     TEXT REFERENCES branches(id),
  full_name     TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT,
  destination   TEXT,
  study_level   TEXT,
  intake        TEXT,
  english_test  TEXT,
  source        TEXT,
  -- The counsellor's own reading of how warm it is. Never computed: a file
  -- that rang three times on Sunday is hot and no query knows that.
  priority      TEXT,
  note          TEXT,
  /** Who is looking after it, once somebody has picked it up. */
  owner_id      TEXT REFERENCES users(id),
  /** new | contacted | converted | lost */
  status        TEXT NOT NULL DEFAULT 'new',
  follow_up_on  TEXT,
  /** Set when it becomes a student, so the two are never double counted. */
  student_id    TEXT REFERENCES users(id),
  /** Where it was filled: reception tablet, the link we send, or staff. */
  channel       TEXT NOT NULL DEFAULT 'walk_in',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_leads_branch ON leads(branch_id, status);

-- What each person wants emailed to them.
--
-- A row per person per kind, written only when somebody turns something off.
-- Absence therefore means "on", which is the behaviour a new member of staff
-- should get without anyone configuring them.
CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id    TEXT NOT NULL REFERENCES users(id),
  kind       TEXT NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, kind)
);

-- ------------------------------- Testimonials ------------------------------
-- is_example marks seeded placeholder content. Examples carry a visible label
-- on the page so nobody is misled, and the admin deletes them once real quotes
-- arrive. A real testimonial is never created with is_example = 1.
CREATE TABLE IF NOT EXISTS testimonials (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL,
  quote       TEXT NOT NULL,
  outcome     TEXT,
  tint        TEXT NOT NULL DEFAULT 'sky',
  is_example  INTEGER NOT NULL DEFAULT 0,
  published   INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

-- ------------------------------ Blog topic queue ---------------------------
-- The queue the generator works through. Keeping topics explicit stops it
-- writing the same article five different ways.
CREATE TABLE IF NOT EXISTS blog_topics (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  angle      TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'Applying',
  status     TEXT NOT NULL DEFAULT 'queued',    -- queued | drafted | done | skipped
  created_at TEXT NOT NULL,
  used_at    TEXT
);

-- ------------------------------- Test booking ------------------------------
-- A request, not a transaction. Stride is not a reseller for IDP, the British
-- Council or Pearson, so nothing here takes money or claims to hold a seat.
-- The student says what they want, the consultancy books it and records the
-- confirmation, which is exactly what already happens over the phone, minus
-- the forgetting.
CREATE TABLE IF NOT EXISTS test_bookings (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id),
  student_id    TEXT NOT NULL REFERENCES users(id),
  exam          TEXT NOT NULL,              -- ielts-cd | ielts-paper | ielts-ukvi | pte
  city          TEXT NOT NULL,
  preferred_from TEXT,
  preferred_to   TEXT,
  note          TEXT,
  status        TEXT NOT NULL DEFAULT 'requested', -- requested | confirmed | sat | cancelled
  booked_on     TEXT,
  centre        TEXT,
  reference     TEXT,
  handled_by    TEXT REFERENCES users(id),
  staff_note    TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON test_bookings(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON test_bookings(student_id, created_at);

-- --------------------------- API tokens (mobile app) -----------------------
-- A native app cannot use a browser cookie, so it exchanges credentials for a
-- bearer token. Only the hash is stored: a leaked database must not hand
-- somebody a working set of logins.
CREATE TABLE IF NOT EXISTS api_tokens (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  token_hash   TEXT NOT NULL UNIQUE,
  device       TEXT,
  last_used_at TEXT,
  expires_at   TEXT NOT NULL,
  revoked      INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON api_tokens(user_id, revoked);


-- ===========================================================================
-- CRM: the record of what happened
--
-- A consultancy's real product is diligence, and diligence has to be provable
--, to the student, to the parent paying, and to the owner asking why a file
-- stalled. Every meaningful act writes one row here.
--
-- This is append-only by convention: rows are never edited or deleted, so the
-- timeline cannot be quietly rewritten after a complaint. It is separate from
-- pipeline_notes, which holds things a human chose to write; this holds what
-- the system observed.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id),
  student_id  TEXT REFERENCES users(id),      -- the file this concerns
  actor_id    TEXT REFERENCES users(id),      -- who did it; NULL when the system did
  actor_label TEXT NOT NULL,                  -- kept verbatim so a deleted staff account still reads
  kind        TEXT NOT NULL,                  -- account.created | stage.changed | doc.uploaded | ...
  summary     TEXT NOT NULL,                  -- one line, already written for a human
  detail      TEXT,                           -- optional JSON for the expanded view
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_student ON activity_log(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_tenant  ON activity_log(tenant_id, created_at DESC);

-- ===========================================================================
-- Per-student feature control
--
-- tenant_modules decides what a consultancy has bought. This decides what a
-- given student has been given. A counsellor turns the mock interview on for
-- the student sitting a visa interview next month and leaves it off for the
-- one still choosing a country, so nobody is handed a wall of tools they do
-- not need yet.
--
-- Absence of a row means "follow the consultancy default", so this table only
-- ever holds deliberate exceptions.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS student_modules (
  student_id TEXT NOT NULL REFERENCES users(id),
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  module_id  TEXT NOT NULL,
  enabled    INTEGER NOT NULL,
  set_by     TEXT REFERENCES users(id),
  set_at     TEXT NOT NULL,
  PRIMARY KEY (student_id, module_id)
);

-- ===========================================================================
-- Invitations
--
-- A student never signs themselves up. The consultancy enters their email or
-- phone, and the system issues credentials and sends them. This records that
-- send so staff can see whether it arrived, resend it, and prove it went.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS student_invites (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id),
  student_id  TEXT NOT NULL REFERENCES users(id),
  sent_to     TEXT NOT NULL,                  -- the address or number it went to
  channel     TEXT NOT NULL DEFAULT 'email',  -- email | sms
  sent_by     TEXT REFERENCES users(id),
  status      TEXT NOT NULL DEFAULT 'sent',   -- sent | failed | accepted
  accepted_at TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invites_student ON student_invites(student_id, created_at DESC);


-- ===========================================================================
-- Free-tool usage, counted and nothing more
--
-- Which of the free calculators actually bring people in is a real business
-- question. It decides what to build next and what to write guides about.
--
-- This answers it with a counter and refuses to answer anything else. One row
-- per tool per day holding two integers. No identifier, no IP, no session, no
-- user agent, nothing that could be joined back to a person even by someone
-- with the database in front of them. It cannot tell you who used the cost
-- calculator, and that is deliberate: the tools are advertised as needing no
-- account and no phone number, and quietly fingerprinting people who took us
-- at our word would make that a lie.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS tool_usage (
  tool_id   TEXT NOT NULL,
  day       TEXT NOT NULL,            -- YYYY-MM-DD
  opened    INTEGER NOT NULL DEFAULT 0,  -- landed on the tool
  completed INTEGER NOT NULL DEFAULT 0,  -- got an answer out of it
  PRIMARY KEY (tool_id, day)
);


-- ===========================================================================
-- Partners, applications and commission
--
-- The gap that keeps a consultancy's old system open. They will not close it
-- while the money still lives there.
--
-- One design decision is carried over deliberately from Happy Panda's CRM,
-- because it is the right one: commission is never visible to a counsellor.
-- A counsellor who can see which institution pays best is a counsellor under
-- quiet pressure to send students there. What they see instead is `priority`,
-- an explicit ranking the owner sets, which can account for how fast an
-- institution issues offers and how its students actually fare, not only what
-- it pays. See src/modules/partners/data.ts, where the column lists are
-- written out so a commission column cannot leak by being added later.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS partners (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  name            TEXT NOT NULL,
  country         TEXT,
  city            TEXT,
  website         TEXT,
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,

  -- Owner only. Percentage of first year tuition, as agreed. Nullable,
  -- because plenty of institutions are worked with before any agreement.
  commission_rate REAL,
  commission_note TEXT,

  -- What a counsellor sees instead. 1 is "send first".
  priority        INTEGER,
  priority_note   TEXT,

  status          TEXT NOT NULL DEFAULT 'active',   -- active | prospect | ended
  note            TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_partners_tenant ON partners(tenant_id, status);

-- One row per application, because a student applies to several places at
-- once and each one moves on its own timetable. The student's pipeline stage
-- is the summary; this is the detail underneath it.
CREATE TABLE IF NOT EXISTS applications (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id),
  student_id    TEXT NOT NULL REFERENCES users(id),
  partner_id    TEXT REFERENCES partners(id),
  -- Kept as text as well as a link, so the history still reads correctly if a
  -- partner row is later removed.
  institution   TEXT NOT NULL,
  course        TEXT,
  destination   TEXT,
  intake        TEXT,
  status        TEXT NOT NULL DEFAULT 'planned',
                -- planned | submitted | offer | conditional | rejected
                -- | accepted | deferred | withdrawn
  tuition_npr   INTEGER,
  deadline      TEXT,
  note          TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_applications_student ON applications(student_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_tenant  ON applications(tenant_id, status);

-- What an institution owes, and whether it has arrived. Owner only, in full.
CREATE TABLE IF NOT EXISTS commissions (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES tenants(id),
  application_id TEXT REFERENCES applications(id),
  partner_id     TEXT REFERENCES partners(id),
  student_id     TEXT REFERENCES users(id),
  expected_npr   INTEGER NOT NULL DEFAULT 0,
  received_npr   INTEGER,
  status         TEXT NOT NULL DEFAULT 'expected',  -- expected | invoiced | received | written_off
  invoiced_on    TEXT,
  received_on    TEXT,
  note           TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_commissions_tenant ON commissions(tenant_id, status);


-- ===========================================================================
-- Branches
--
-- A consultancy of any size has offices. KIEC has sixteen. Each one has its
-- own staff and its own students, and head office wants the sum of all of
-- them without having to ask.
--
-- This sits between the tenant and everything else. One tenant still means
-- one subdomain, one plan and one bill; branches divide the work underneath
-- that, they are not separate customers.
--
-- Access follows one rule, enforced in Scope rather than remembered at each
-- call site: a branch sees its own, head office sees all.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS branches (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES tenants(id),
  name           TEXT NOT NULL,
  -- Short code used in listings and payroll references, e.g. "PKR".
  code           TEXT,
  city           TEXT,
  address        TEXT,
  phone          TEXT,
  email          TEXT,
  -- Exactly one per tenant should carry this. Head office staff see every
  -- branch; everyone else sees their own.
  is_head_office INTEGER NOT NULL DEFAULT 0,
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id, active);

-- Teams inside a branch, so a task can be given to "the visa desk" rather
-- than to a named person who might be on leave.
CREATE TABLE IF NOT EXISTS teams (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  branch_id  TEXT REFERENCES branches(id),
  name       TEXT NOT NULL,
  note       TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_teams_tenant ON teams(tenant_id, branch_id);


-- ===========================================================================
-- Alerts: the in-app bell
--
-- Deliberately not called notifications, because that table already exists in
-- this schema and is the outbox for email and SMS. The two are different
-- things and conflating them would confuse every reader afterwards.
--
--   notifications  something we sent to a person, outside the app
--   alerts         something waiting for a person, inside the app
--
-- An alert is cheap and disposable. It is not a record of anything; the
-- activity log is. If an alert is lost nothing of consequence is lost.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS alerts (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  branch_id  TEXT REFERENCES branches(id),
  -- Who should see it. A team alert has user_id NULL and team_id set, so
  -- everyone on that team sees it until one of them clears it.
  user_id    TEXT REFERENCES users(id),
  team_id    TEXT REFERENCES teams(id),
  kind       TEXT NOT NULL,          -- task.assigned | doc.uploaded | deadline.near | ...
  title      TEXT NOT NULL,
  body       TEXT,
  -- Where clicking it should go.
  href       TEXT,
  -- Stops the nightly jobs stacking the same alert up night after night.
  dedupe_key TEXT,
  read_at    TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_team ON alerts(team_id, read_at, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_dedupe ON alerts(dedupe_key) WHERE dedupe_key IS NOT NULL;

-- ===========================================================================
-- Tasks
--
-- The pipeline has one next_action per student, which is one task per file and
-- no way for anyone to see their own day. This is the table a counsellor
-- actually works from.
--
-- A task points at a person or at a team, never both. A team task is how work
-- survives somebody being on leave: it sits with the visa desk rather than
-- with Bikash, and whoever picks it up claims it.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id           TEXT PRIMARY KEY,
  tenant_id    TEXT NOT NULL REFERENCES tenants(id),
  branch_id    TEXT REFERENCES branches(id),
  title        TEXT NOT NULL,
  detail       TEXT,
  -- Exactly one of these two carries the work.
  assignee_id  TEXT REFERENCES users(id),
  team_id      TEXT REFERENCES teams(id),
  -- Optional: most tasks are about a student, some are about the office.
  student_id   TEXT REFERENCES users(id),
  due_on       TEXT,
  priority     TEXT NOT NULL DEFAULT 'normal',   -- low | normal | urgent
  status       TEXT NOT NULL DEFAULT 'open',     -- open | done | dropped
  done_at      TEXT,
  done_by      TEXT REFERENCES users(id),
  created_by   TEXT REFERENCES users(id),
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id, status, due_on);
CREATE INDEX IF NOT EXISTS idx_tasks_team     ON tasks(team_id, status, due_on);
CREATE INDEX IF NOT EXISTS idx_tasks_branch   ON tasks(tenant_id, branch_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_student  ON tasks(student_id, status);

-- Who is on which team. A person can sit on more than one.
CREATE TABLE IF NOT EXISTS team_members (
  team_id   TEXT NOT NULL REFERENCES teams(id),
  user_id   TEXT NOT NULL REFERENCES users(id),
  joined_at TEXT NOT NULL,
  PRIMARY KEY (team_id, user_id)
);


-- ===========================================================================
-- Attendance
--
-- One rule decided this whole design, and it is worth stating before the
-- tables: signing in is not attendance.
--
-- Opening the console is something somebody does from a desk, from a phone on
-- the bus, or at home on a Sunday to look a student up. Clocking in is the
-- deliberate act that says a working day has started. They are different
-- events and the system must not conflate them.
--
-- It follows that sign-in never asks for location and the clock always does.
-- Stopping somebody reading a student file from home achieves nothing;
-- stopping a working day being clocked from somewhere that is not work is the
-- thing that was always meant.
-- ===========================================================================

-- Every clock event, allowed or refused. Append-only: a refusal is as much a
-- part of the record as a success, and a register that only keeps the
-- successes cannot answer why somebody's day looks short.
CREATE TABLE IF NOT EXISTS attendance (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id),
  branch_id   TEXT REFERENCES branches(id),
  user_id     TEXT NOT NULL REFERENCES users(id),
  kind        TEXT NOT NULL,                    -- clock_in | clock_out
  decision    TEXT NOT NULL DEFAULT 'allowed',  -- allowed | denied
  -- Why a refusal was a refusal, or why somebody was let in from outside the
  -- radius. Required in the second case.
  reason      TEXT,
  lat         REAL,
  lng         REAL,
  accuracy_m  REAL,
  distance_m  REAL,
  within      INTEGER NOT NULL DEFAULT 0,
  ip          TEXT,
  user_agent  TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_branch ON attendance(tenant_id, branch_id, created_at DESC);

-- A worked day, opened by a clock-in and closed by a clock-out.
CREATE TABLE IF NOT EXISTS shifts (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  branch_id  TEXT REFERENCES branches(id),
  user_id    TEXT NOT NULL REFERENCES users(id),
  -- Local date, so "today" is one lookup rather than a range scan.
  day        TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at   TEXT,
  -- Written once on clock-out so a report never recomputes it, and so an
  -- edit to the clock events later cannot silently change a past month.
  minutes    INTEGER,
  note       TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shifts_user_day ON shifts(user_id, day);
CREATE INDEX IF NOT EXISTS idx_shifts_branch ON shifts(tenant_id, branch_id, day);

-- Dashain, Tihar, and whatever else the office closes for. Per branch,
-- because a Pokhara office and a Kathmandu one do not always close on the
-- same days.
CREATE TABLE IF NOT EXISTS holidays (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  branch_id  TEXT REFERENCES branches(id),
  date       TEXT NOT NULL,
  name       TEXT NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'public',   -- public | festival | office
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_holidays ON holidays(tenant_id, date);

CREATE TABLE IF NOT EXISTS leave_requests (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id),
  branch_id     TEXT REFERENCES branches(id),
  user_id       TEXT NOT NULL REFERENCES users(id),
  kind          TEXT NOT NULL DEFAULT 'annual',  -- annual | sick | unpaid | other
  start_date    TEXT NOT NULL,
  end_date      TEXT NOT NULL,
  -- Working days, worked out when the request is made and then stored, so a
  -- later change to the holiday calendar cannot silently alter a request that
  -- has already been approved.
  days          REAL NOT NULL DEFAULT 1,
  half_day      INTEGER NOT NULL DEFAULT 0,
  reason        TEXT,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | approved | refused | cancelled
  decided_by    TEXT REFERENCES users(id),
  decided_at    TEXT,
  decision_note TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leave_user ON leave_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_branch ON leave_requests(tenant_id, branch_id, status);

CREATE TABLE IF NOT EXISTS leave_balances (
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  user_id    TEXT NOT NULL REFERENCES users(id),
  year       INTEGER NOT NULL,
  kind       TEXT NOT NULL,
  entitled   REAL NOT NULL DEFAULT 0,
  note       TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, year, kind)
);


-- ===========================================================================
-- Employees and payroll
--
-- Split across two tables on purpose, and the split is the important part.
--
-- `employees` is the HR record every manager needs: position, joining date,
-- contacts, next of kin. It holds a salary BAND, not a figure. An exact salary
-- sitting in a CRM that every counsellor can reach through some future bug is
-- a liability nobody needs, and a band answers every question a manager
-- actually asks of an HR record.
--
-- `payroll_people` holds the real numbers, and is read only by whoever can run
-- payroll.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS employees (
  user_id         TEXT PRIMARY KEY REFERENCES users(id),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id),
  branch_id       TEXT REFERENCES branches(id),
  position        TEXT,
  joined_on       TEXT,
  date_of_birth   TEXT,
  phone           TEXT,
  address         TEXT,
  emergency_name  TEXT,
  emergency_phone TEXT,
  employment_type TEXT NOT NULL DEFAULT 'full_time',  -- full_time | part_time | contract | intern
  -- A band, never a figure. See the note above.
  salary_band     TEXT,
  notes           TEXT,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(tenant_id, branch_id);

-- Prior roles, so a staff history can be kept the way a CV holds one.
CREATE TABLE IF NOT EXISTS employee_experience (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  tenant_id    TEXT NOT NULL REFERENCES tenants(id),
  organisation TEXT NOT NULL,
  role         TEXT,
  started_on   TEXT,
  ended_on     TEXT,
  summary      TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_experience_user ON employee_experience(user_id, started_on DESC);

-- The pay figures. Owner only.
CREATE TABLE IF NOT EXISTS payroll_people (
  id               TEXT PRIMARY KEY,
  tenant_id        TEXT NOT NULL REFERENCES tenants(id),
  branch_id        TEXT REFERENCES branches(id),
  user_id          TEXT REFERENCES users(id),
  name             TEXT NOT NULL,
  position         TEXT,
  monthly_salary   INTEGER,
  bank_name        TEXT,
  bank_account     TEXT,
  pan              TEXT,
  -- Decides which deduction applies. ssf | pf | none.
  pay_scheme       TEXT NOT NULL DEFAULT 'ssf',
  active           INTEGER NOT NULL DEFAULT 1,
  note             TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payroll_people ON payroll_people(tenant_id, branch_id, active);

-- One run per branch per month.
CREATE TABLE IF NOT EXISTS payroll_runs (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  branch_id  TEXT REFERENCES branches(id),
  -- "2083-03" for Ashar 2083, or "2026-07" for a Gregorian run. A Nepali month
  -- and a Gregorian one can never collide, because 2083 is not a Gregorian
  -- year anybody is running payroll for.
  month      TEXT NOT NULL,
  -- bs for a Nepali month, ad for a Gregorian one. Salary in Nepal is paid by
  -- the Nepali month, so bs is the default.
  calendar   TEXT NOT NULL DEFAULT 'bs',
  -- draft while it is being worked on, paid once it has gone out. A paid run
  -- is locked, and is the only kind staff can see.
  status     TEXT NOT NULL DEFAULT 'draft',
  note       TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  paid_by    TEXT REFERENCES users(id),
  paid_at    TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_run_month
  ON payroll_runs(tenant_id, branch_id, month);

CREATE TABLE IF NOT EXISTS payroll_lines (
  id          TEXT PRIMARY KEY,
  run_id      TEXT NOT NULL REFERENCES payroll_runs(id),
  person_id   TEXT NOT NULL REFERENCES payroll_people(id),

  -- Earnings.
  basic       INTEGER NOT NULL DEFAULT 0,
  allowance   INTEGER NOT NULL DEFAULT 0,
  bonus       INTEGER NOT NULL DEFAULT 0,

  -- Deductions, each as the accountant gives them. These are the real Nepali
  -- components, not a generic gross-minus-tax.
  ssf         INTEGER NOT NULL DEFAULT 0,
  pf          INTEGER NOT NULL DEFAULT 0,
  tds         INTEGER NOT NULL DEFAULT 0,
  cit         INTEGER NOT NULL DEFAULT 0,
  advance     INTEGER NOT NULL DEFAULT 0,
  other       INTEGER NOT NULL DEFAULT 0,
  other_label TEXT,

  note        TEXT,

  -- The register as it stood when the run was prepared. Copied rather than
  -- looked up later, because a payslip has to keep saying what it said on the
  -- day it was issued, even after somebody approves a late clock-in a week
  -- afterwards.
  days_expected INTEGER,
  days_present  INTEGER,
  days_absent   INTEGER,

  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_run ON payroll_lines(run_id);

/*
 * Which automations a consultancy wants.
 *
 * Absence of a row means the rule's own default, so a new consultancy gets a
 * sensible post without anybody configuring anything, and switching one off
 * is a real row rather than a guess.
 */
CREATE TABLE IF NOT EXISTS tenant_automations (
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  rule_id    TEXT NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, rule_id)
);

/* What each automation did, each time it ran. An owner asking "why did this
   not send" gets an answer instead of a shrug. */
CREATE TABLE IF NOT EXISTS automation_runs (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  rule_id    TEXT NOT NULL,
  ran_at     TEXT NOT NULL,
  considered INTEGER NOT NULL DEFAULT 0,
  queued     INTEGER NOT NULL DEFAULT 0,
  error      TEXT
);
CREATE INDEX IF NOT EXISTS idx_automation_runs ON automation_runs(tenant_id, rule_id, ran_at DESC);

/*
 * One person's exceptions to their position.
 *
 * A row is a deliberate decision by an admin: this person, this capability,
 * granted or refused, whatever their job title says. No row means "follow the
 * position", which is why a removed exception is a deleted row rather than a
 * stored false.
 */
CREATE TABLE IF NOT EXISTS user_permissions (
  user_id    TEXT NOT NULL REFERENCES users(id),
  perm       TEXT NOT NULL,
  allow      INTEGER NOT NULL,
  set_by     TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, perm)
);

/*
 * The audit trail: who looked at something private, and who changed what.
 *
 * Never holds the private thing itself, only the fact that it was touched.
 * Nothing in the product deletes from this table.
 */
CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  actor_id   TEXT REFERENCES users(id),
  action     TEXT NOT NULL,
  subject_id TEXT,
  detail     TEXT,
  ip         TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(tenant_id, action, created_at DESC);

/*
 * Getting back in after forgetting a password.
 *
 * The token is stored hashed, for the same reason a password is: a database
 * that leaks must not hand somebody a working key to every account. It is
 * single use, short lived, and the row is kept after use so a person can see
 * that a reset happened on their account.
 */
CREATE TABLE IF NOT EXISTS password_resets (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  requested_ip TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_resets_token ON password_resets(token_hash);
