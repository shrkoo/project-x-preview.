-- A transfer is one atomic event, not an expense/income pair.
CREATE TABLE IF NOT EXISTS finance_transfers (
  id TEXT NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  amount REAL NOT NULL CHECK(amount > 0 AND amount <= 1000000000000),
  transaction_date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(workspace_id,id),
  CHECK(length(trim(from_account)) > 0),
  CHECK(length(trim(to_account)) > 0),
  CHECK(from_account <> to_account)
);
CREATE INDEX IF NOT EXISTS idx_finance_transfers_workspace_date
  ON finance_transfers(workspace_id,transaction_date DESC,updated_at DESC);
