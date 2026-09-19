import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connectionLimit = parseInt(process.env.DB_POOL_LIMIT || process.env.DB_CONNECTION_LIMIT || '5', 10);

const poolConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'interncon_ph',
  waitForConnections: true,
  connectionLimit,
  maxIdle: Math.min(connectionLimit, 5),
  idleTimeout: 30000,
  connectTimeout: 15000,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+08:00',
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
};

// Cloud SSL configuration (e.g. Aiven, TiDB Cloud)
if (process.env.DB_SSL === 'true') {
  if (process.env.DB_CA) {
    poolConfig.ssl = {
      ca: process.env.DB_CA.replace(/\\n/g, '\n')
    };
  } else {
    poolConfig.ssl = {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
    };
  }
}

const pool = mysql.createPool(poolConfig);

// Pool error resilience
pool.on('error', (err) => {
  console.error('[Database Pool Error]', err.code || err.message);
});

// Test connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Connected successfully to MySQL (${process.env.DB_NAME || 'interncon_ph'}) [Pool Limit: ${connectionLimit}, SSL: ${process.env.DB_SSL === 'true' ? 'enabled' : 'disabled'}].`);
    connection.release();
  } catch (error) {
    console.error('[Database] Connection failed:', error.message);
  }
})();

export default pool;
