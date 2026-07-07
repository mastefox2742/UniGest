-- Phase 3 - Graduation workflow guards.

CREATE UNIQUE INDEX IF NOT EXISTS idx_graduation_one_open_application_per_student
  ON graduation_applications(student_id)
  WHERE status <> 'diploma_issued';

CREATE INDEX IF NOT EXISTS idx_graduation_applications_student_status_created
  ON graduation_applications(student_id, status, created_at DESC);

ALTER TABLE graduation_applications
  ADD CONSTRAINT graduation_applications_cfu_non_negative
  CHECK (cfu_acquired >= 0 AND cfu_required > 0);

ALTER TABLE graduation_applications
  ADD CONSTRAINT graduation_applications_balance_non_negative
  CHECK (balance_due >= 0);

ALTER TABLE graduation_applications
  ADD CONSTRAINT graduation_applications_diploma_metadata
  CHECK (
    status <> 'diploma_issued'
    OR (diploma_issued_at IS NOT NULL AND diploma_number IS NOT NULL AND length(trim(diploma_number)) > 0)
  );
