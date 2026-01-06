// Database connection utilities for Neon Agent

import pg from 'pg';
const { Client, Pool } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

// Single client for one-off operations
export async function getClient() {
  const client = new Client({ connectionString });
  await client.connect();
  return client;
}

// Pool for concurrent operations
let pool = null;
export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

// Transaction wrapper
export async function withTransaction(fn) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

// Close pool on shutdown
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
