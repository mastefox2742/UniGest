-- ============================================================
-- UniGest — Migration 00007 : Patches schema Phase 4-5
-- ============================================================

-- ─── 1. Thesis : rendre supervisor optionnel + ajouter champs texte ───────────
ALTER TABLE theses ALTER COLUMN supervisor_id DROP NOT NULL;

ALTER TABLE theses
  ADD COLUMN IF NOT EXISTS advisor_name    TEXT,
  ADD COLUMN IF NOT EXISTS co_advisor_name TEXT,
  ADD COLUMN IF NOT EXISTS notes           TEXT,
  ADD COLUMN IF NOT EXISTS defense_date    DATE;

-- ─── 2. Quiz questions : ajouter le type de question ─────────────────────────
DO $$ BEGIN
  CREATE TYPE question_type AS ENUM ('single', 'multiple', 'true_false', 'open');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE quiz_questions
  ADD COLUMN IF NOT EXISTS type question_type NOT NULL DEFAULT 'single';

-- ─── 3. Quiz attempts : ajouter status, score_pct, submitted_at ──────────────
ALTER TABLE quiz_attempts
  ADD COLUMN IF NOT EXISTS status       TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS score_pct    INT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- ─── 4. Quiz responses : ajouter réponse libre + points + abandon contrainte ──
ALTER TABLE quiz_responses
  ADD COLUMN IF NOT EXISTS open_answer   TEXT,
  ADD COLUMN IF NOT EXISTS points_earned INT NOT NULL DEFAULT 0;

-- Supprimer la contrainte unique pour permettre plusieurs réponses (QCM)
ALTER TABLE quiz_responses
  DROP CONSTRAINT IF EXISTS quiz_responses_attempt_id_question_id_key;

-- Rendre option_id nullable (questions ouvertes n'ont pas d'option)
ALTER TABLE quiz_responses ALTER COLUMN option_id DROP NOT NULL;

-- ─── 5. Forum : ajouter elearning_course_id sur forum_posts ──────────────────
ALTER TABLE forum_posts
  ADD COLUMN IF NOT EXISTS elearning_course_id UUID REFERENCES elearning_courses(id) ON DELETE CASCADE;

-- Index pour la requête posts par cours
CREATE INDEX IF NOT EXISTS idx_forum_posts_elearning_course
  ON forum_posts(elearning_course_id);

-- ─── 6. Index utiles ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_student
  ON quiz_attempts(quiz_id, student_id);

CREATE INDEX IF NOT EXISTS idx_quiz_responses_attempt
  ON quiz_responses(attempt_id);
