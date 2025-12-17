import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 1433,
  connectionTimeout: 60000,
  requestTimeout: 60000,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 5,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Validate required environment variables
if (!config.server || !config.database || !config.user || !config.password) {
  console.error('Missing required database environment variables:');
  console.error('DB_SERVER:', config.server);
  console.error('DB_NAME:', config.database);
  console.error('DB_USER:', config.user);
  console.error('DB_PASSWORD:', config.password ? '[SET]' : '[NOT SET]');
  throw new Error('Database configuration incomplete');
}

export const getConnection = async () => {
  try {
    console.log('Attempting database connection with config:', {
      server: config.server,
      database: config.database,
      user: config.user
    });
    const pool = await sql.connect(config);
    console.log('Database connection successful');
    return pool;
  } catch (err) {
    console.error('Database connection failed:');
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    console.error('Full error:', err);
    throw err;
  }
};