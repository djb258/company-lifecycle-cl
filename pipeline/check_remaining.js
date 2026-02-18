#!/usr/bin/env node
/**
 * Check current state of failed candidates needing domain discovery.
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech:5432/Marketing%20DB?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

// Exclusion keywords (non-commercial entities to skip)
const EXCLUDED_KEYWORDS = [
  'county', 'city of', 'state of', 'township', 'municipality', 'borough',
  'government', 'federal', 'dept of', 'department of', 'public works',
  'water authority', 'sewer', 'port authority', 'transit authority',
  'school district', 'public school', 'high school', 'middle school',
  'elementary school', 'university', 'college', 'academy', ' isd',
  'insurance company', 'mutual insurance', 'indemnity',
  'foundation', 'charitable', 'ministry', 'ministries', 'church',
  'temple', 'synagogue', 'mosque', 'baptist', 'methodist', 'lutheran',
  'presbyterian', 'catholic', 'diocese', 'archdiocese',
  'credit union', 'veterans', 'va hospital',
];

(async () => {
  // Current counts
  const counts = await pool.query(`
    SELECT verification_status, COUNT(*) AS cnt
    FROM cl.company_candidate
    WHERE source_system = 'HUNTER_DOL_SS003'
    GROUP BY verification_status
    ORDER BY cnt DESC
  `);
  console.log('Current status breakdown:');
  for (const row of counts.rows) {
    console.log(`  ${row.verification_status}: ${row.cnt}`);
  }
  console.log('');

  // Get remaining failed candidates
  const r = await pool.query(`
    SELECT
      candidate_id,
      raw_payload->>'company_name' AS company_name,
      raw_payload->>'city' AS city,
      state_code,
      raw_payload->>'participants' AS participants,
      raw_payload->>'ein' AS ein,
      raw_payload->>'company_domain' AS company_domain
    FROM cl.company_candidate
    WHERE source_system = 'HUNTER_DOL_SS003'
      AND verification_status = 'FAILED'
    ORDER BY (raw_payload->>'participants')::int DESC NULLS LAST
  `);

  // Apply keyword filters
  const kept = [];
  let filtered = 0;
  for (const row of r.rows) {
    const nameLower = (row.company_name || '').toLowerCase();
    const matchedKeyword = EXCLUDED_KEYWORDS.find(kw => nameLower.includes(kw));
    if (matchedKeyword) {
      filtered++;
    } else {
      kept.push(row);
    }
  }

  console.log(`Total still FAILED: ${r.rows.length}`);
  console.log(`Filtered (non-commercial): ${filtered}`);
  console.log(`Remaining commercial needing domains: ${kept.length}`);
  console.log('');

  // Show top 50 needing domains
  console.log('Top 50 remaining companies (by participant count):');
  kept.slice(0, 50).forEach((row, i) => {
    console.log(
      `  ${(i + 1).toString().padStart(3)}. ${row.company_name}` +
      ` | ${row.city}, ${row.state_code}` +
      ` | ${row.participants} participants` +
      ` | EIN: ${row.ein}` +
      (row.company_domain ? ` | domain: ${row.company_domain}` : '')
    );
  });

  // Write full kept list
  const fs = require('fs');
  fs.writeFileSync('remaining_failed.json', JSON.stringify(kept, null, 2));
  console.log(`\nWrote ${kept.length} companies to remaining_failed.json`);

  await pool.end();
})();
