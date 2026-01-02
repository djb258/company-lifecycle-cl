// PASS 3: Domain ↔ Name Coherence
// Purpose: Ensure domain actually belongs to the company
// Cost: $0 (string matching only)

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
  ERROR_RATE_KILL_SWITCH: 0.5,
  MISMATCH_THRESHOLD: 20 // Below this = error
};

// ============================================
// GENERIC DOMAINS (skip coherence check)
// ============================================
const GENERIC_DOMAINS = new Set([
  'gmail', 'yahoo', 'hotmail', 'outlook', 'aol', 'msn',
  'info', 'contact', 'mail', 'email', 'web', 'site',
  'business', 'company', 'corp', 'inc', 'llc',
  'online', 'digital', 'solutions', 'services', 'group'
]);

// ============================================
// DOMAIN TOKENIZATION
// ============================================
function extractDomainName(domain) {
  if (!domain) return null;

  // Remove protocol if present
  let name = domain.replace(/^https?:\/\//i, '');

  // Remove www.
  name = name.replace(/^www\./i, '');

  // Get domain name without TLD
  const parts = name.split('.');
  if (parts.length < 2) return null;

  // Remove TLD (last part) and common secondary TLDs
  const tlds = ['com', 'org', 'net', 'io', 'co', 'us', 'gov', 'edu', 'biz', 'info'];
  while (parts.length > 1 && tlds.includes(parts[parts.length - 1].toLowerCase())) {
    parts.pop();
  }

  return parts.join('.');
}

function tokenizeDomain(domain) {
  const name = extractDomainName(domain);
  if (!name) return [];

  // Split by hyphens and common separators
  return name
    .toLowerCase()
    .split(/[-_.]/)
    .filter(t => t.length > 0);
}

function tokenizeCompanyName(name) {
  if (!name) return [];

  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1); // Skip single chars
}

// ============================================
// COHERENCE SCORING
// ============================================
function computeCoherence(domainTokens, nameTokens, aliases) {
  if (domainTokens.length === 0) return 0;

  // Combine all name tokens
  const allNameTokens = new Set([
    ...nameTokens,
    ...aliases.flatMap(a => tokenizeCompanyName(a))
  ]);

  // Check for generic domain
  if (domainTokens.some(t => GENERIC_DOMAINS.has(t))) {
    return 50; // Neutral for generic domains
  }

  // Count matches
  let matches = 0;
  for (const dt of domainTokens) {
    // Direct match
    if (allNameTokens.has(dt)) {
      matches++;
      continue;
    }

    // Substring match (domain token is part of name token or vice versa)
    for (const nt of allNameTokens) {
      if (nt.includes(dt) || dt.includes(nt)) {
        matches += 0.5;
        break;
      }
    }

    // Abbreviation match (first letters)
    const nameInitials = [...allNameTokens].map(t => t[0]).join('');
    if (nameInitials.includes(dt)) {
      matches += 0.5;
    }
  }

  // Calculate score
  const score = Math.round((matches / domainTokens.length) * 100);
  return Math.min(100, score);
}

// ============================================
// METRICS
// ============================================
const metrics = {
  processed: 0,
  pass: 0,
  fail: 0,
  skip: 0,
  high: 0,
  medium: 0,
  low: 0,
  mismatch: 0
};

