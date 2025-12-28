import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5434,
  database: process.env.POSTGRES_DB || 'enron_emails',
  user: process.env.POSTGRES_USER || 'enron',
  password: process.env.POSTGRES_PASSWORD || 'enron_dev_password',
  max: 25, // Maximum number of connections in the pool (increased for production)
  min: 5, // Minimum number of connections to maintain
  idleTimeoutMillis: 15000, // Close idle connections after 15 seconds
  connectionTimeoutMillis: 5000, // Wait 5 seconds for connection
  statement_timeout: 30000, // Cancel queries after 30 seconds
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✓ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Health check function
export const checkDatabaseHealth = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    return { healthy: true, timestamp: result.rows[0].now };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
};

export default pool;
