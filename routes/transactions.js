const express = require('express');
const router = express.Router();
const db = require('../db');

function getDatabase(req) {
  return req.app && req.app.locals && req.app.locals.db ? req.app.locals.db : db;
}

// GET all active transactions in the system
router.get('/', async (req, res) => {
  try {
    const queryDb = getDatabase(req);
    const { rows } = await queryDb.query('SELECT * FROM transactions WHERE deleted_at IS NULL ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database execution error' });
  }
});

// GET active transactions by account_id
router.get('/account/:accountId', async (req, res) => {
  try {
    const queryDb = getDatabase(req);
    const { rows } = await queryDb.query('SELECT * FROM transactions WHERE account_id = $1 AND deleted_at IS NULL', [req.params.accountId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database retrieval error' });
  }
});

// CREATE a new transaction event
router.post('/', async (req, res) => {
  const { account_id, amount, type, description } = req.body;
  try {
    const queryDb = getDatabase(req);
    const { rows } = await queryDb.query(
      'INSERT INTO transactions (account_id, amount, type, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [account_id, amount, type, description]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Transaction record creation failed' });
  }
});

// Soft delete a single transaction from the record
router.delete('/:id', async (req, res) => {
  try {
    const queryDb = getDatabase(req);
    const { rowCount } = await queryDb.query(
      'UPDATE transactions SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Transaction ID not found or already deleted' });
    }

    res.json({ message: 'Transaction record deleted from LedgerApp' });
  } catch (err) {
    res.status(500).json({ error: 'Delete operation failed' });
  }
});

module.exports = router;
