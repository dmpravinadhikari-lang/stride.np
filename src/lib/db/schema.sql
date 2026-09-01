-- ---------------------------------------------------------------------------
-- STRIDE database schema.
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
  accent_color   TEXT NOT NULL DEFAULT '#0F4C5C',
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
-- before they can be published — a paper is only sat by students once it is
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
-- abroad will not create a login, remember a password, or install anything —
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
-- A request, not a transaction. STRIDE is not a reseller for IDP, the British
-- Council or Pearson, so nothing here takes money or claims to hold a seat.
-- The student says what they want, the consultancy books it and records the
-- confirmation — which is exactly what already happens over the phone, minus
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
-- — to the student, to the parent paying, and to the owner asking why a file
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
-- question — it decides what to build next and what to write guides about.
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
