-- Phase 2 - Public certificate verification token.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS verification_token TEXT;

UPDATE certificates
SET verification_token = encode(gen_random_bytes(24), 'hex')
WHERE verification_token IS NULL;

ALTER TABLE certificates
  ALTER COLUMN verification_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_verification_token_unique
  ON certificates(verification_token);

CREATE INDEX IF NOT EXISTS idx_certificates_student_issued_at
  ON certificates(student_id, issued_at DESC);
