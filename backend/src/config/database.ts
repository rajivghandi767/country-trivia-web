import { Pool } from 'pg';
import { getSecretFromVault } from './vault';

let pool: Pool;

export const setupDatabase = async () => {
  const dbCredentials = await getSecretFromVault('database/credentials');
  
  pool = new Pool({
    user: dbCredentials.username,
    password: dbCredentials.password,
    host: process.env.DB_HOST || 'https://db.rajivwallace.com',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'country_trivia'
  });
};

export const getPool = () => pool;