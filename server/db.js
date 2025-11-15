import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const base = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Conditionally enable SSL only when explicitly configured
const useSSL = String(process.env.DB_SSL || '').toLowerCase() === 'true' || !!process.env.DB_CA_CERT;
if (useSSL) {
  base.ssl = process.env.DB_CA_CERT
    ? { ca: process.env.DB_CA_CERT, rejectUnauthorized: true }
    : { rejectUnauthorized: false };
}

const pool = mysql.createPool(base);

export default pool;