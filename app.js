const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const db = require('./db');
const usersRoute = require('./routes/users');
const accountsRoute = require('./routes/accounts');
const transactionsRoute = require('./routes/transactions');
const adminRoute = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.locals.db = db;

// Middleware configuration
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Primary API Endpoints
app.use('/users', usersRoute);
app.use('/accounts', accountsRoute);
app.use('/transactions', transactionsRoute);
app.use('/admin', adminRoute);

// Simple health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'LedgerApp API is running' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
