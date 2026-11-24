-- Preview profile fields used by the onboarding and authenticated app.
ALTER TABLE users ADD COLUMN first_name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN last_name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN country TEXT NOT NULL DEFAULT 'US';
ALTER TABLE users ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE users ADD COLUMN calendar TEXT NOT NULL DEFAULT 'gregory';
ALTER TABLE users ADD COLUMN number_format TEXT NOT NULL DEFAULT '1,234.56';
ALTER TABLE users ADD COLUMN number_system TEXT NOT NULL DEFAULT 'latn';
ALTER TABLE users ADD COLUMN date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD';
ALTER TABLE users ADD COLUMN text_direction TEXT NOT NULL DEFAULT 'ltr';
ALTER TABLE users ADD COLUMN week_start TEXT NOT NULL DEFAULT 'monday';
ALTER TABLE users ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
ALTER TABLE users ADD COLUMN account_type TEXT NOT NULL DEFAULT 'personal';
ALTER TABLE users ADD COLUMN app_lock_type TEXT NOT NULL DEFAULT 'none';
ALTER TABLE users ADD COLUMN app_lock_hash TEXT;
ALTER TABLE users ADD COLUMN app_lock_timeout INTEGER NOT NULL DEFAULT 300;
ALTER TABLE users ADD COLUMN lock_failed_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed);
