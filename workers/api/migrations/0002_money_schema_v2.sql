-- NOVYRA money schema v2. All pre-v2 rows are test data and are intentionally NOT copied.
CREATE TABLE IF NOT EXISTS app_schema_version (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  schema_version INTEGER NOT NULL CHECK (typeof(schema_version) = 'integer'),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO app_schema_version (id, schema_version)
VALUES (1, 2)
ON CONFLICT(id) DO UPDATE SET schema_version = excluded.schema_version,
  updated_at = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS finance_transactions_v2 (
  id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  amount_minor INTEGER NOT NULL CHECK (typeof(amount_minor) = 'integer' AND amount_minor > 0),
  currency TEXT NOT NULL CHECK (length(currency) = 3 AND currency = upper(currency)),
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  transaction_date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, id)
);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_v2_owner_date
  ON finance_transactions_v2 (workspace_id, owner_id, transaction_date DESC);

CREATE TABLE IF NOT EXISTS business_money_records_v2 (
  id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  record_type TEXT NOT NULL,
  field_key TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (typeof(amount_minor) = 'integer' AND amount_minor >= 0),
  currency TEXT NOT NULL CHECK (length(currency) = 3 AND currency = upper(currency)),
  record_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, id, field_key)
);
CREATE INDEX IF NOT EXISTS idx_business_money_records_v2_owner_type
  ON business_money_records_v2 (workspace_id, owner_id, record_type);
