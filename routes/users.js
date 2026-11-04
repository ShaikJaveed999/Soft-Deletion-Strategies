const express = require('express');
const router = express.Router();
const db = require('../db');

function getDatabase(req) {
  return req.app && req.app.locals && req.app.locals.db ? req.app.locals.db : db;
}

// GET all active users in the system
router.get('/', async (req, res) => {
  try {
    const queryDb = getDatabase(req);
    const { rows } = await queryDb.query('SELECT * FROM users WHERE deleted_at IS NULL ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database execution error' });
  }
});

// GET single active user details by ID
router.get('/:id', async (req, res) => {
  try {
    const queryDb = getDatabase(req);
    const { rows } = await queryDb.query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database retrieval error' });
  }
});

// CREATE a new user
router.post('/', async (req, res) => {
  const { name, email } = req.body;
  try {
    const queryDb = getDatabase(req);
    const { rows } = await queryDb.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'User creation failed' });
  }
});

// Soft delete a user from the system
router.delete('/:id', async (req, res) => {
  try {
    const queryDb = getDatabase(req);
    const { rowCount } = await queryDb.query(
      'UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'User not found or already deleted' });
    }

    res.json({ message: 'User deleted from LedgerApp' });
  } catch (err) {
    res.status(500).json({ error: 'Delete operation failed' });
  }
});

module.exports = router;
