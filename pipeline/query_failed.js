const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString:
    'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech:5432/Marketing%20DB?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const r = await pool.query(`
    SELECT
      candidate_id,
      raw_payload->>'company_name' AS company_name,
      raw_payload->>'city' AS city,
      state_code,
      raw_payload->>'participants' AS participants
    FROM cl.company_candidate
    WHERE source_system = 'HUNTER_DOL_SS003'
      AND verification_status = 'FAILED'
      AND (raw_payload->>'company_domain' IS NULL OR raw_payload->>'company_domain' = '')
    ORDER BY (raw_payload->>'participants')::int DESC NULLS LAST
  `);

  fs.writeFileSync('failed_candidates.json', JSON.stringify(r.rows, null, 2));
  console.log('Total failed candidates needing domains: ' + r.rows.length);
  console.log('');

  r.rows.slice(0, 30).forEach((row, i) => {
    console.log(
      (i + 1) + '. ' + row.company_name +
      ' | ' + row.city + ', ' + row.state_code +
      ' | ' + row.participants + ' participants'
    );
  });

  await pool.end();
})();
