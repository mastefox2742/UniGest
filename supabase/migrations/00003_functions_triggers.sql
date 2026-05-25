-- ============================================================
-- UniGest — Migration 00003 : Fonctions & Triggers
-- ============================================================

-- ─── Trigger : updated_at automatique ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Appliquer à toutes les tables qui ont updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'universities','academic_years','faculties','departments','degree_programs',
    'profiles','students','teachers','secretaries','classrooms','courses',
    'study_plans','study_plan_courses','schedule_slots','exam_sessions',
    'exam_bookings','grades','student_documents','enrollment_applications',
    'enrollment_documents','tuition_fees','scholarships','theses',
    'thesis_milestones','notifications','elearning_courses','elearning_sections',
    'elearning_materials','elearning_assignments','elearning_submissions',
    'elearning_quizzes','quiz_questions','forums','forum_posts',
    'student_elearning_progress','certificates'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;

-- ─── Trigger : génération automatique de la matricola ─────────────────────────
CREATE OR REPLACE FUNCTION generate_student_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  year_suffix TEXT;
  seq         INT;
BEGIN
  IF NEW.matricola IS NULL THEN
    year_suffix := RIGHT(NEW.enrollment_year::TEXT, 2);
    SELECT COUNT(*) + 1 INTO seq
    FROM students
    WHERE enrollment_year = NEW.enrollment_year;
    NEW.matricola := year_suffix || LPAD(seq::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_students_generate_matricola
  BEFORE INSERT ON students
  FOR EACH ROW EXECUTE FUNCTION generate_student_number();

-- ─── Trigger : recalcul CFU + GPA après acceptation d'une note ───────────────
CREATE OR REPLACE FUNCTION update_student_cfu()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_student_id UUID;
  v_total_cfu  INT;
  v_gpa        NUMERIC(4,2);
BEGIN
  v_student_id := NEW.student_id;

  -- Recalculer CFU total
  SELECT COALESCE(SUM(g.cfu), 0)
  INTO v_total_cfu
  FROM grades g
  WHERE g.student_id = v_student_id
    AND g.status IN ('accepted','published');

  -- Recalculer GPA (moyenne pondérée sur 30)
  SELECT COALESCE(
    SUM(CASE WHEN g.is_honors THEN 30 ELSE g.value END * g.cfu)::NUMERIC
    / NULLIF(SUM(g.cfu), 0),
    0
  )
  INTO v_gpa
  FROM grades g
  WHERE g.student_id = v_student_id
    AND g.status IN ('accepted','published');

  UPDATE students
  SET total_cfu_earned = v_total_cfu,
      gpa              = ROUND(v_gpa, 2)
  WHERE id = v_student_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_grades_update_student_cfu
  AFTER INSERT OR UPDATE OF status ON grades
  FOR EACH ROW
  WHEN (NEW.status IN ('accepted','published'))
  EXECUTE FUNCTION update_student_cfu();

-- ─── Trigger : créer un profil à l'inscription Supabase Auth ─────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, role, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')::user_role,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auth_users_new_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Trigger : marquer la fee comme payée après un payment ───────────────────
CREATE OR REPLACE FUNCTION mark_fee_paid()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.fee_id IS NOT NULL THEN
    UPDATE tuition_fees
    SET status  = 'paid',
        paid_at = NEW.paid_at
    WHERE id = NEW.fee_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payments_mark_fee_paid
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION mark_fee_paid();
