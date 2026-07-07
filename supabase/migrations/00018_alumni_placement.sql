-- Phase 6 - Alumni and placement outcomes.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alumni_employment_status') THEN
    CREATE TYPE alumni_employment_status AS ENUM (
      'seeking',
      'employed',
      'self_employed',
      'continuing_studies',
      'not_available'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS alumni_profiles (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id                  UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  graduation_year             INT CHECK (graduation_year BETWEEN 1900 AND 2100),
  current_city                TEXT,
  current_country             TEXT,
  linkedin_url                TEXT,
  consent_placement_tracking  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS placement_surveys (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alumni_profile_id   UUID NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
  survey_year         INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,
  employment_status   alumni_employment_status NOT NULL,
  company_name        TEXT,
  job_title           TEXT,
  contract_type       TEXT,
  sector              TEXT,
  salary_range        TEXT CHECK (
    salary_range IS NULL OR salary_range IN ('<20k', '20-30k', '30-40k', '40-60k', '60k+', 'non_disclosed')
  ),
  employed_at         DATE,
  notes               TEXT,
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (alumni_profile_id, survey_year),
  CHECK (
    employment_status NOT IN ('employed', 'self_employed')
    OR company_name IS NOT NULL
    OR job_title IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_alumni_profiles_graduation_year
  ON alumni_profiles(graduation_year);

CREATE INDEX IF NOT EXISTS idx_placement_surveys_status_year
  ON placement_surveys(employment_status, survey_year DESC);

CREATE INDEX IF NOT EXISTS idx_placement_surveys_sector
  ON placement_surveys(sector);

DROP TRIGGER IF EXISTS trg_alumni_profiles_updated_at ON alumni_profiles;
CREATE TRIGGER trg_alumni_profiles_updated_at
  BEFORE UPDATE ON alumni_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_placement_surveys_updated_at ON placement_surveys;
CREATE TRIGGER trg_placement_surveys_updated_at
  BEFORE UPDATE ON placement_surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE alumni_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alumni_profiles_read_own_or_staff" ON alumni_profiles;
CREATE POLICY "alumni_profiles_read_own_or_staff"
  ON alumni_profiles FOR SELECT
  USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'secretary')
    )
  );

DROP POLICY IF EXISTS "alumni_profiles_write_own" ON alumni_profiles;
CREATE POLICY "alumni_profiles_write_own"
  ON alumni_profiles FOR INSERT
  WITH CHECK (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "alumni_profiles_update_own_or_staff" ON alumni_profiles;
CREATE POLICY "alumni_profiles_update_own_or_staff"
  ON alumni_profiles FOR UPDATE
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

DROP POLICY IF EXISTS "placement_surveys_read_own_or_staff" ON placement_surveys;
CREATE POLICY "placement_surveys_read_own_or_staff"
  ON placement_surveys FOR SELECT
  USING (
    alumni_profile_id IN (
      SELECT ap.id
      FROM alumni_profiles ap
      JOIN students s ON s.id = ap.student_id
      WHERE s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'secretary')
    )
  );

DROP POLICY IF EXISTS "placement_surveys_write_own" ON placement_surveys;
CREATE POLICY "placement_surveys_write_own"
  ON placement_surveys FOR INSERT
  WITH CHECK (
    alumni_profile_id IN (
      SELECT ap.id
      FROM alumni_profiles ap
      JOIN students s ON s.id = ap.student_id
      WHERE s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "placement_surveys_update_own_or_staff" ON placement_surveys;
CREATE POLICY "placement_surveys_update_own_or_staff"
  ON placement_surveys FOR UPDATE
  USING (
    alumni_profile_id IN (
      SELECT ap.id
      FROM alumni_profiles ap
      JOIN students s ON s.id = ap.student_id
      WHERE s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'secretary')
    )
  )
  WITH CHECK (
    alumni_profile_id IN (
      SELECT ap.id
      FROM alumni_profiles ap
      JOIN students s ON s.id = ap.student_id
      WHERE s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'secretary')
    )
  );
