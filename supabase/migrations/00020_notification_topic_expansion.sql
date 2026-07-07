-- Phase 5 - Notification topic expansion for LMS, internships, and alumni.

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS elearning BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS internship BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS alumni BOOLEAN NOT NULL DEFAULT TRUE;
