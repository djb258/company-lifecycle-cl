// ============================================================================
// DEPRECATED: DO NOT USE
// ============================================================================
// This file ran post-hoc verification AFTER identity minting.
// New pipeline verifies BEFORE minting.
// USE INSTEAD: pipeline/lifecycle_worker.js (via orchestrator.js)
// ============================================================================
throw new Error(
  "DEPRECATED: pass-2-name-canonicalization.js is retired. " +
  "Verification now happens BEFORE identity minting via lifecycle_worker.js"
);

// PASS 2: Name Canonicalization & Alias Extraction
// Purpose: Collapse name ambiguity via deterministic normalization
// Cost: $0 (regex only, no LLMs)

import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

// ============================================
// CONFIG
// ============================================
const CONFIG = {
  BATCH_SIZE: 500,
  DRY_RUN: process.argv.includes('--dry-run'),
  LIMIT: process.argv.includes('--limit') ? parseInt(process.argv[process.argv.indexOf('--limit') + 1]) : null,
  ERROR_RATE_KILL_SWITCH: 0.5
};

// ============================================
// LEGAL SUFFIXES TO STRIP
// ============================================
const LEGAL_SUFFIXES = [
  'incorporated', 'inc', 'inc.',
  'corporation', 'corp', 'corp.',
  'company', 'co', 'co.',
  'limited', 'ltd', 'ltd.',
  'llc', 'l.l.c.', 'l.l.c',
  'llp', 'l.l.p.', 'l.l.p',
  'lp', 'l.p.', 'l.p',
  'pllc', 'p.l.l.c.',
  'pc', 'p.c.', 'p.c',
  'pa', 'p.a.', 'p.a',
  'plc', 'p.l.c.',
  'pvt', 'pvt.',
  'private',
  'holding', 'holdings',
  'group',
  'international', 'intl', 'intl.',
  'usa', 'us'
];

const SUFFIX_REGEX = new RegExp(
  `\\s*,?\\s*(${LEGAL_SUFFIXES.join('|')})\\s*\\.?\\s*$`,
  'gi'
);

// ============================================
// NORMALIZATION FUNCTIONS
// ============================================
function normalizeWhitespace(str) {
  return str.replace(/\s+/g, ' ').trim();
}

function normalizeQuotes(str) {
  return str
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"');
}

function normalizeAmpersand(str) {
  return str.replace(/\s*&\s*/g, ' and ');
}

function stripLegalSuffixes(str) {
  let result = str;
  let previous;
  // Loop to strip multiple suffixes (e.g., "Acme Holdings Inc LLC")
  do {
    previous = result;
    result = result.replace(SUFFIX_REGEX, '');
  } while (result !== previous);
  return result.trim();
}

function stripTrailingPunctuation(str) {
  return str.replace(/[.,;:!?]+$/, '').trim();
}

function createNormalized(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================
// MAIN CANONICALIZATION
// ============================================
function canonicalizeName(companyName) {
  if (!companyName || typeof companyName !== 'string') {
    return null;
  }

  // Step 1: Basic cleanup
  let name = companyName.trim();
  if (name.length < 2) return null;

  // Step 2: Normalize quotes and whitespace
  name = normalizeQuotes(name);
  name = normalizeWhitespace(name);

  // Step 3: Normalize ampersand
  name = normalizeAmpersand(name);

  // Step 4: Store legal name before stripping
  const legalName = name;

  // Step 5: Strip legal suffixes for canonical
  const canonical = stripTrailingPunctuation(stripLegalSuffixes(name));

  // Step 6: Create normalized (lowercase, alphanumeric only)
  const normalized = createNormalized(canonical);

  if (canonical.length < 2) return null;

  return {
    canonical,
    legal: legalName !== canonical ? legalName : null,
    normalized
  };
}

// ============================================
// METRICS
// ============================================
const metrics = {
  processed: 0,
  pass: 0,
  fail: 0,
  skip: 0,
  errors: []
};

// ============================================
// MAIN WORKER
// ============================================
async function runPass2() {
  const client = new Client({ connectionString });
  await client.connect();

  const runId = `PASS2-${Date.now()}`;

  console.log('==========================================');
  console.log('PASS 2: NAME CANONICALIZATION');
  console.log('==========================================');
  console.log(`Run ID: ${runId}`);
  console.log(`Dry Run: ${CONFIG.DRY_RUN}`);
  console.log(`Limit: ${CONFIG.LIMIT || 'ALL'}`);
  console.log('==========================================\n');

  try {
    // Get companies to process
    const limitClause = CONFIG.LIMIT ? `LIMIT ${CONFIG.LIMIT}` : '';
    const query = `
      SELECT ci.company_unique_id, ci.company_name, ci.linkedin_company_url
      FROM cl.company_identity ci
      WHERE ci.existence_verified = TRUE
        AND ci.company_unique_id NOT IN (
          SELECT DISTINCT company_unique_id FROM cl.company_names
        )
      ORDER BY ci.created_at
      ${limitClause}
    `;

    const result = await client.query(query);
    const companies = result.rows;

    console.log(`Found ${companies.length} companies to process\n`);

    if (companies.length === 0) {
      console.log('No companies need processing. Pass 2 complete.');
      await client.end();
      return metrics;
    }

    // Process in batches
    for (let i = 0; i < companies.length; i += CONFIG.BATCH_SIZE) {
      const batch = companies.slice(i, i + CONFIG.BATCH_SIZE);
      const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(companies.length / CONFIG.BATCH_SIZE);

      console.log(`Batch ${batchNum}/${totalBatches} (${batch.length} companies)`);

      const nameInserts = [];
      const canonicalUpdates = [];
      const errorInserts = [];

      for (const company of batch) {
        metrics.processed++;

        const result = canonicalizeName(company.company_name);

        if (!result) {
          // Failed to extract name
          metrics.fail++;
          errorInserts.push({
            company_unique_id: company.company_unique_id,
            lifecycle_run_id: runId,
            pass_name: 'name',
            failure_reason_code: 'NAME_EMPTY',
            inputs_snapshot: {
              company_name: company.company_name
            }
          });
          continue;
        }

        metrics.pass++;

        // Add canonical name
        nameInserts.push({
          company_unique_id: company.company_unique_id,
          name_value: result.canonical,
          name_type: 'canonical'
        });

        // Add legal name if different
        if (result.legal) {
          nameInserts.push({
            company_unique_id: company.company_unique_id,
            name_value: result.legal,
            name_type: 'legal'
          });
        }

        // Add normalized name
        if (result.normalized && result.normalized !== result.canonical.toLowerCase()) {
          nameInserts.push({
            company_unique_id: company.company_unique_id,
            name_value: result.normalized,
            name_type: 'normalized'
          });
        }

        // Track canonical update
        canonicalUpdates.push({
          company_unique_id: company.company_unique_id,
          canonical_name: result.canonical
        });
      }

      // Execute batch inserts
      if (!CONFIG.DRY_RUN && nameInserts.length > 0) {
        // Insert names
        const nameValues = nameInserts.map((n, idx) => {
          const base = idx * 3;
          return `($${base + 1}, $${base + 2}, $${base + 3})`;
        }).join(', ');

        const nameParams = nameInserts.flatMap(n => [
          n.company_unique_id,
          n.name_value,
          n.name_type
        ]);

        await client.query(`
          INSERT INTO cl.company_names (company_unique_id, name_value, name_type)
          VALUES ${nameValues}
          ON CONFLICT (company_unique_id, name_value, name_type) DO NOTHING
        `, nameParams);

        // Update canonical_name on spine
        for (const update of canonicalUpdates) {
          await client.query(`
            UPDATE cl.company_identity
            SET canonical_name = $1
            WHERE company_unique_id = $2
          `, [update.canonical_name, update.company_unique_id]);
        }
      }

      // Insert errors
      if (!CONFIG.DRY_RUN && errorInserts.length > 0) {
        for (const err of errorInserts) {
          await client.query(`
            INSERT INTO cl.cl_errors (company_unique_id, lifecycle_run_id, pass_name, failure_reason_code, inputs_snapshot)
            VALUES ($1, $2, $3, $4, $5)
          `, [err.company_unique_id, err.lifecycle_run_id, err.pass_name, err.failure_reason_code, err.inputs_snapshot]);
        }
      }

      // Check kill switch
      const errorRate = metrics.fail / metrics.processed;
      if (errorRate > CONFIG.ERROR_RATE_KILL_SWITCH && metrics.processed > 100) {
        console.log(`\nKILL SWITCH: Error rate ${(errorRate * 100).toFixed(1)}% > ${CONFIG.ERROR_RATE_KILL_SWITCH * 100}%`);
        break;
      }

      // Progress
      console.log(`   Processed: ${metrics.processed} | Pass: ${metrics.pass} | Fail: ${metrics.fail}`);
    }

    // Final summary
    console.log('\n==========================================');
    console.log('PASS 2 COMPLETE');
    console.log('==========================================');
    console.log(`Run ID: ${runId}`);
    console.log(`Processed: ${metrics.processed}`);
    console.log(`Pass: ${metrics.pass}`);
    console.log(`Fail: ${metrics.fail}`);
    console.log(`Skip: ${metrics.skip}`);
    console.log(`Error Rate: ${((metrics.fail / metrics.processed) * 100).toFixed(2)}%`);
    console.log(`Cost: $0.00 (regex only)`);

    if (!CONFIG.DRY_RUN) {
      // Verify results
      const nameCount = await client.query('SELECT COUNT(*) FROM cl.company_names');
      const canonicalCount = await client.query('SELECT COUNT(*) FROM cl.company_identity WHERE canonical_name IS NOT NULL');
      console.log(`\nVerification:`);
      console.log(`  cl.company_names: ${nameCount.rows[0].count} records`);
      console.log(`  Companies with canonical_name: ${canonicalCount.rows[0].count}`);
    }

  } catch (error) {
    console.error('ERROR:', error.message);
    throw error;
  } finally {
    await client.end();
  }

  return metrics;
}

runPass2().catch(console.error);
