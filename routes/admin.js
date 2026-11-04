const express = require('express');
const router = express.Router();
const db = require('../db');

function getDatabase(req) {
  return req.app && req.app.locals && req.app.locals.db ? req.app.locals.db : db;
}

function isAuthorized(req) {
  const providedKey = req.get('x-admin-key') || req.get('authorization');
  const expected = process.env.ADMIN_API_KEY;

  if (!expected) return false;
  if (!providedKey) return false;

  if (providedKey.startsWith('Bearer ')) {
    return providedKey.replace('Bearer ', '').trim() === expected;
  }

  return providedKey.trim() === expected;
}

router.get('/deleted', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Admin access required' });
  }

  try {
    const queryDb = getDatabase(req);
    const { rows } = await queryDb.query(`
      SELECT 'users' AS table_name, id, name AS label, email, created_at, deleted_at, NULL AS account_id, NULL AS amount, NULL AS type, NULL AS description
      FROM users
      WHERE deleted_at IS NOT NULL
      UNION ALL
      SELECT 'accounts' AS table_name, id, account_type AS label, CAST(user_id AS TEXT) AS email, created_at, deleted_at, user_id AS account_id, balance AS amount, account_type AS type, NULL AS description
      FROM accounts
      WHERE deleted_at IS NOT NULL
      UNION ALL
      SELECT 'transactions' AS table_name, id, description AS label, CAST(account_id AS TEXT) AS email, created_at, deleted_at, account_id, amount, type, description
      FROM transactions
      WHERE deleted_at IS NOT NULL
      ORDER BY deleted_at DESC
    `);

    res.json({ deletedRecords: rows, count: rows.length });
  } catch (error) {
    res.status(500).json({ error: 'Audit query failed' });
  }
});

module.exports = router;
