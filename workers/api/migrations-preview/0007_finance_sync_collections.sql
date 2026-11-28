-- Finance sync metadata and server-backed personal finance collections.
-- finance_transactions and finance_transfers already have updated_at; expose it with deleted_at tombstones.
ALTER TABLE finance_transactions ADD COLUMN deleted_at TEXT;
ALTER TABLE finance_transfers ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_finance_transactions_sync
  ON finance_transactions(workspace_id, updated_at, deleted_at);
CREATE INDEX IF NOT EXISTS idx_finance_transfers_sync
  ON finance_transfers(workspace_id, updated_at, deleted_at);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  PRIMARY KEY(workspace_id,id)
);
CREATE INDEX IF NOT EXISTS idx_accounts_workspace_sync
  ON accounts(workspace_id, updated_at, deleted_at);

CREATE TABLE IF NOT EXISTS custom_categories (
  id TEXT NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'both' CHECK(kind IN ('income','expense','both')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  PRIMARY KEY(workspace_id,id)
);
CREATE INDEX IF NOT EXISTS idx_custom_categories_workspace_sync
  ON custom_categories(workspace_id, updated_at, deleted_at);

CREATE TABLE IF NOT EXISTS recurring (
  id TEXT NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  PRIMARY KEY(workspace_id,id)
);
CREATE INDEX IF NOT EXISTS idx_recurring_workspace_sync
  ON recurring(workspace_id, updated_at, deleted_at);
