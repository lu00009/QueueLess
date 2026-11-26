import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/queueless_db?schema=public',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'queueless_super_secret_access_jwt_key_2026_dev',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'queueless_super_secret_refresh_jwt_key_2026_dev',
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:3000'],
};
