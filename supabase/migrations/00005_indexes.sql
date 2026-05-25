-- ============================================================
-- UniGest — Migration 00005 : Index de performance
-- ============================================================

-- ─── students ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_students_user_id          ON students(user_id);
CREATE INDEX idx_students_matricola        ON students(matricola);
CREATE INDEX idx_students_degree_program   ON students(degree_program_id);
CREATE INDEX idx_students_status           ON students(status);

-- ─── profiles ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_profiles_role             ON profiles(role);

-- ─── courses ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_courses_degree_program    ON courses(degree_program_id);
CREATE INDEX idx_courses_teacher           ON courses(teacher_id);
CREATE INDEX idx_courses_year_semester     ON courses(year, semester);

-- ─── grades ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_grades_student            ON grades(student_id);
CREATE INDEX idx_grades_course             ON grades(course_id);
CREATE INDEX idx_grades_status             ON grades(status);
CREATE INDEX idx_grades_exam_session       ON grades(exam_session_id);

-- ─── exam_sessions ────────────────────────────────────────────────────────────
CREATE INDEX idx_exam_sessions_course      ON exam_sessions(course_id);
CREATE INDEX idx_exam_sessions_date        ON exam_sessions(date);
CREATE INDEX idx_exam_sessions_acad_year   ON exam_sessions(academic_year_id);

-- ─── exam_bookings ────────────────────────────────────────────────────────────
CREATE INDEX idx_exam_bookings_student     ON exam_bookings(student_id);
CREATE INDEX idx_exam_bookings_session     ON exam_bookings(exam_session_id);
CREATE INDEX idx_exam_bookings_status      ON exam_bookings(status);

-- ─── tuition_fees ─────────────────────────────────────────────────────────────
CREATE INDEX idx_fees_student              ON tuition_fees(student_id);
CREATE INDEX idx_fees_status               ON tuition_fees(status);
CREATE INDEX idx_fees_due_date             ON tuition_fees(due_date);

-- ─── notifications ────────────────────────────────────────────────────────────
CREATE INDEX idx_notifications_user        ON notifications(user_id);
CREATE INDEX idx_notifications_read        ON notifications(user_id, is_read);

-- ─── enrollment_applications ──────────────────────────────────────────────────
CREATE INDEX idx_enroll_app_user           ON enrollment_applications(user_id);
CREATE INDEX idx_enroll_app_status         ON enrollment_applications(status);

-- ─── course_enrollments ───────────────────────────────────────────────────────
CREATE INDEX idx_enrollments_student       ON course_enrollments(student_id);
CREATE INDEX idx_enrollments_course        ON course_enrollments(course_id);

-- ─── e-learning ───────────────────────────────────────────────────────────────
CREATE INDEX idx_progress_student          ON student_elearning_progress(student_id);
CREATE INDEX idx_progress_material         ON student_elearning_progress(material_id);
CREATE INDEX idx_submissions_assignment    ON elearning_submissions(assignment_id);
CREATE INDEX idx_quiz_attempts_student     ON quiz_attempts(student_id);
CREATE INDEX idx_forum_posts_forum         ON forum_posts(forum_id);

-- ─── theses ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_theses_student            ON theses(student_id);
CREATE INDEX idx_theses_supervisor         ON theses(supervisor_id);
CREATE INDEX idx_theses_status             ON theses(status);

-- ─── Recherche textuelle (GIN) ────────────────────────────────────────────────
CREATE INDEX idx_students_name_gin
  ON profiles USING GIN(to_tsvector('french', first_name || ' ' || last_name));

CREATE INDEX idx_courses_name_gin
  ON courses USING GIN(to_tsvector('french', name));
