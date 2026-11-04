# LedgerApp - Soft Deletion Strategy

LedgerApp is a lightweight financial API for managing users, checking and savings accounts, and transaction history. This starter project was refactored to preserve business-critical ledger records through soft deletion instead of hard database deletes.

## Overview

The application exposes three primary resources:
- Users
- Accounts
- Transactions

The core requirement is to retain financial records as evidence while keeping normal application responses focused on active, non-deleted records.

## Soft deletion implementation

The application now adds a nullable `deleted_at` field to the ledger tables and updates the business logic so that deletes are non-destructive.

- `users.deleted_at`
- `accounts.deleted_at`
- `transactions.deleted_at`

Normal read queries now exclude deleted rows using `WHERE deleted_at IS NULL`.

Delete actions now use:

```sql
UPDATE table_name
SET deleted_at = NOW()
WHERE id = $1 AND deleted_at IS NULL;
```

This preserves the record in the database for audit, reimbursement, or regulatory review while preventing normal API flows from exposing it.

## Database schema

The schema keeps the same relationships while adding soft-delete support:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);
```

```sql
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    account_type VARCHAR(50) NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);
```

```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);
```

## Migration instructions

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and set your database connection:
   ```bash
   cp .env.example .env
   ```
3. Run the migration script:
   ```bash
   npm run migrate
   ```
4. Start the API:
   ```bash
   npm start
   ```

The migration is stored in the `migrations/` directory and uses the PostgreSQL connection string in `DB_URL`.

## API behavior

### Active records
- `GET /users`
- `GET /users/:id`
- `GET /accounts`
- `GET /accounts/user/:userId`
- `GET /transactions`
- `GET /transactions/account/:accountId`

These routes exclude deleted rows by default.

### Deletions
- `DELETE /users/:id`
- `DELETE /accounts/:id`
- `DELETE /transactions/:id`

These routes set `deleted_at = NOW()` instead of removing the row from the database.

### Protected admin/audit route

```http
GET /admin/deleted
```

This route requires the `x-admin-key` header or `Authorization: Bearer <token>` to match `ADMIN_API_KEY` from the environment. It returns deleted rows from every ledger table for review and compliance checks.

## Admin/audit route details

The route returns a payload in the following shape:

```json
{
  "deletedRecords": [
    {
      "table_name": "users",
      "id": 42,
      "label": "Closed Customer",
      "email": "closed@example.com",
      "deleted_at": "2025-02-12T00:00:00Z"
    }
  ],
  "count": 1
}
```

This is intentionally restricted to administrators and is not public.

## Running tests

```bash
npm test
```

The test suite verifies that:
- deleted rows are hidden from normal application reads
- delete operations trigger soft deletes
- the admin audit route is protected
- deleted records remain available for audit queries

## Deployment

This project is prepared for deployment to Render using a managed PostgreSQL database. After successful deployment and an authenticated push flow, the live URL can be added here.

Until deployment completes, no live URL is claimed or invented.

## Project structure

- `app.js` — Express application bootstrap
- `db.js` — PostgreSQL connection pool
- `schema.sql` — bootstrap schema for local database setup
- `migrate.js` — SQL migration runner
- `migrations/` — soft-delete migration SQL files
- `routes/` — API resource and admin endpoints
- `AUDIT.md` — hard-delete audit and decisions
- `TRADEOFFS.md` — retention and compliance analysis
