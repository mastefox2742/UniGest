-- ============================================================
-- UniGest - Migration 00010 : garde-fous appelli/prenotazioni
-- ============================================================

-- Une session ne doit pas fermer ses inscriptions apres son debut.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exam_sessions_registration_before_date'
  ) THEN
    ALTER TABLE exam_sessions
      ADD CONSTRAINT exam_sessions_registration_before_date
      CHECK (registration_deadline < date);
  END IF;
END $$;

-- Accelere les listes et filtres d'appelli par cours/date.
CREATE INDEX IF NOT EXISTS idx_exam_sessions_course_date
  ON exam_sessions(course_id, date);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_registration_deadline
  ON exam_sessions(registration_deadline);

-- Accelere le comptage des places actives et les listes "mes prenotations".
CREATE INDEX IF NOT EXISTS idx_exam_bookings_session_active
  ON exam_bookings(exam_session_id)
  WHERE status = 'booked';

CREATE INDEX IF NOT EXISTS idx_exam_bookings_student_status
  ON exam_bookings(student_id, status, booked_at DESC);

-- Expose un compteur stable pour les vues API/web/mobile.
CREATE OR REPLACE VIEW exam_session_booking_counts AS
SELECT
  es.id AS exam_session_id,
  COUNT(eb.id) FILTER (WHERE eb.status = 'booked')::INT AS booked_count,
  CASE
    WHEN es.max_students IS NULL THEN NULL
    ELSE GREATEST(es.max_students - COUNT(eb.id) FILTER (WHERE eb.status = 'booked'), 0)::INT
  END AS seats_available
FROM exam_sessions es
LEFT JOIN exam_bookings eb ON eb.exam_session_id = es.id
GROUP BY es.id, es.max_students;
