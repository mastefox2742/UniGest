-- Phase 4 - Persistent audit trail.

CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role    TEXT,
  action        TEXT NOT NULL,
  resource      TEXT NOT NULL,
  resource_id   TEXT,
  method        TEXT,
  path          TEXT,
  status_code   INT,
  ip_address    TEXT,
  user_agent    TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created
  ON audit_logs(actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created
  ON audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_created
  ON audit_logs(resource, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_admin_read" ON audit_logs;
CREATE POLICY "audit_logs_admin_read" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
