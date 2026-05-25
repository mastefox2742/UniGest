-- ============================================================
-- UniGest — Migration 00004 : Vues
-- ============================================================

-- ─── libretto (carnet de notes officiel) ─────────────────────────────────────
CREATE OR REPLACE VIEW libretto AS
SELECT
  g.id,
  s.matricola,
  p.first_name || ' ' || p.last_name   AS student_name,
  dp.name                               AS degree_program,
  dp.type                               AS degree_type,
  c.code                                AS course_code,
  c.name                                AS course_name,
  c.cfu,
  c.year                                AS course_year,
  c.semester,
  CASE WHEN g.is_honors THEN '30L'
       ELSE g.value::TEXT END           AS grade,
  g.status                              AS grade_status,
  g.published_at,
  es.date                               AS exam_date,
  tp.first_name || ' ' || tp.last_name AS teacher_name
FROM grades g
JOIN students s       ON s.id = g.student_id
JOIN profiles p       ON p.id = s.user_id
JOIN degree_programs dp ON dp.id = s.degree_program_id
JOIN courses c        ON c.id = g.course_id
JOIN exam_sessions es ON es.id = g.exam_session_id
JOIN teachers t       ON t.id = c.teacher_id
JOIN profiles tp      ON tp.id = t.user_id
WHERE g.status = 'published';

-- ─── student_dashboard (données consolidées) ──────────────────────────────────
CREATE OR REPLACE VIEW student_dashboard AS
SELECT
  s.id                                          AS student_id,
  s.matricola,
  p.first_name || ' ' || p.last_name            AS full_name,
  p.email,
  dp.name                                       AS degree_program,
  dp.total_cfu,
  s.total_cfu_earned,
  ROUND(s.total_cfu_earned::NUMERIC / NULLIF(dp.total_cfu, 0) * 100, 1)
                                                AS cfu_progress_pct,
  s.gpa,
  s.current_year,
  s.enrollment_year,
  s.status,
  -- Prochain examen
  (
    SELECT es.date
    FROM exam_bookings eb
    JOIN exam_sessions es ON es.id = eb.exam_session_id
    WHERE eb.student_id = s.id
      AND eb.status = 'booked'
      AND es.date > NOW()
    ORDER BY es.date ASC
    LIMIT 1
  ) AS next_exam_date,
  -- Total frais en attente
  (
    SELECT COALESCE(SUM(tf.amount + COALESCE(tf.late_fee, 0)), 0)
    FROM tuition_fees tf
    WHERE tf.student_id = s.id
      AND tf.status IN ('pending', 'overdue')
  ) AS pending_fees_total
FROM students s
JOIN profiles p          ON p.id = s.user_id
JOIN degree_programs dp  ON dp.id = s.degree_program_id;

-- ─── teacher_dashboard (vue enseignant) ───────────────────────────────────────
CREATE OR REPLACE VIEW teacher_dashboard AS
SELECT
  t.id                                          AS teacher_id,
  p.first_name || ' ' || p.last_name            AS full_name,
  d.name                                        AS department,
  t.title,
  COUNT(DISTINCT c.id)                          AS total_courses,
  COUNT(DISTINCT ce.student_id)                 AS total_students,
  COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'proposed')
                                                AS pending_grades
FROM teachers t
JOIN profiles p    ON p.id = t.user_id
JOIN departments d ON d.id = t.department_id
LEFT JOIN courses c ON c.teacher_id = t.id
LEFT JOIN course_enrollments ce ON ce.course_id = c.id
LEFT JOIN grades g  ON g.course_id = c.id
GROUP BY t.id, p.first_name, p.last_name, d.name, t.title;
