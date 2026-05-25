-- ============================================================
-- UniGest — Migration 00006 : Données de démonstration
-- ============================================================

-- ─── Université ───────────────────────────────────────────────────────────────
INSERT INTO universities (id, name, short_name, address, website)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Université Alpha',
  'UniAlpha',
  '1 Rue des Sciences, 75000 Paris',
  'https://unialpha.fr'
);

-- ─── Année académique courante ────────────────────────────────────────────────
INSERT INTO academic_years (id, university_id, label, start_date, end_date, is_current)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  '2025/2026',
  '2025-09-01',
  '2026-06-30',
  TRUE
);

-- ─── Faculté ──────────────────────────────────────────────────────────────────
INSERT INTO faculties (id, university_id, name, code)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'Faculté des Sciences et Technologies',
  'FST'
);

-- ─── Département ──────────────────────────────────────────────────────────────
INSERT INTO departments (id, faculty_id, name, code)
VALUES (
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000003',
  'Informatique',
  'INFO'
);

-- ─── Programme de licence ─────────────────────────────────────────────────────
INSERT INTO degree_programs (id, department_id, name, code, type, duration_years, total_cfu)
VALUES (
  'a0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000004',
  'Licence Informatique',
  'L-INFO',
  'bachelor',
  3,
  180
);

-- ─── Salle ────────────────────────────────────────────────────────────────────
INSERT INTO classrooms (id, university_id, name, building, capacity, has_projector)
VALUES (
  'a0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  'Amphi A',
  'Bâtiment Principal',
  200,
  TRUE
);

-- Note : les comptes auth (enseignant, étudiant) doivent être créés
-- via Supabase Auth avant d'insérer les profils.
-- Les seeds ci-dessous sont des exemples à adapter.

-- Pour les tests locaux, utiliser supabase auth signup ou le dashboard Supabase.
