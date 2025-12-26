// Apply schema comments to CL table
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString =
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function applyComments() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to Neon database');

    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', '002_cl_schema_comments.sql'),
      'utf8'
    );

    console.log('Applying schema comments...');
    await client.query(sql);
    console.log('Comments applied successfully');

    // Verify
    console.log('\n=== TABLE COMMENT ===');
    const tableComment = await client.query(`
      SELECT obj_description('cl.company_identity'::regclass) as comment
    `);
    console.log(tableComment.rows[0].comment);

    console.log('\n=== COLUMN COMMENTS ===');
    const colComments = await client.query(`
      SELECT
        a.attname as column_name,
        col_description('cl.company_identity'::regclass, a.attnum) as comment
      FROM pg_attribute a
      WHERE a.attrelid = 'cl.company_identity'::regclass
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY a.attnum
    `);
    console.table(colComments.rows);

  } finally {
    await client.end();
  }
}

applyComments();
