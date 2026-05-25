-- ============================================================
-- UniGest — Migration 00001 : Schéma initial (42 tables)
-- ============================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ─── Enums ────────────────────────────────────────────────────────────────────
CREATE TYPE user_role       AS ENUM ('student','teacher','secretary','admin');
CREATE TYPE student_status  AS ENUM ('pre_enrolled','enrolled','active','suspended','graduated','withdrawn');
CREATE TYPE degree_type     AS ENUM ('bachelor','master','phd','single_cycle');
CREATE TYPE grade_status    AS ENUM ('proposed','accepted','rejected','published');
CREATE TYPE booking_status  AS ENUM ('booked','cancelled','present','absent','graded');
CREATE TYPE fee_status      AS ENUM ('pending','paid','overdue','waived');
CREATE TYPE thesis_status   AS ENUM ('proposed','approved','in_progress','submitted','defended','rejected');
CREATE TYPE doc_type        AS ENUM ('id_card','passport','diploma','transcript','photo','other');
CREATE TYPE cert_type       AS ENUM ('enrollment','transcript','degree','attendance','other');
CREATE TYPE material_type   AS ENUM ('video','pdf','slide','link','zip','other');
CREATE TYPE app_status      AS ENUM ('draft','pending','approved','rejected');

-- ─── 1. universities ──────────────────────────────────────────────────────────
CREATE TABLE universities (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  short_name TEXT NOT NULL,
  address    TEXT,
  website    TEXT,
  logo_url   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. academic_years ────────────────────────────────────────────────────────
CREATE TABLE academic_years (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id  UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,          -- e.g. "2024/2025"
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  is_current     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(university_id, label)
);

-- ─── 3. faculties ─────────────────────────────────────────────────────────────
CREATE TABLE faculties (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  code          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(university_id, code)
);

-- ─── 4. departments ───────────────────────────────────────────────────────────
CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  faculty_id  UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(faculty_id, code)
);

-- ─── 5. degree_programs ───────────────────────────────────────────────────────
CREATE TABLE degree_programs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id  UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  code           TEXT NOT NULL UNIQUE,
  type           degree_type NOT NULL,
  duration_years INT NOT NULL CHECK (duration_years BETWEEN 1 AND 6),
  total_cfu      INT NOT NULL CHECK (total_cfu > 0),
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 6. profiles (étend auth.users) ──────────────────────────────────────────
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'student',
  first_name  TEXT NOT NULL DEFAULT '',
  last_name   TEXT NOT NULL DEFAULT '',
  avatar_url  TEXT,
  phone       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 7. students ──────────────────────────────────────────────────────────────
