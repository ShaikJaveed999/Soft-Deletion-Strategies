# Audit: Hard deletes in LedgerApp

## Scope
This review covers the starter LedgerApp code in the assignment folder and identifies every hard-delete statement in the application before any refactor.

## Findings

### 1) routes/users.js
- File path: `routes/users.js`
- Exact line number: `44`
- SQL statement: `DELETE FROM users WHERE id = $1`
- Table: `users`
- Data permanently lost: The user record itself, their email and name, and any later relational references or audit trail tied to that user would be erased. In a financial app, this removes the identity behind any account and transaction history.
- Soft deletion or hard deletion: Soft delete is appropriate.
- Reason: Users are core ledger entities and often need non-destructive retention for compliance, dispute resolution, and ability to recover the account without losing the transactional history.

### 2) routes/accounts.js
- File path: `routes/accounts.js`
- Exact line number: `43`
- SQL statement: `DELETE FROM accounts WHERE id = $1`
- Table: `accounts`
- Data permanently lost: The account record, account type, balance snapshot, and all associated transaction history relationship metadata would be removed. This destroys the linkage between users and money movements.
- Soft deletion or hard deletion: Soft delete is appropriate.
- Reason: Account records are part of the financial ledger and may need to remain visible to investigators or auditors even after closure or deactivation.

### 3) routes/transactions.js
- File path: `routes/transactions.js`
- Exact line number: `43`
- SQL statement: `DELETE FROM transactions WHERE id = $1`
- Table: `transactions`
- Data permanently lost: The transaction amount, type, description, account relationship, and financial event history are erased. This is the most critical audit evidence in a ledger and makes the account history unreliable.
- Soft deletion or hard deletion: Soft delete is appropriate.
- Reason: Transaction records are evidence of money movement and should be retained for reconciliation, fraud review, and regulatory audits even when a customer requests deletion or an account is closed.

## Exclusions and acceptable hard deletes
The following record types are not part of the soft-delete refactor and should remain hard-deleted when they are true temporary data:

- Session tokens and refresh tokens: short-lived authentication material that should be removed immediately when invalidated or expired.
- One-time verification codes: used for email or MFA verification and can be removed permanently after use or expiry.
- Temporary cache records: cache entries and transient data are safe to delete permanently without affecting financial evidence.
- Background job queue or retry records: operational metadata can be hard-deleted once completed or expired.

This project does not currently contain those table types, so no additional exclusions were required in the codebase.

## Decision summary
The application is a financial ledger, so soft deletion is the correct default for the business-critical tables (`users`, `accounts`, and `transactions`). The remaining permanent-delete cases are limited to ephemeral operational records that are not evidence or core business state.