// ============================================
// MAIN WORKER
// ============================================
async function runPass3() {
  const client = new Client({ connectionString });
  await client.connect();

  const runId = `PASS3-${Date.now()}`;

  console.log('==========================================');
  console.log('PASS 3: DOMAIN ↔ NAME COHERENCE');
  console.log('==========================================');
  console.log(`Run ID: ${runId}`);
  console.log(`Dry Run: ${CONFIG.DRY_RUN}`);
  console.log(`Limit: ${CONFIG.LIMIT || 'ALL'}`);
  console.log('==========================================\n');

  try {
    // Get domains to process
    const limitClause = CONFIG.LIMIT ? `LIMIT ${CONFIG.LIMIT}` : '';
    const query = `
      SELECT
        cd.domain_id,
        cd.company_unique_id,
        cd.domain,
        ci.company_name,
        ci.canonical_name
      FROM cl.company_domains cd
      JOIN cl.company_identity ci ON cd.company_unique_id = ci.company_unique_id
      WHERE cd.domain_health = 'LIVE'
        AND cd.domain_name_confidence IS NULL
      ORDER BY cd.checked_at
      ${limitClause}
    `;

    const result = await client.query(query);
    const domains = result.rows;

    console.log(`Found ${domains.length} domains to process\n`);

    if (domains.length === 0) {
      console.log('No domains need processing. Pass 3 complete.');
      await client.end();
      return metrics;
    }

    // Process in batches
    for (let i = 0; i < domains.length; i += CONFIG.BATCH_SIZE) {
      const batch = domains.slice(i, i + CONFIG.BATCH_SIZE);
      const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(domains.length / CONFIG.BATCH_SIZE);

      console.log(`Batch ${batchNum}/${totalBatches} (${batch.length} domains)`);

      const updates = [];
      const errorInserts = [];

      for (const domain of batch) {
        metrics.processed++;

        // Get aliases for this company
        const aliasResult = await client.query(`
          SELECT name_value FROM cl.company_names
          WHERE company_unique_id = $1
        `, [domain.company_unique_id]);
        const aliases = aliasResult.rows.map(r => r.name_value);

        // Tokenize
        const domainTokens = tokenizeDomain(domain.domain);
        const nameTokens = tokenizeCompanyName(domain.canonical_name || domain.company_name);

        // Compute coherence
        const confidence = computeCoherence(domainTokens, nameTokens, aliases);

        // Categorize
        if (confidence >= 80) {
          metrics.high++;
        } else if (confidence >= 50) {
          metrics.medium++;
        } else if (confidence >= CONFIG.MISMATCH_THRESHOLD) {
          metrics.low++;
        } else {
          metrics.mismatch++;
        }

        // Check for error
        if (confidence < CONFIG.MISMATCH_THRESHOLD) {
          metrics.fail++;
          errorInserts.push({
            company_unique_id: domain.company_unique_id,
            lifecycle_run_id: runId,
            pass_name: 'domain',
            failure_reason_code: 'DOMAIN_NAME_MISMATCH',
            inputs_snapshot: {
              domain: domain.domain,
              domain_tokens: domainTokens,
              company_name: domain.company_name,
              canonical_name: domain.canonical_name,
              name_tokens: nameTokens,
              aliases: aliases,
              confidence: confidence
            }
          });
        } else {
          metrics.pass++;
        }

        updates.push({
          domain_id: domain.domain_id,
          domain_name_confidence: confidence
        });
      }

      // Execute batch updates
      if (!CONFIG.DRY_RUN && updates.length > 0) {
        for (const update of updates) {
          await client.query(`
            UPDATE cl.company_domains
            SET domain_name_confidence = $1
            WHERE domain_id = $2
          `, [update.domain_name_confidence, update.domain_id]);
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

      // Progress
      console.log(`   Processed: ${metrics.processed} | High: ${metrics.high} | Med: ${metrics.medium} | Low: ${metrics.low} | Mismatch: ${metrics.mismatch}`);
    }

    // Final summary
    console.log('\n==========================================');
    console.log('PASS 3 COMPLETE');
    console.log('==========================================');
    console.log(`Run ID: ${runId}`);
    console.log(`Processed: ${metrics.processed}`);
    console.log(`Pass: ${metrics.pass}`);
    console.log(`Fail: ${metrics.fail} (mismatch < ${CONFIG.MISMATCH_THRESHOLD}%)`);
    console.log(`\nCoherence Distribution:`);
    console.log(`  HIGH (80-100):    ${metrics.high} (${((metrics.high / metrics.processed) * 100).toFixed(1)}%)`);
    console.log(`  MEDIUM (50-79):   ${metrics.medium} (${((metrics.medium / metrics.processed) * 100).toFixed(1)}%)`);
    console.log(`  LOW (20-49):      ${metrics.low} (${((metrics.low / metrics.processed) * 100).toFixed(1)}%)`);
    console.log(`  MISMATCH (0-19):  ${metrics.mismatch} (${((metrics.mismatch / metrics.processed) * 100).toFixed(1)}%)`);
    console.log(`Cost: $0.00 (string matching only)`);

    if (!CONFIG.DRY_RUN) {
      // Verify results
      const cohStats = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE domain_name_confidence >= 80) as high,
          COUNT(*) FILTER (WHERE domain_name_confidence >= 50 AND domain_name_confidence < 80) as medium,
          COUNT(*) FILTER (WHERE domain_name_confidence >= 20 AND domain_name_confidence < 50) as low,
          COUNT(*) FILTER (WHERE domain_name_confidence < 20) as mismatch
        FROM cl.company_domains
        WHERE domain_name_confidence IS NOT NULL
      `);
      console.log(`\nVerification (all time):`);
      console.log(`  HIGH: ${cohStats.rows[0].high}`);
      console.log(`  MEDIUM: ${cohStats.rows[0].medium}`);
      console.log(`  LOW: ${cohStats.rows[0].low}`);
      console.log(`  MISMATCH: ${cohStats.rows[0].mismatch}`);
    }

  } catch (error) {
    console.error('ERROR:', error.message);
    throw error;
  } finally {
    await client.end();
  }

  return metrics;
}

runPass3().catch(console.error);
