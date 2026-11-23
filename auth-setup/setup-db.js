/* Creates the authentication tables.  Usage:  DATABASE_URL="postgres://..." npm run setup-db */
const fs = require('fs'), path = require('path');
const { Client } = require('pg');
(async () => {
  if (!process.env.DATABASE_URL) { console.error('Set DATABASE_URL first.'); process.exit(1); }
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  await c.end();
  console.log('Database ready: tables "users" and "auth_attempts" exist.');
})().catch(e => { console.error('Setup failed:', e.message); process.exit(1); });
