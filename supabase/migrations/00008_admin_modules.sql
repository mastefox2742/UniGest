-- ============================================================
-- UniGest — Migration 00008 : Modules admin (rooms, calendar,
--   graduation, missions, programs KPI, curriculum)
-- ============================================================

-- ─── Enums supplémentaires ────────────────────────────────────────────────────
CREATE TYPE event_type          AS ENUM ('semester','exam_session','holiday','resit','deadline','event');
CREATE TYPE grad_status         AS ENUM ('pending','eligible','jury_incomplete','jury_complete','defended','diploma_issued','blocked');
CREATE TYPE mission_status      AS ENUM ('draft','pending','approved','refused','paid');
CREATE TYPE booking_status_room AS ENUM ('confirmed','cancelled','conflict');

-- ─── 1. room_bookings ─────────────────────────────────────────────────────────
-- Réservations de salles avec détection anti-collision côté DB
CREATE TABLE room_bookings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id  UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  booked_by     UUID NOT NULL REFERENCES profiles(id),
  title         TEXT NOT NULL,
  day           DATE NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  status        booking_status_room NOT NULL DEFAULT 'confirmed',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_time_overlap EXCLUDE USING gist (
    classroom_id WITH =,
    tsrange(
      (day::TEXT || ' ' || start_time::TEXT)::TIMESTAMP,
      (day::TEXT || ' ' || end_time::TEXT)::TIMESTAMP
    ) WITH &&
  ) WHERE (status = 'confirmed')
);

CREATE INDEX idx_room_bookings_classroom ON room_bookings(classroom_id);
CREATE INDEX idx_room_bookings_day       ON room_bookings(day);

-- ─── 2. academic_events ───────────────────────────────────────────────────────
CREATE TABLE academic_events (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id  UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  title          TEXT NOT NULL,
  description    TEXT,
  type           event_type NOT NULL,
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  is_locked      BOOLEAN NOT NULL DEFAULT FALSE,   -- événements institutionnels non modifiables
  created_by     UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_academic_events_dates ON academic_events(start_date, end_date);
CREATE INDEX idx_academic_events_type  ON academic_events(type);

-- ─── 3. graduation_applications ───────────────────────────────────────────────
CREATE TABLE graduation_applications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id),
  status            grad_status NOT NULL DEFAULT 'pending',
  cfu_acquired      INT NOT NULL DEFAULT 0,
  cfu_required      INT NOT NULL DEFAULT 180,
  balance_due       NUMERIC(10,2) NOT NULL DEFAULT 0,
  thesis_title      TEXT,
  defense_date      DATE,
  defense_room_id   UUID REFERENCES classrooms(id),
  diploma_issued_at TIMESTAMPTZ,
  diploma_number    TEXT UNIQUE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_grad_applications_student ON graduation_applications(student_id);
CREATE INDEX idx_grad_applications_status  ON graduation_applications(status);

-- ─── 4. graduation_jury_members ───────────────────────────────────────────────
CREATE TABLE graduation_jury_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  UUID NOT NULL REFERENCES graduation_applications(id) ON DELETE CASCADE,
  teacher_id      UUID REFERENCES teachers(id),
  name            TEXT NOT NULL,   -- pour membres externes
  role            TEXT NOT NULL CHECK (role IN ('president','rapporteur','examiner','supervisor','external')),
  confirmed       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jury_members_application ON graduation_jury_members(application_id);

-- ─── 5. mission_requests ──────────────────────────────────────────────────────
CREATE TABLE mission_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id      UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  destination     TEXT NOT NULL,
  purpose         TEXT NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          mission_status NOT NULL DEFAULT 'draft',
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  approved_by     UUID REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  refusal_reason  TEXT,
  payment_ref     TEXT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_missions_teacher ON mission_requests(teacher_id);
CREATE INDEX idx_missions_status  ON mission_requests(status);

