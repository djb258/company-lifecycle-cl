// Migration Runner - Versioned schema migrations

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getClient, withTransaction } from '../lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

export class MigrationRunner {
  async run(options) {
    console.log('='.repeat(60));
    console.log('NEON AGENT: MIGRATION RUNNER');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Dry Run: ${options.dryRun || false}`);
    console.log('');

    if (options.rollback) {
      return this.rollback(options);
    }

    const migrations = this.getMigrations();
    console.log(`Found ${migrations.length} migration files`);

    if (options.dryRun) {
      console.log('\nDRY RUN - No changes will be made\n');
      migrations.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.filename}`);
      });
      return;
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const migration of migrations) {
        console.log(`\nRunning: ${migration.filename}`);
        console.log('-'.repeat(40));

        try {
          await client.query(migration.sql);
          console.log(`SUCCESS: ${migration.filename}`);
        } catch (error) {
          console.error(`ERROR: ${error.message}`);
          await client.query('ROLLBACK');
          throw error;
        }
      }

      await client.query('COMMIT');
      console.log('\n' + '='.repeat(60));
      console.log('MIGRATION COMPLETE');
      console.log('='.repeat(60));

    } finally {
      await client.end();
    }
  }

  getMigrations() {
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    return files.map(filename => ({
      filename,
      sql: fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8')
    }));
  }

  async rollback(options) {
    console.log('Rollback not yet implemented');
    console.log('To rollback, manually run inverse SQL or restore from backup');
  }
}
