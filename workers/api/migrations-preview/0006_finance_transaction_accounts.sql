-- Persist the selected account with each income/expense event so account balances survive reloads and devices.
ALTER TABLE finance_transactions ADD COLUMN account TEXT NOT NULL DEFAULT '';