CREATE TABLE students (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  matricola         TEXT UNIQUE,
  status            student_status NOT NULL DEFAULT 'pre_enrolled',
  enrollment_year   INT NOT NULL,
  degree_program_id UUID NOT NULL REFERENCES degree_programs(id),
  current_year      INT NOT NULL DEFAULT 1 CHECK (current_year BETWEEN 1 AND 6),
  total_cfu_earned  INT NOT NULL DEFAULT 0,
  gpa               NUMERIC(4,2) NOT NULL DEFAULT 0,
  date_of_birth     DATE,
  place_of_birth    TEXT,
  nationality       TEXT,
  tax_code          TEXT UNIQUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 8. teachers ──────────────────────────────────────────────────────────────
CREATE TABLE teachers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id      TEXT UNIQUE,
  department_id    UUID NOT NULL REFERENCES departments(id),
  title            TEXT NOT NULL DEFAULT 'Prof.',
  office_location  TEXT,
  office_hours     TEXT,
  bio              TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 9. secretaries ───────────────────────────────────────────────────────────
CREATE TABLE secretaries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  faculty_id  UUID NOT NULL REFERENCES faculties(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 10. classrooms ───────────────────────────────────────────────────────────
CREATE TABLE classrooms (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  building      TEXT,
  capacity      INT CHECK (capacity > 0),
  has_projector BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 11. courses ──────────────────────────────────────────────────────────────
CREATE TABLE courses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  degree_program_id UUID NOT NULL REFERENCES degree_programs(id) ON DELETE CASCADE,
  teacher_id        UUID NOT NULL REFERENCES teachers(id),
  name              TEXT NOT NULL,
  code              TEXT NOT NULL,
  year              INT NOT NULL CHECK (year BETWEEN 1 AND 6),
  semester          INT NOT NULL CHECK (semester IN (1, 2)),
  cfu               INT NOT NULL CHECK (cfu BETWEEN 1 AND 30),
  description       TEXT,
  syllabus_url      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(degree_program_id, code)
);

-- ─── 12. study_plans ──────────────────────────────────────────────────────────
CREATE TABLE study_plans (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  is_approved      BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at      TIMESTAMPTZ,
  approved_by      UUID REFERENCES secretaries(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, academic_year_id)
);

-- ─── 13. study_plan_courses ───────────────────────────────────────────────────
CREATE TABLE study_plan_courses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  study_plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(study_plan_id, course_id)
);

-- ─── 14. schedule_slots ───────────────────────────────────────────────────────
CREATE TABLE schedule_slots (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id        UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  classroom_id     UUID REFERENCES classrooms(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  day_of_week      INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 15. exam_sessions (appelli) ──────────────────────────────────────────────
CREATE TABLE exam_sessions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id             UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  classroom_id          UUID REFERENCES classrooms(id),
  academic_year_id      UUID NOT NULL REFERENCES academic_years(id),
  date                  TIMESTAMPTZ NOT NULL,
  registration_deadline TIMESTAMPTZ NOT NULL,
  max_students          INT CHECK (max_students > 0),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 16. exam_bookings (prenotazioni) ─────────────────────────────────────────
CREATE TABLE exam_bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  status          booking_status NOT NULL DEFAULT 'booked',
  booked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, exam_session_id)
);

-- ─── 17. grades (verbale elettronico) ─────────────────────────────────────────
CREATE TABLE grades (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id        UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  exam_session_id  UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  exam_booking_id  UUID NOT NULL REFERENCES exam_bookings(id) ON DELETE CASCADE,
  value            INT CHECK (value BETWEEN 18 AND 30),
  is_honors        BOOLEAN NOT NULL DEFAULT FALSE,   -- 30L
  cfu              INT NOT NULL,
  status           grade_status NOT NULL DEFAULT 'proposed',
  proposed_by      UUID NOT NULL REFERENCES teachers(id),
  accepted_at      TIMESTAMPTZ,
  rejected_at      TIMESTAMPTZ,
  published_at     TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, course_id),
  CHECK (value IS NOT NULL OR is_honors = TRUE)
);

-- ─── 18. attendance_records ───────────────────────────────────────────────────
CREATE TABLE attendance_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  schedule_slot_id UUID NOT NULL REFERENCES schedule_slots(id) ON DELETE CASCADE,
  attended        BOOLEAN NOT NULL DEFAULT TRUE,
  date            DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, schedule_slot_id, date)
);

