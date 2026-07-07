-- Phase 6 - Internship / tirocini workflow.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'internship_opportunity_status') THEN
    CREATE TYPE internship_opportunity_status AS ENUM ('draft', 'open', 'closed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'internship_application_status') THEN
    CREATE TYPE internship_application_status AS ENUM (
      'submitted',
      'approved',
      'in_progress',
      'report_submitted',
      'evaluated',
      'closed',
      'refused'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS internship_opportunities (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                 TEXT NOT NULL,
  company_name          TEXT NOT NULL,
  location              TEXT,
  description           TEXT,
  requirements          TEXT,
  tutor_name            TEXT,
  tutor_email           TEXT,
  start_date            DATE,
  end_date              DATE,
  cfu                   INT NOT NULL DEFAULT 0 CHECK (cfu >= 0),
  application_deadline  DATE,
  status                internship_opportunity_status NOT NULL DEFAULT 'draft',
  created_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
);

CREATE TABLE IF NOT EXISTS internship_applications (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id        UUID NOT NULL REFERENCES internship_opportunities(id) ON DELETE CASCADE,
  student_id            UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status                internship_application_status NOT NULL DEFAULT 'submitted',
  motivation            TEXT,
  report_url            TEXT,
  evaluation_score      INT CHECK (evaluation_score BETWEEN 0 AND 30),
  evaluation_feedback   TEXT,
  evaluated_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  applied_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at           TIMESTAMPTZ,
  started_at            TIMESTAMPTZ,
  report_submitted_at   TIMESTAMPTZ,
  evaluated_at          TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (opportunity_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_internship_opportunities_status_deadline
  ON internship_opportunities(status, application_deadline);

CREATE INDEX IF NOT EXISTS idx_internship_applications_student_status
  ON internship_applications(student_id, status, applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_internship_applications_status
  ON internship_applications(status, applied_at DESC);

DROP TRIGGER IF EXISTS trg_internship_opportunities_updated_at ON internship_opportunities;
CREATE TRIGGER trg_internship_opportunities_updated_at
  BEFORE UPDATE ON internship_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_internship_applications_updated_at ON internship_applications;
CREATE TRIGGER trg_internship_applications_updated_at
  BEFORE UPDATE ON internship_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE internship_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE internship_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "internship_opportunities_read" ON internship_opportunities;
CREATE POLICY "internship_opportunities_read"
  ON internship_opportunities FOR SELECT
  USING (
    status = 'open'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'secretary')
    )
  );

DROP POLICY IF EXISTS "internship_opportunities_write_staff" ON internship_opportunities;
CREATE POLICY "internship_opportunities_write_staff"
  ON internship_opportunities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'secretary')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'secretary')
    )
  );

DROP POLICY IF EXISTS "internship_applications_read_own_or_staff" ON internship_applications;
CREATE POLICY "internship_applications_read_own_or_staff"
  ON internship_applications FOR SELECT
  USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'secretary')
    )
  );

DROP POLICY IF EXISTS "internship_applications_insert_own" ON internship_applications;
CREATE POLICY "internship_applications_insert_own"
  ON internship_applications FOR INSERT
  WITH CHECK (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "internship_applications_update_own_report" ON internship_applications;
CREATE POLICY "internship_applications_update_own_report"
  ON internship_applications FOR UPDATE
  USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'secretary')
    )
  )
  WITH CHECK (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'secretary')
    )
  );
