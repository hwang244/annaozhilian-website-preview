CREATE TABLE IF NOT EXISTS demo_requests (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  interest TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL,
  consent_at TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  notification_state TEXT NOT NULL DEFAULT 'pending',
  notification_attempts INTEGER NOT NULL DEFAULT 0,
  notification_retry_at INTEGER NOT NULL DEFAULT 0,
  notification_sent_at TEXT NOT NULL DEFAULT '',
  notification_error TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS demo_requests_created_at ON demo_requests(created_at);
CREATE INDEX IF NOT EXISTS demo_requests_notifications ON demo_requests(notification_retry_at) WHERE notification_state IN ('pending', 'sending');
CREATE TABLE IF NOT EXISTS demo_rate_limits (
  client_key TEXT PRIMARY KEY NOT NULL,
  expires_at INTEGER NOT NULL,
  hits INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS demo_rate_limits_expiry ON demo_rate_limits(expires_at);
CREATE TABLE IF NOT EXISTS demo_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
