const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const migrationsDir = path.join(__dirname, 'migrations');

async function runMigrations() {
  if (!process.env.DB_URL) {
    throw new Error('DB_URL is not configured. Add it to your environment before running migrations.');
  }

  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    if (!sql.trim()) continue;

    await client.query(sql);
    console.log(`Applied migration: ${file}`);
  }

  await client.end();
}

runMigrations().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
