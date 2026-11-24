-- Isolated preview-only authentication baseline. Never apply to production.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  xp INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  username TEXT,
  avatar_url TEXT,
  bio TEXT,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '', country TEXT NOT NULL DEFAULT 'US', currency TEXT NOT NULL DEFAULT 'USD', calendar TEXT NOT NULL DEFAULT 'gregory', number_format TEXT NOT NULL DEFAULT '1,234.56', number_system TEXT NOT NULL DEFAULT 'latn', date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD', text_direction TEXT NOT NULL DEFAULT 'ltr', week_start TEXT NOT NULL DEFAULT 'monday', language TEXT NOT NULL DEFAULT 'en', account_type TEXT NOT NULL DEFAULT 'personal', app_lock_type TEXT NOT NULL DEFAULT 'none', app_lock_hash TEXT, app_lock_timeout INTEGER NOT NULL DEFAULT 300, lock_failed_attempts INTEGER NOT NULL DEFAULT 0, onboarding_completed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS email_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK(kind IN ('verify','reset')),
  expires_at INTEGER NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user_kind ON email_tokens(user_id,kind,expires_at);
CREATE TABLE IF NOT EXISTS ws_tickets (
  ticket_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  used_at TEXT
);
