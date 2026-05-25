-- ============================================================
-- UniGest — Migration 00002 : Row Level Security
-- ============================================================

-- ─── Activer RLS sur toutes les tables sensibles ─────────────────────────────
ALTER TABLE profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE students                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE secretaries                ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans                ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_courses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_bookings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_fees               ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarships               ENABLE ROW LEVEL SECURITY;
ALTER TABLE theses                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE thesis_milestones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates               ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications              ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_applications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE elearning_submissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_elearning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records         ENABLE ROW LEVEL SECURITY;

-- ─── Fonction helper : rôle de l'utilisateur courant ─────────────────────────
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role
LANGUAGE sql STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ─── profiles ─────────────────────────────────────────────────────────────────
-- Chacun peut voir et modifier son propre profil
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Admins voient tout
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (auth_role() IN ('admin','secretary'));

-- ─── students ─────────────────────────────────────────────────────────────────
CREATE POLICY "students_select_own"
  ON students FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "students_select_staff"
  ON students FOR SELECT
  USING (auth_role() IN ('admin','secretary','teacher'));

CREATE POLICY "students_update_own"
  ON students FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "students_all_admin"
  ON students FOR ALL
  USING (auth_role() IN ('admin','secretary'));

-- ─── grades ───────────────────────────────────────────────────────────────────
-- Étudiant : voit uniquement ses propres notes publiées
CREATE POLICY "grades_select_student"
  ON grades FOR SELECT
  USING (
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())
    AND status = 'published'
  );

-- Enseignant : voit et gère les notes de ses cours
CREATE POLICY "grades_select_teacher"
  ON grades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN teachers t ON t.id = c.teacher_id
      WHERE c.id = grades.course_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "grades_insert_teacher"
  ON grades FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN teachers t ON t.id = c.teacher_id
      WHERE c.id = grades.course_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "grades_update_teacher"
  ON grades FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN teachers t ON t.id = c.teacher_id
      WHERE c.id = grades.course_id AND t.user_id = auth.uid()
    )
    AND status IN ('proposed','rejected')
  );

-- Admin/Secrétariat : tout
CREATE POLICY "grades_all_admin"
  ON grades FOR ALL
  USING (auth_role() IN ('admin','secretary'));

-- ─── tuition_fees ─────────────────────────────────────────────────────────────
CREATE POLICY "fees_select_own"
  ON tuition_fees FOR SELECT
  USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "fees_all_admin"
  ON tuition_fees FOR ALL
  USING (auth_role() IN ('admin','secretary'));

-- ─── payments ─────────────────────────────────────────────────────────────────
CREATE POLICY "payments_select_own"
  ON payments FOR SELECT
  USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "payments_all_admin"
  ON payments FOR ALL
  USING (auth_role() IN ('admin','secretary'));

-- ─── notifications ────────────────────────────────────────────────────────────
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ─── exam_bookings ────────────────────────────────────────────────────────────
CREATE POLICY "bookings_select_own"
  ON exam_bookings FOR SELECT
  USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "bookings_insert_own"
  ON exam_bookings FOR INSERT
  WITH CHECK (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "bookings_update_own"
  ON exam_bookings FOR UPDATE
  USING (
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())
    AND status = 'booked'
  );

CREATE POLICY "bookings_select_teacher"
  ON exam_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exam_sessions es
      JOIN courses c ON c.id = es.course_id
      JOIN teachers t ON t.id = c.teacher_id
      WHERE es.id = exam_bookings.exam_session_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "bookings_all_admin"
  ON exam_bookings FOR ALL
  USING (auth_role() IN ('admin','secretary'));

-- ─── theses ───────────────────────────────────────────────────────────────────
CREATE POLICY "theses_select_own"
  ON theses FOR SELECT
  USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "theses_select_supervisor"
  ON theses FOR SELECT
  USING (supervisor_id = (SELECT id FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "theses_all_admin"
  ON theses FOR ALL
  USING (auth_role() IN ('admin','secretary'));

-- ─── student_documents ────────────────────────────────────────────────────────
CREATE POLICY "docs_select_own"
  ON student_documents FOR SELECT
  USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "docs_insert_own"
  ON student_documents FOR INSERT
  WITH CHECK (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "docs_all_admin"
  ON student_documents FOR ALL
  USING (auth_role() IN ('admin','secretary'));

-- ─── enrollment_applications ──────────────────────────────────────────────────
CREATE POLICY "enroll_app_select_own"
  ON enrollment_applications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "enroll_app_insert_own"
  ON enrollment_applications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "enroll_app_update_own"
  ON enrollment_applications FOR UPDATE
  USING (user_id = auth.uid() AND status = 'draft');

CREATE POLICY "enroll_app_all_admin"
  ON enrollment_applications FOR ALL
  USING (auth_role() IN ('admin','secretary'));

-- ─── e-learning (submissions, progress, attempts) ────────────────────────────
CREATE POLICY "submissions_own"
  ON elearning_submissions FOR ALL
  USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "progress_own"
  ON student_elearning_progress FOR ALL
  USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "quiz_attempts_own"
  ON quiz_attempts FOR ALL
  USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "quiz_responses_own"
  ON quiz_responses FOR ALL
  USING (
    attempt_id IN (
      SELECT id FROM quiz_attempts
      WHERE student_id = (SELECT id FROM students WHERE user_id = auth.uid())
    )
  );

-- ─── courses (lecture publique pour étudiants inscrits) ──────────────────────
CREATE POLICY "courses_select_enrolled"
  ON courses FOR SELECT
  USING (
    auth_role() IN ('admin','secretary','teacher')
    OR EXISTS (
      SELECT 1 FROM course_enrollments ce
      JOIN students s ON s.id = ce.student_id
      WHERE ce.course_id = courses.id AND s.user_id = auth.uid()
    )
  );

-- ─── course_enrollments ───────────────────────────────────────────────────────
CREATE POLICY "enrollments_select_own"
  ON course_enrollments FOR SELECT
  USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "enrollments_all_admin"
  ON course_enrollments FOR ALL
  USING (auth_role() IN ('admin','secretary'));
