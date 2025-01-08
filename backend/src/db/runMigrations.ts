import { Pool } from 'pg';
import { promises as fs } from 'fs';
import path from 'path';
import { DatabaseConnector } from '../config/database';

async function runMigrations() {
  let client;
  try {
    // Get database connection
    const pool = await DatabaseConnector.getConnection();
    client = await pool.connect();

    // Create schema_version table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    // Get already applied migrations
    const { rows: appliedMigrations } = await client.query(
      'SELECT version FROM schema_version ORDER BY version'
    );
    const appliedVersions = new Set(appliedMigrations.map(r => r.version));

    // Run each migration in a transaction
    for (const file of sqlFiles) {
      const version = parseInt(file.split('_')[0]);
      
      // Skip if already applied
      if (appliedVersions.has(version)) {
        console.log(`Migration ${file} already applied, skipping...`);
        continue;
      }

      console.log(`Running migration: ${file}`);
      const sqlContent = await fs.readFile(
        path.join(migrationsDir, file),
        'utf8'
      );

      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        console.log(`Successfully applied migration: ${file}`);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { runMigrations };