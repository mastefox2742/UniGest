-- ============================================================
-- UniGest - Migration 00011 : garde-fous notes et verbali
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grades_honors_requires_30'
  ) THEN
    ALTER TABLE grades
      ADD CONSTRAINT grades_honors_requires_30
      CHECK (is_honors = FALSE OR value = 30);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grades_status_timestamp_consistency'
  ) THEN
    ALTER TABLE grades
      ADD CONSTRAINT grades_status_timestamp_consistency
      CHECK (
        (status <> 'accepted' OR accepted_at IS NOT NULL)
        AND (status <> 'rejected' OR rejected_at IS NOT NULL)
        AND (status <> 'published' OR published_at IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_grades_exam_session_status
  ON grades(exam_session_id, status);

CREATE INDEX IF NOT EXISTS idx_grades_booking
  ON grades(exam_booking_id);

CREATE INDEX IF NOT EXISTS idx_grades_student_pending
  ON grades(student_id, created_at DESC)
  WHERE status = 'proposed';
