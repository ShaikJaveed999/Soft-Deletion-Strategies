ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_users_active
ON users(id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_active
ON accounts(id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_active
ON transactions(id)
WHERE deleted_at IS NULL;
