// ============================================================================
// DEPRECATED: DO NOT USE
// ============================================================================
throw new Error("DEPRECATED: pass-4-collision-detection.js is retired. Dedup now happens BEFORE identity minting.");

// PASS 4: Collision Detection & Resolution
// Purpose: Eliminate duplicate identities
// Cost: $0 deterministic; LLM gated (<3%)

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
  NAME_SIMILARITY_THRESHOLD: 0.95, // 95% match
  ENABLE_LLM_COLLISION_RESOLUTION: false, // Feature flag - OFF by default
  LLM_MAX_PERCENT: 0.03 // Max 3% of records
};

// ============================================
// SIMILARITY FUNCTIONS
// ============================================

// Levenshtein distance
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Normalized similarity (0-1)
function similarity(a, b) {
  if (!a || !b) return 0;
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  if (aLower === bLower) return 1;

  const maxLen = Math.max(aLower.length, bLower.length);
  if (maxLen === 0) return 1;

  const dist = levenshtein(aLower, bLower);
  return 1 - (dist / maxLen);
}

// Normalize domain for comparison
function normalizeDomain(domain) {
  if (!domain) return null;
  return domain
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .trim();
}

// Count non-null fields for heuristic resolution
function countNonNullFields(row) {
  let count = 0;
  for (const key of Object.keys(row)) {
    if (row[key] !== null && row[key] !== undefined && row[key] !== '') {
      count++;
    }
  }
  return count;
}

// ============================================
// METRICS
// ============================================
const metrics = {
  processed: 0,
  domainCollisions: 0,
  nameCollisions: 0,
  linkedinCollisions: 0,
  totalCollisions: 0,
  resolved: 0,
  unresolved: 0,
  llmEscalations: 0
};

