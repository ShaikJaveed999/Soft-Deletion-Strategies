# Trade-offs of soft deletion in LedgerApp

## 1) When soft delete is the right call

Soft deletion is appropriate for the core LedgerApp tables because the application captures financial obligations, balances, and historical movements. Two scenarios are especially important:

1. Account closure and customer offboarding
   - When a user closes an account or a customer request is processed, the record should not disappear from the operational system immediately.
   - The business may need to recover the account, restore access, or re-open the ledger for investigation.
   - If the record is removed completely, the financial history becomes fragmented and the audit trail is broken.

2. Transaction reversal, dispute, and compliance review
   - Transactions are the evidence of money in motion.
   - If a credit, debit, or transfer is later disputed, corrected, or audited, the original record must still exist even after the application no longer shows it in normal screens.
   - A soft delete allows finance teams to find the historical event, confirm the amount, and explain what happened without altering the raw ledger state.

In both scenarios, the record must remain recoverable. Recoverability matters because the system may need to restore a customer account, reconstruct a ledger balance, or satisfy a financial audit. The application should keep the record, set `deleted_at`, and make the record visible only to authorized roles or administrative audit workflows.

## 2) When hard delete is still appropriate

Hard delete is still the right choice for records that are true temporary operational metadata and do not serve as financial evidence. Examples include:

- Session tokens and refresh tokens: they are short-lived security artifacts and can be removed immediately when invalid or expired.
- One-time verification codes: they are used once for identity confirmation and are not business records.
- Temporary cache records: they can be recreated or regenerated and are not required for compliance evidence.
- Background job queue metadata: if the job is obsolete or completed and no audit need exists, it can be removed permanently.

The technical reason is that these records have no legal or operational value after expiry or completion. The regulatory reason is that they do not represent customer obligations, payment events, or balances that must be retained in a ledger trail.

## 3) Compliance scenarios

A realistic compliance scenario is a quarterly financial audit in which the accounting team is asked to prove whether a specific customer account or payment was removed by a fraud team or the customer support team.

In that situation, the auditor may ask: "Show all ledger records that were deleted in the last 12 months, and explain why each one was removed."

The admin audit route retrieves these records by using `WHERE deleted_at IS NOT NULL` against the ledger tables. For example, the query pattern looks like:

```sql
SELECT *
FROM transactions
WHERE deleted_at IS NOT NULL;
```

This allows the audit team to review the deleted financial record while still keeping all ordinary application queries limited to active data. The system can answer audit questions without exposing deleted records to customers or general users.

## Performance and scale estimates

These are rough estimates, not measurements from a production environment.

1. How table size changes over time as soft-deleted records accumulate
   - Suppose the platform starts with 2,500 active ledger records in a table and adds about 1,000 new rows per month.
   - Over 12 months, the table could grow to roughly 14,500 rows if only about 1,000 are deleted and retained as soft-deleted records.
   - Over 24 months, the table might reach around 27,000 rows.
   - This is a realistic growth profile for a startup ledger where a significant number of records remain for historical analysis even after being logically removed.

2. What query-performance problem does a partial index solve?
   - Without a partial index, the database must scan many rows to find active records when most queries reference `deleted_at IS NULL`.
   - The issue worsens as the table accumulates soft-deleted rows, because the database is handling more historical rows even when the application only needs the current, active set.
   - A partial index reduces the search space to only active rows and dramatically lowers the cost of common list and lookup queries.

3. At approximately what data volume could performance become a concern without the index?
   - With a table in the 10,000 to 25,000 row range, a query that scans all rows can still be acceptable for a single application instance.
   - By roughly 50,000 to 100,000 rows, the lack of a partial index starts to become a meaningful performance concern for repeated list and filter queries.
   - For a ledger with frequent daily reads, the cost would likely show up around the 20,000 to 50,000 row level if active filtering is not indexed.

This is why partial indexes are a practical choice: they are small, targeted, and directly match the most common active-record queries in a soft-deletion design.
