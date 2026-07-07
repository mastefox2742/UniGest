-- Phase 6 - LMS completion: announcements and progress indexes.

CREATE TABLE IF NOT EXISTS elearning_announcements (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elearning_course_id  UUID NOT NULL REFERENCES elearning_courses(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  body                 TEXT NOT NULL,
  is_pinned            BOOLEAN NOT NULL DEFAULT FALSE,
  published_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (char_length(title) BETWEEN 1 AND 200),
  CHECK (char_length(body) BETWEEN 1 AND 5000)
);

CREATE INDEX IF NOT EXISTS idx_elearning_announcements_course_published
  ON elearning_announcements(elearning_course_id, is_pinned DESC, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_elearning_progress_student_seen
  ON student_elearning_progress(student_id, last_seen_at DESC);

DROP TRIGGER IF EXISTS trg_elearning_announcements_updated_at ON elearning_announcements;
CREATE TRIGGER trg_elearning_announcements_updated_at
  BEFORE UPDATE ON elearning_announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE elearning_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "elearning_announcements_read_published_or_staff" ON elearning_announcements;
CREATE POLICY "elearning_announcements_read_published_or_staff"
  ON elearning_announcements FOR SELECT
  USING (
    elearning_course_id IN (
      SELECT id FROM elearning_courses WHERE is_published = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'secretary')
    )
  );

DROP POLICY IF EXISTS "elearning_announcements_write_staff" ON elearning_announcements;
CREATE POLICY "elearning_announcements_write_staff"
  ON elearning_announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );
