#!/usr/bin/env node
/**
 * Apply exclusion filters to failed candidates, then report what remains.
 * Also filters out already-verified candidates to show only the domain-missing ones.
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech:5432/Marketing%20DB?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

// Exclusion keywords (from clean_outreach_table.py)
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
  // Get ALL failed candidates from this batch
  const r = await pool.query(`
    SELECT
      candidate_id,
      raw_payload->>'company_name' AS company_name,
      raw_payload->>'city' AS city,
      state_code,
      raw_payload->>'participants' AS participants,
      raw_payload->>'ein' AS ein
    FROM cl.company_candidate
    WHERE source_system = 'HUNTER_DOL_SS003'
      AND verification_status = 'FAILED'
    ORDER BY (raw_payload->>'participants')::int DESC NULLS LAST
  `);

  const total = r.rows.length;
  console.log(`Total failed candidates: ${total}`);
  console.log('');

  // Apply keyword filters
  const filtered = [];
  const kept = [];

  for (const row of r.rows) {
    const nameLower = (row.company_name || '').toLowerCase();
    const matchedKeyword = EXCLUDED_KEYWORDS.find(kw => nameLower.includes(kw));

    if (matchedKeyword) {
      filtered.push({ ...row, reason: matchedKeyword });
    } else {
      kept.push(row);
    }
  }

  console.log('═'.repeat(60));
  console.log('FILTER RESULTS');
  console.log('═'.repeat(60));
  console.log(`Total failed: ${total}`);
  console.log(`Filtered out (non-commercial): ${filtered.length}`);
  console.log(`Remaining (need domain discovery): ${kept.length}`);
  console.log('');

  // Keyword breakdown
  const keywordCounts = {};
  for (const f of filtered) {
    keywordCounts[f.reason] = (keywordCounts[f.reason] || 0) + 1;
  }
  console.log('Filter breakdown:');
  const sorted = Object.entries(keywordCounts).sort((a, b) => b[1] - a[1]);
  for (const [kw, count] of sorted) {
    console.log(`  "${kw}": ${count}`);
  }

  // State breakdown of remaining
  console.log('');
  const stateCounts = {};
  for (const row of kept) {
    stateCounts[row.state_code] = (stateCounts[row.state_code] || 0) + 1;
  }
  console.log('Remaining by state:');
  for (const [state, count] of Object.entries(stateCounts).sort()) {
    console.log(`  ${state}: ${count}`);
  }

  // Show top 30 remaining (biggest companies by participants)
  console.log('');
  console.log('Top 30 remaining companies (by participant count):');
  kept.slice(0, 30).forEach((row, i) => {
    console.log(
      `  ${(i + 1).toString().padStart(2)}. ${row.company_name}` +
      ` | ${row.city}, ${row.state_code}` +
      ` | ${row.participants} participants` +
      ` | EIN: ${row.ein}`
    );
  });

  // Show some filtered examples
  console.log('');
  console.log('Sample filtered companies (first 15):');
  filtered.slice(0, 15).forEach((row, i) => {
    console.log(
      `  ${(i + 1).toString().padStart(2)}. ${row.company_name}` +
      ` | reason: "${row.reason}"`
    );
  });

  // Write kept list to JSON for next step
  const fs = require('fs');
  fs.writeFileSync('domain_discovery_queue.json', JSON.stringify(kept, null, 2));
  console.log(`\nWrote ${kept.length} companies to domain_discovery_queue.json`);

  await pool.end();
})();
