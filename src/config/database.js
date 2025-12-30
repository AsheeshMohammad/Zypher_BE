import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const getConfig = () => ({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 1433,
  connectionTimeout: 60000,
  requestTimeout: 60000,
  options: {
    encrypt: false, // Changed from previous value to be explicit, but keeping user's preference if they had one. Actually, user had false.
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 5,
    min: 0,
    idleTimeoutMillis: 30000
  }
});

// Validate required environment variables
// Validate configuration function
const validateConfig = (config) => {
  if (!config.server || !config.database || !config.user || !config.password) {
    const missing = [];
    if (!config.server) missing.push('DB_SERVER');
    if (!config.database) missing.push('DB_NAME');
    if (!config.user) missing.push('DB_USER');
    if (!config.password) missing.push('DB_PASSWORD');
    
    throw new Error(`Database configuration incomplete. Missing variables: ${missing.join(', ')}`);
  }
};

export const getConnection = async () => {
  try {
    const config = getConfig();
    validateConfig(config);

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