-- Business collaboration, double-entry ledger, audit trail and scheduled reminders.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('manager','accountant','staff','viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('invited','active','suspended')),
  invited_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  joined_at TEXT,
  PRIMARY KEY(workspace_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id,status);
CREATE INDEX IF NOT EXISTS idx_workspace_members_email ON workspace_members(email,status);

CREATE TABLE IF NOT EXISTS business_invitations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('manager','accountant','staff','viewer')),
  invited_by TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  accepted_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_business_invites_workspace ON business_invitations(workspace_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_invites_email ON business_invitations(email,expires_at);

CREATE TABLE IF NOT EXISTS business_audit_log (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_business_audit_workspace ON business_audit_log(workspace_id,created_at DESC);

CREATE TABLE IF NOT EXISTS business_journal_entries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entry_date TEXT NOT NULL,
  description TEXT NOT NULL,
  reference TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_business_journal_workspace_date ON business_journal_entries(workspace_id,entry_date DESC);

CREATE TABLE IF NOT EXISTS business_journal_lines (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES business_journal_entries(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL DEFAULT '',
  account_name TEXT NOT NULL,
  debit REAL NOT NULL DEFAULT 0 CHECK(debit >= 0),
  credit REAL NOT NULL DEFAULT 0 CHECK(credit >= 0),
  CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);
CREATE INDEX IF NOT EXISTS idx_business_journal_lines_entry ON business_journal_lines(entry_id);

CREATE TABLE IF NOT EXISTS business_reminders (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  title TEXT NOT NULL,
  due_at INTEGER NOT NULL,
  remind_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','cancelled')),
  notified_at INTEGER,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id,reminder_type,reference_id)
);
CREATE INDEX IF NOT EXISTS idx_business_reminders_due ON business_reminders(status,remind_at);

-- Monotonic revisions let clients detect and reconcile multi-device writes.
CREATE TABLE IF NOT EXISTS business_record_versions (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
