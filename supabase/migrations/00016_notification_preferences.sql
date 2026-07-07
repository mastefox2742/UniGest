-- Phase 5 - Notification preferences.

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id      UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  general      BOOLEAN NOT NULL DEFAULT TRUE,
  exam         BOOLEAN NOT NULL DEFAULT TRUE,
  fee          BOOLEAN NOT NULL DEFAULT TRUE,
  grade        BOOLEAN NOT NULL DEFAULT TRUE,
  certificate  BOOLEAN NOT NULL DEFAULT TRUE,
  thesis       BOOLEAN NOT NULL DEFAULT TRUE,
  graduation   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_preferences_own" ON notification_preferences;
CREATE POLICY "notification_preferences_own"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notification_preferences_admin_read" ON notification_preferences;
CREATE POLICY "notification_preferences_admin_read"
  ON notification_preferences FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON notifications(user_id, created_at DESC);
