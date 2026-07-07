-- Phase 2 - Tuition fees and payment integrity guards.

ALTER TABLE tuition_fees
  ADD CONSTRAINT tuition_fees_late_fee_non_negative
  CHECK (late_fee IS NULL OR late_fee >= 0);

ALTER TABLE tuition_fees
  ADD CONSTRAINT tuition_fees_paid_requires_payment_metadata
  CHECK (
    status <> 'paid'
    OR (paid_at IS NOT NULL AND payment_ref IS NOT NULL AND length(trim(payment_ref)) > 0)
  );

CREATE INDEX IF NOT EXISTS idx_tuition_fees_student_status_due
  ON tuition_fees(student_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_payments_fee_id_paid_at
  ON payments(fee_id, paid_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_reference_unique
  ON payments(reference)
  WHERE reference IS NOT NULL;