// ============================================
// MAIN WORKER
// ============================================
async function runPass4() {
  const client = new Client({ connectionString });
  await client.connect();

  const runId = `PASS4-${Date.now()}`;

  console.log('==========================================');
  console.log('PASS 4: COLLISION DETECTION');
  console.log('==========================================');
  console.log(`Run ID: ${runId}`);
  console.log(`Dry Run: ${CONFIG.DRY_RUN}`);
  console.log(`Limit: ${CONFIG.LIMIT || 'ALL'}`);
  console.log(`LLM Enabled: ${CONFIG.ENABLE_LLM_COLLISION_RESOLUTION}`);
  console.log('==========================================\n');

  try {
    // ========================================
    // PHASE 1: DOMAIN COLLISIONS
    // ========================================
    console.log('PHASE 1: Domain Collisions\n');

    const domainQuery = `
      SELECT
        LOWER(REPLACE(REPLACE(cd.domain, 'https://', ''), 'http://', '')) as normalized_domain,
        array_agg(cd.company_unique_id) as company_ids,
        COUNT(*) as count
      FROM cl.company_domains cd
      WHERE cd.domain IS NOT NULL
        AND cd.domain != ''
      GROUP BY LOWER(REPLACE(REPLACE(cd.domain, 'https://', ''), 'http://', ''))
      HAVING COUNT(*) > 1
      ${CONFIG.LIMIT ? `LIMIT ${CONFIG.LIMIT}` : ''}
    `;

    const domainResult = await client.query(domainQuery);
    console.log(`Found ${domainResult.rows.length} domains with multiple companies\n`);

    for (const row of domainResult.rows) {
      metrics.processed++;
      metrics.domainCollisions++;
      metrics.totalCollisions++;

      const companyIds = row.company_ids;

      // Get company details for resolution
      const companiesResult = await client.query(`
        SELECT company_unique_id, company_name, canonical_name, created_at,
               company_domain, linkedin_company_url, state_verified
        FROM cl.company_identity
        WHERE company_unique_id = ANY($1)
        ORDER BY created_at ASC
      `, [companyIds]);

      const companies = companiesResult.rows;

      // Deterministic resolution: oldest wins
      const winner = companies[0];
      const losers = companies.slice(1);

      // Log collision
      if (!CONFIG.DRY_RUN) {
        for (const loser of losers) {
          await client.query(`
            INSERT INTO cl.cl_errors (
              company_unique_id, lifecycle_run_id, pass_name,
              failure_reason_code, inputs_snapshot
            ) VALUES ($1, $2, $3, $4, $5)
          `, [
            loser.company_unique_id,
            runId,
            'collision',
            'COLLISION_DOMAIN',
            {
              collision_type: 'domain',
              domain: row.normalized_domain,
              winner_id: winner.company_unique_id,
              winner_name: winner.company_name,
              loser_name: loser.company_name,
              resolution: 'DETERMINISTIC_OLDEST',
              all_companies: companies.map(c => ({
                id: c.company_unique_id,
                name: c.company_name,
                created_at: c.created_at
              }))
            }
          ]);
        }
      }

      metrics.resolved++;
    }

    console.log(`Domain collisions: ${metrics.domainCollisions}`);

    // ========================================
    // PHASE 2: LINKEDIN COLLISIONS
    // ========================================
    console.log('\nPHASE 2: LinkedIn Collisions\n');

    const linkedinQuery = `
      SELECT
        LOWER(linkedin_company_url) as normalized_linkedin,
        array_agg(company_unique_id) as company_ids,
        COUNT(*) as count
      FROM cl.company_identity
      WHERE linkedin_company_url IS NOT NULL
        AND linkedin_company_url != ''
      GROUP BY LOWER(linkedin_company_url)
      HAVING COUNT(*) > 1
      ${CONFIG.LIMIT ? `LIMIT ${CONFIG.LIMIT}` : ''}
    `;

    const linkedinResult = await client.query(linkedinQuery);
    console.log(`Found ${linkedinResult.rows.length} LinkedIn URLs with multiple companies\n`);

    for (const row of linkedinResult.rows) {
      metrics.processed++;
      metrics.linkedinCollisions++;
      metrics.totalCollisions++;

      const companyIds = row.company_ids;

      // Get company details
      const companiesResult = await client.query(`
        SELECT company_unique_id, company_name, canonical_name, created_at,
               company_domain, linkedin_company_url
        FROM cl.company_identity
        WHERE company_unique_id = ANY($1)
        ORDER BY created_at ASC
      `, [companyIds]);

      const companies = companiesResult.rows;
      const winner = companies[0];
      const losers = companies.slice(1);

      if (!CONFIG.DRY_RUN) {
        for (const loser of losers) {
          await client.query(`
            INSERT INTO cl.cl_errors (
              company_unique_id, lifecycle_run_id, pass_name,
              failure_reason_code, inputs_snapshot
            ) VALUES ($1, $2, $3, $4, $5)
          `, [
            loser.company_unique_id,
            runId,
            'collision',
            'COLLISION_LINKEDIN',
            {
              collision_type: 'linkedin',
              linkedin_url: row.normalized_linkedin,
              winner_id: winner.company_unique_id,
              winner_name: winner.company_name,
              loser_name: loser.company_name,
              resolution: 'DETERMINISTIC_OLDEST'
            }
          ]);
        }
      }

      metrics.resolved++;
    }

    console.log(`LinkedIn collisions: ${metrics.linkedinCollisions}`);

    // ========================================
    // PHASE 3: NAME COLLISIONS (normalized)
    // ========================================
    console.log('\nPHASE 3: Name Collisions\n');

    // Get all normalized names
    const nameQuery = `
      SELECT
        cn.name_value,
        array_agg(DISTINCT cn.company_unique_id) as company_ids,
        COUNT(DISTINCT cn.company_unique_id) as count
      FROM cl.company_names cn
      WHERE cn.name_type = 'normalized'
      GROUP BY cn.name_value
      HAVING COUNT(DISTINCT cn.company_unique_id) > 1
      ${CONFIG.LIMIT ? `LIMIT ${CONFIG.LIMIT}` : ''}
    `;

    const nameResult = await client.query(nameQuery);
    console.log(`Found ${nameResult.rows.length} normalized names with multiple companies\n`);

    for (const row of nameResult.rows) {
      metrics.processed++;
      metrics.nameCollisions++;
      metrics.totalCollisions++;

      const companyIds = row.company_ids;

      // Get company details
      const companiesResult = await client.query(`
        SELECT company_unique_id, company_name, canonical_name, created_at,
               company_domain, linkedin_company_url
        FROM cl.company_identity
        WHERE company_unique_id = ANY($1)
        ORDER BY created_at ASC
      `, [companyIds]);

      const companies = companiesResult.rows;

      // For name collisions, use heuristic: most complete record wins
      const ranked = companies
        .map(c => ({ ...c, score: countNonNullFields(c) }))
        .sort((a, b) => b.score - a.score);

      const winner = ranked[0];
      const losers = ranked.slice(1);

      if (!CONFIG.DRY_RUN) {
        for (const loser of losers) {
          await client.query(`
            INSERT INTO cl.cl_errors (
              company_unique_id, lifecycle_run_id, pass_name,
              failure_reason_code, inputs_snapshot
            ) VALUES ($1, $2, $3, $4, $5)
          `, [
            loser.company_unique_id,
            runId,
            'collision',
            'COLLISION_NAME',
            {
              collision_type: 'name',
              normalized_name: row.name_value,
              winner_id: winner.company_unique_id,
              winner_name: winner.company_name,
              winner_score: winner.score,
              loser_name: loser.company_name,
              loser_score: loser.score,
              resolution: 'HEURISTIC_COMPLETENESS'
            }
          ]);
        }
      }

      metrics.resolved++;
    }

    console.log(`Name collisions: ${metrics.nameCollisions}`);

    // Final summary
    console.log('\n==========================================');
    console.log('PASS 4 COMPLETE');
    console.log('==========================================');
    console.log(`Run ID: ${runId}`);
    console.log(`\nCollisions Detected:`);
    console.log(`  Domain:   ${metrics.domainCollisions}`);
    console.log(`  LinkedIn: ${metrics.linkedinCollisions}`);
    console.log(`  Name:     ${metrics.nameCollisions}`);
    console.log(`  TOTAL:    ${metrics.totalCollisions}`);
    console.log(`\nResolution:`);
    console.log(`  Resolved:   ${metrics.resolved}`);
    console.log(`  Unresolved: ${metrics.unresolved}`);
    console.log(`  LLM Escalations: ${metrics.llmEscalations}`);
    console.log(`\nCost: $0.00 (deterministic only)`);

    if (!CONFIG.DRY_RUN) {
      const errorCount = await client.query(`
        SELECT COUNT(*) FROM cl.cl_errors
        WHERE pass_name = 'collision' AND lifecycle_run_id = $1
      `, [runId]);
      console.log(`\nErrors logged: ${errorCount.rows[0].count}`);
    }

  } catch (error) {
    console.error('ERROR:', error.message);
    throw error;
  } finally {
    await client.end();
  }

  return metrics;
}

runPass4().catch(console.error);
