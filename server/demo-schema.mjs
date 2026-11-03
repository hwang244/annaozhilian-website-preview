// Initial, non-destructive schema for a newly bound D1 database.
export const DEMO_SCHEMA = [
  "CREATE TABLE IF NOT EXISTS demo_requests (\n  id TEXT PRIMARY KEY NOT NULL,\n  created_at TEXT NOT NULL,\n  name TEXT NOT NULL,\n  phone TEXT NOT NULL,\n  email TEXT NOT NULL DEFAULT '',\n  organization TEXT NOT NULL DEFAULT '',\n  interest TEXT NOT NULL,\n  message TEXT NOT NULL DEFAULT '',\n  language TEXT NOT NULL,\n  consent_at TEXT NOT NULL,\n  payload_hash TEXT NOT NULL,\n  status TEXT NOT NULL DEFAULT 'new',\n  notification_state TEXT NOT NULL DEFAULT 'pending',\n  notification_attempts INTEGER NOT NULL DEFAULT 0,\n  notification_retry_at INTEGER NOT NULL DEFAULT 0,\n  notification_sent_at TEXT NOT NULL DEFAULT '',\n  notification_error TEXT NOT NULL DEFAULT ''\n)",
  "CREATE INDEX IF NOT EXISTS demo_requests_created_at ON demo_requests(created_at)",
  "CREATE INDEX IF NOT EXISTS demo_requests_notifications ON demo_requests(notification_retry_at) WHERE notification_state IN ('pending', 'sending')",
  "CREATE TABLE IF NOT EXISTS demo_rate_limits (\n  client_key TEXT PRIMARY KEY NOT NULL,\n  expires_at INTEGER NOT NULL,\n  hits INTEGER NOT NULL\n)",
  "CREATE INDEX IF NOT EXISTS demo_rate_limits_expiry ON demo_rate_limits(expires_at)",
  "CREATE TABLE IF NOT EXISTS demo_settings (\n  key TEXT PRIMARY KEY NOT NULL,\n  value TEXT NOT NULL\n)"
];