-- ─── 6. mission_expenses ──────────────────────────────────────────────────────
CREATE TABLE mission_expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mission_id  UUID NOT NULL REFERENCES mission_requests(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  receipt_url TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mission_expenses_mission ON mission_expenses(mission_id);

-- ─── 7. curriculum_units ──────────────────────────────────────────────────────
-- Unités d'enseignement par filière (maquette pédagogique)
CREATE TABLE curriculum_units (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  degree_program_id UUID NOT NULL REFERENCES degree_programs(id) ON DELETE CASCADE,
  course_id         UUID REFERENCES courses(id),
  code              TEXT NOT NULL,
  name              TEXT NOT NULL,
  cfu               INT  NOT NULL CHECK (cfu > 0),
  year              INT  NOT NULL CHECK (year BETWEEN 1 AND 6),
  semester          INT  NOT NULL CHECK (semester IN (1,2)),
  exam_mode         TEXT NOT NULL DEFAULT 'Écrit',
  syllabus_complete BOOLEAN NOT NULL DEFAULT FALSE,
  syllabus_url      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(degree_program_id, code)
);

CREATE INDEX idx_curriculum_units_program ON curriculum_units(degree_program_id);
CREATE INDEX idx_curriculum_units_year    ON curriculum_units(degree_program_id, year, semester);

-- ─── 8. program_kpis ──────────────────────────────────────────────────────────
-- Snapshots KPI annuels par filière (pour trends et exports CA)
CREATE TABLE program_kpis (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  degree_program_id UUID NOT NULL REFERENCES degree_programs(id) ON DELETE CASCADE,
  academic_year_id  UUID NOT NULL REFERENCES academic_years(id),
  total_students    INT  NOT NULL DEFAULT 0,
  retention_rate    NUMERIC(5,2) NOT NULL DEFAULT 0,   -- 0–100
  avg_grad_years    NUMERIC(4,2) NOT NULL DEFAULT 0,
  pass_rate         NUMERIC(5,2) NOT NULL DEFAULT 0,
  at_risk_count     INT  NOT NULL DEFAULT 0,
  thesis_defended   INT  NOT NULL DEFAULT 0,
  thesis_ongoing    INT  NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(degree_program_id, academic_year_id)
);

CREATE INDEX idx_program_kpis_program ON program_kpis(degree_program_id);

-- ─── RLS policies ────────────────────────────────────────────────────────────

ALTER TABLE room_bookings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE graduation_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE graduation_jury_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_expenses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_units       ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_kpis           ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les réservations, events, curriculum (info publique interne)
CREATE POLICY "room_bookings_read_all"    ON room_bookings          FOR SELECT USING (TRUE);
CREATE POLICY "academic_events_read_all"  ON academic_events        FOR SELECT USING (TRUE);
CREATE POLICY "curriculum_read_all"       ON curriculum_units       FOR SELECT USING (TRUE);
CREATE POLICY "kpis_read_all"             ON program_kpis           FOR SELECT USING (TRUE);

-- Seuls admins/secrétaires peuvent écrire
CREATE POLICY "room_bookings_write_admin" ON room_bookings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','secretary'))
  );

CREATE POLICY "academic_events_write_admin" ON academic_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','secretary'))
  );

CREATE POLICY "graduation_read_admin" ON graduation_applications
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','secretary'))
  );

CREATE POLICY "graduation_write_admin" ON graduation_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','secretary'))
  );

CREATE POLICY "jury_read" ON graduation_jury_members
  FOR SELECT USING (TRUE);

CREATE POLICY "jury_write_admin" ON graduation_jury_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','secretary'))
  );

CREATE POLICY "mission_read_own_or_admin" ON mission_requests
  FOR SELECT USING (
    teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','secretary'))
  );

CREATE POLICY "mission_write_own" ON mission_requests
  FOR INSERT WITH CHECK (
    teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

CREATE POLICY "mission_update_admin" ON mission_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','secretary'))
  );

CREATE POLICY "mission_expenses_read" ON mission_expenses
  FOR SELECT USING (
    mission_id IN (
      SELECT id FROM mission_requests
      WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','secretary'))
  );

CREATE POLICY "curriculum_write_admin" ON curriculum_units
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','secretary'))
  );

CREATE POLICY "kpis_write_admin" ON program_kpis
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','secretary'))
  );

-- ─── updated_at triggers ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_room_bookings_updated_at') THEN
    CREATE TRIGGER trg_room_bookings_updated_at
      BEFORE UPDATE ON room_bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_academic_events_updated_at') THEN
    CREATE TRIGGER trg_academic_events_updated_at
      BEFORE UPDATE ON academic_events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_graduation_updated_at') THEN
    CREATE TRIGGER trg_graduation_updated_at
      BEFORE UPDATE ON graduation_applications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_missions_updated_at') THEN
    CREATE TRIGGER trg_missions_updated_at
      BEFORE UPDATE ON mission_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_curriculum_updated_at') THEN
    CREATE TRIGGER trg_curriculum_updated_at
      BEFORE UPDATE ON curriculum_units FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
