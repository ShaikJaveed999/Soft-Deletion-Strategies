const express = require('express');
const router = express.Router();
const db = require('../db');

function getDatabase(req) {
  return req.app && req.app.locals && req.app.locals.db ? req.app.locals.db : db;
}

// GET all active accounts in the system
router.get('/', async (req, res) => {
  try {
    const queryDb = getDatabase(req);
    const { rows } = await queryDb.query('SELECT * FROM accounts WHERE deleted_at IS NULL ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database execution error' });
  }
});

// GET active user accounts by user_id
router.get('/user/:userId', async (req, res) => {
  try {
    const queryDb = getDatabase(req);
    const { rows } = await queryDb.query('SELECT * FROM accounts WHERE user_id = $1 AND deleted_at IS NULL', [req.params.userId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database retrieval error' });
  }
});

// CREATE a new account for a user
router.post('/', async (req, res) => {
  const { user_id, account_type, balance } = req.body;
  try {
    const queryDb = getDatabase(req);
    const { rows } = await queryDb.query(
      'INSERT INTO accounts (user_id, account_type, balance) VALUES ($1, $2, $3) RETURNING *',
      [user_id, account_type, balance]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Account creation failed' });
  }
});

// Soft delete a single account from the system
router.delete('/:id', async (req, res) => {
  try {
    const queryDb = getDatabase(req);
    const { rowCount } = await queryDb.query(
      'UPDATE accounts SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Account not found or already deleted' });
    }

    res.json({ message: 'Account deleted from LedgerApp' });
  } catch (err) {
    res.status(500).json({ error: 'Delete operation failed' });
  }
});

module.exports = router;
