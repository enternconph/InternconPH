import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'interncon_ph',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '50'),
  maxIdle: 20,
  idleTimeout: 30000,
  connectTimeout: 10000,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+08:00',
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

// Pool error resilience
pool.on('error', (err) => {
  console.error('[Database Pool Error]', err.code || err.message);
});

// Test connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Connected successfully to MySQL (${process.env.DB_NAME || 'interncon_ph'}) [Pool Limit: ${parseInt(process.env.DB_CONNECTION_LIMIT || '50')}].`);
    connection.release();
  } catch (error) {
    console.error('[Database] Connection failed:', error.message);
  }
})();

export default pool;