-- ─── 19. enrollment_applications (immatricolazione) ──────────────────────────
CREATE TABLE enrollment_applications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  degree_program_id UUID NOT NULL REFERENCES degree_programs(id),
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id),
  status            app_status NOT NULL DEFAULT 'draft',
  submitted_at      TIMESTAMPTZ,
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       UUID REFERENCES secretaries(id),
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 20. enrollment_documents ────────────────────────────────────────────────
CREATE TABLE enrollment_documents (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES enrollment_applications(id) ON DELETE CASCADE,
  type           doc_type NOT NULL,
  file_name      TEXT NOT NULL,
  file_url       TEXT NOT NULL,
  file_size      INT,
  is_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 21. student_documents ────────────────────────────────────────────────────
CREATE TABLE student_documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type        doc_type NOT NULL,
  file_name   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_size   INT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 22. certificates ────────────────────────────────────────────────────────
CREATE TABLE certificates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type          cert_type NOT NULL,
  issued_by     UUID NOT NULL REFERENCES secretaries(id),
  file_url      TEXT,
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  serial_number TEXT UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 23. tuition_fees (tasse) ─────────────────────────────────────────────────
CREATE TABLE tuition_fees (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  amount           NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  due_date         DATE NOT NULL,
  status           fee_status NOT NULL DEFAULT 'pending',
  paid_at          TIMESTAMPTZ,
  payment_ref      TEXT,
  late_fee         NUMERIC(10,2) DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 24. scholarships ─────────────────────────────────────────────────────────
CREATE TABLE scholarships (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  name             TEXT NOT NULL,
  amount           NUMERIC(10,2) NOT NULL,
  awarded_at       DATE NOT NULL,
  expires_at       DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 25. payments ─────────────────────────────────────────────────────────────
CREATE TABLE payments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_id       UUID REFERENCES tuition_fees(id),
  amount       NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  method       TEXT NOT NULL,             -- 'bank_transfer', 'card', etc.
  reference    TEXT,
  paid_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 26. theses ───────────────────────────────────────────────────────────────
CREATE TABLE theses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id     UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  supervisor_id  UUID NOT NULL REFERENCES teachers(id),
  co_supervisor  UUID REFERENCES teachers(id),
  title          TEXT NOT NULL,
  abstract       TEXT,
  status         thesis_status NOT NULL DEFAULT 'proposed',
  proposed_at    TIMESTAMPTZ,
  approved_at    TIMESTAMPTZ,
  submitted_at   TIMESTAMPTZ,
  defended_at    TIMESTAMPTZ,
  file_url       TEXT,
  grade          INT CHECK (grade BETWEEN 66 AND 110),
  is_honors      BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 27. thesis_milestones ────────────────────────────────────────────────────
CREATE TABLE thesis_milestones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thesis_id   UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    DATE,
  done        BOOLEAN NOT NULL DEFAULT FALSE,
  done_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 28. notifications ────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info',  -- 'info','warning','success','error'
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  link        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 29. elearning_courses ────────────────────────────────────────────────────
CREATE TABLE elearning_courses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id         UUID NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
  is_published      BOOLEAN NOT NULL DEFAULT FALSE,
  welcome_message   TEXT,
  thumbnail_url     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 30. elearning_sections ───────────────────────────────────────────────────
CREATE TABLE elearning_sections (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elearning_course_id UUID NOT NULL REFERENCES elearning_courses(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  position            INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 31. elearning_materials ──────────────────────────────────────────────────
CREATE TABLE elearning_materials (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id  UUID NOT NULL REFERENCES elearning_sections(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  type        material_type NOT NULL,
  url         TEXT,
  content     TEXT,
  duration_s  INT,          -- vidéos : durée en secondes
  position    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 32. elearning_assignments ────────────────────────────────────────────────
CREATE TABLE elearning_assignments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elearning_course_id UUID NOT NULL REFERENCES elearning_courses(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  due_date            TIMESTAMPTZ,
  max_score           INT NOT NULL DEFAULT 100,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 33. elearning_submissions ────────────────────────────────────────────────
CREATE TABLE elearning_submissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES elearning_assignments(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  file_url      TEXT,
  content       TEXT,
  score         INT,
  feedback      TEXT,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  graded_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- ─── 34. elearning_quizzes ────────────────────────────────────────────────────
CREATE TABLE elearning_quizzes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elearning_course_id UUID NOT NULL REFERENCES elearning_courses(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  time_limit_min      INT,
  max_attempts        INT NOT NULL DEFAULT 1,
  pass_score          INT NOT NULL DEFAULT 60,
  is_published        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 35. quiz_questions ───────────────────────────────────────────────────────
CREATE TABLE quiz_questions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id     UUID NOT NULL REFERENCES elearning_quizzes(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  position    INT NOT NULL DEFAULT 0,
  points      INT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 36. quiz_options ─────────────────────────────────────────────────────────
CREATE TABLE quiz_options (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  is_correct  BOOLEAN NOT NULL DEFAULT FALSE,
  position    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 37. quiz_attempts ────────────────────────────────────────────────────────
CREATE TABLE quiz_attempts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id      UUID NOT NULL REFERENCES elearning_quizzes(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score        INT,
  passed       BOOLEAN,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 38. quiz_responses ───────────────────────────────────────────────────────
CREATE TABLE quiz_responses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id  UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_id   UUID REFERENCES quiz_options(id),
  is_correct  BOOLEAN,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

-- ─── 39. forums ───────────────────────────────────────────────────────────────
CREATE TABLE forums (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elearning_course_id UUID NOT NULL REFERENCES elearning_courses(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 40. forum_posts ──────────────────────────────────────────────────────────
CREATE TABLE forum_posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forum_id    UUID NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES forum_posts(id),   -- réponse à un post
  author_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 41. student_elearning_progress ──────────────────────────────────────────
CREATE TABLE student_elearning_progress (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  material_id  UUID NOT NULL REFERENCES elearning_materials(id) ON DELETE CASCADE,
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  progress_pct INT NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  last_seen_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, material_id)
);

-- ─── 42. course_enrollments ───────────────────────────────────────────────────
CREATE TABLE course_enrollments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id  UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);
