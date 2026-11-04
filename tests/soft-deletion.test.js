const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const usersRoute = require('../routes/users');
const accountsRoute = require('../routes/accounts');
const transactionsRoute = require('../routes/transactions');
const adminRoute = require('../routes/admin');

process.env.ADMIN_API_KEY = 'ledger-admin-secret';

function buildApp(mockDb) {
  const app = express();
  app.use(express.json());
  app.locals.db = mockDb;
  app.use('/users', usersRoute);
  app.use('/accounts', accountsRoute);
  app.use('/transactions', transactionsRoute);
  app.use('/admin', adminRoute);
  return app;
}

test('GET /users hides soft-deleted records', async () => {
  const mockDb = {
    query: async (sql) => {
      if (sql.includes('FROM users WHERE deleted_at IS NULL')) {
        return {
          rows: [{ id: 1, name: 'Alice', email: 'alice@example.com', created_at: '2025-01-01T00:00:00Z', deleted_at: null }]
        };
      }

      throw new Error(`Unexpected SQL for users list: ${sql}`);
    }
  };

  const app = buildApp(mockDb);
  const response = await request(app).get('/users');

  assert.equal(response.status, 200);
  assert.equal(response.body[0].id, 1);
  assert.equal(response.body[0].email, 'alice@example.com');
});

test('DELETE /users performs a soft delete without removing the row', async () => {
  const mockDb = {
    query: async (sql, params) => {
      if (sql.includes('UPDATE users SET deleted_at = NOW()')) {
        assert.equal(params[0], '7');
        return { rowCount: 1 };
      }

      throw new Error(`Unexpected SQL for soft delete: ${sql}`);
    }
  };

  const app = buildApp(mockDb);
  const response = await request(app).delete('/users/7');

  assert.equal(response.status, 200);
  assert.equal(response.body.message, 'User deleted from LedgerApp');
});

test('GET /accounts only returns active rows', async () => {
  const mockDb = {
    query: async (sql) => {
      if (sql.includes('FROM accounts WHERE deleted_at IS NULL')) {
        return {
          rows: [{ id: 3, user_id: 1, account_type: 'checking', balance: '100.00', deleted_at: null }]
        };
      }

      throw new Error(`Unexpected SQL for accounts list: ${sql}`);
    }
  };

  const app = buildApp(mockDb);
  const response = await request(app).get('/accounts');

  assert.equal(response.status, 200);
  assert.equal(response.body[0].account_type, 'checking');
});

test('DELETE /transactions soft-deletes the record and leaves the row in place', async () => {
  const mockDb = {
    query: async (sql, params) => {
      if (sql.includes('UPDATE transactions SET deleted_at = NOW()')) {
        assert.equal(params[0], '12');
        return { rowCount: 1 };
      }

      throw new Error(`Unexpected SQL for transaction soft delete: ${sql}`);
    }
  };

  const app = buildApp(mockDb);
  const response = await request(app).delete('/transactions/12');

  assert.equal(response.status, 200);
  assert.equal(response.body.message, 'Transaction record deleted from LedgerApp');
});

test('admin audit route is protected and exposes deleted records', async () => {
  const mockDb = {
    query: async (sql) => {
      if (sql.includes('WHERE deleted_at IS NOT NULL')) {
        return {
          rows: [{ table_name: 'users', id: 99, label: 'Closed Customer', email: 'closed@example.com', deleted_at: '2025-02-12T00:00:00Z' }]
        };
      }

      throw new Error(`Unexpected SQL for admin audit: ${sql}`);
    }
  };

  const app = buildApp(mockDb);

  const plainRequest = await request(app).get('/admin/deleted');
  assert.equal(plainRequest.status, 401);

  const authorizedRequest = await request(app)
    .get('/admin/deleted')
    .set('x-admin-key', 'ledger-admin-secret');

  assert.equal(authorizedRequest.status, 200);
  assert.equal(authorizedRequest.body.count, 1);
  assert.equal(authorizedRequest.body.deletedRecords[0].table_name, 'users');
});
