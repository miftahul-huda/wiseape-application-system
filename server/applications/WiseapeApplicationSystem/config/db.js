const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME || 'wiseape-application-system',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false },
});

// A pooled client can be dropped by the server (idle timeout, network
// blip) between checkouts; without this listener that surfaces as an
// unhandled 'error' event and crashes the process. The pool discards the
// bad client and hands out a fresh one on the next query either way.
pool.on('error', (error) => {
  console.warn('[WAS API] PostgreSQL pool error (connection dropped, will retry):', error.message);
});

function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
