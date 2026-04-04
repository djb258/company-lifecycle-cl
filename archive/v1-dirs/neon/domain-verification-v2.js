// Domain Verification v2 - Tiered Verification with MXLookup + Escalation
// Toolbox approach: MXLookup (free) → HTTP (free) → Firecrawl/ScraperAPI (paid)
import pg from 'pg';
import dns from 'dns';
import { promisify } from 'util';
const { Client } = pg;

const resolveMx = promisify(dns.resolveMx);
const resolve4 = promisify(dns.resolve4);

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

// Error classification patterns
const ERROR_PATTERNS = {
  DOMAIN_TRANSIENT: [
    'socket hang up',
    'timeout',
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'HTTP 500',
    'HTTP 502',
    'HTTP 503',
    'HTTP 504',
    'HTTP 520', 'HTTP 521', 'HTTP 522', 'HTTP 523', 'HTTP 524',
    'Client network socket disconnected',
    'EAI_AGAIN'
  ],
  DOMAIN_DEAD: [
    'ENOTFOUND'
  ],
  DOMAIN_RATE_LIMITED: [
    'HTTP 429'
  ],
  DOMAIN_SSL_ISSUE: [
    'SSL routines',
    'ssl3_read_bytes',
    'TLS',
    'handshake failure',
    'HTTP 525',
    'HTTP 526'
  ],
  DOMAIN_EXISTS: [
    'HTTP 401', 'HTTP 402', 'HTTP 403', 'HTTP 404', 'HTTP 405',
    'HTTP 406', 'HTTP 407', 'HTTP 409', 'HTTP 410', 'HTTP 418', 'HTTP 451'
  ]
};

function classifyError(errorMsg) {
  if (!errorMsg) return 'DOMAIN_TRANSIENT';
  const msg = errorMsg.toLowerCase();

  for (const [category, patterns] of Object.entries(ERROR_PATTERNS)) {
    for (const pattern of patterns) {
      if (msg.includes(pattern.toLowerCase())) {
        return category;
      }
    }
  }
  return 'DOMAIN_TRANSIENT'; // Default to transient for retry
}

function extractDomain(url) {
  if (!url) return null;
  try {
    // Handle URLs without protocol
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const parsed = new URL(cleanUrl);
    return parsed.hostname;
  } catch {
    // Try to extract domain from malformed URL
    const match = url.match(/(?:https?:\/\/)?([^\/\s]+)/i);
    return match ? match[1] : null;
  }
}

async function checkMX(domain) {
  try {
    const mxRecords = await resolveMx(domain);
    return { success: true, records: mxRecords, tool: 'MXLookup', tier: 0 };
  } catch (err) {
    return { success: false, error: err.code || err.message, tool: 'MXLookup', tier: 0 };
  }
}

async function checkDNS(domain) {
  try {
    const aRecords = await resolve4(domain);
    return { success: true, records: aRecords, tool: 'DNSLookup', tier: 0 };
  } catch (err) {
    return { success: false, error: err.code || err.message, tool: 'DNSLookup', tier: 0 };
  }
}

async function checkHTTP(domain, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Try HTTPS first
    const response = await fetch(`https://${domain}`, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CompanyVerifier/2.0)'
      }
    });
    clearTimeout(timeout);
    return {
      success: true,
      status: response.status,
      tool: 'HTTPCheck',
      tier: 0,
      protocol: 'https'
    };
  } catch (httpsErr) {
    clearTimeout(timeout);

    // Try HTTP as fallback
    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), timeoutMs);

    try {
      const response = await fetch(`http://${domain}`, {
        method: 'HEAD',
        signal: controller2.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CompanyVerifier/2.0)'
        }
      });
      clearTimeout(timeout2);
      return {
        success: true,
        status: response.status,
        tool: 'HTTPCheck',
        tier: 0,
        protocol: 'http'
      };
    } catch (httpErr) {
      clearTimeout(timeout2);
      return {
        success: false,
        error: httpsErr.message || 'HTTP check failed',
        tool: 'HTTPCheck',
        tier: 0
      };
    }
  }
}

async function verifyDomain(domain) {
  const results = {
    domain,
    verified: false,
    tool_used: null,
    tool_tier: null,
    verification_method: null,
    error_category: null,
    details: {}
  };

  // Tier 0: MX Lookup (free, instant)
  const mxResult = await checkMX(domain);
  results.details.mx = mxResult;

  if (mxResult.success && mxResult.records?.length > 0) {
    results.verified = true;
    results.tool_used = 'MXLookup';
    results.tool_tier = 0;
    results.verification_method = 'MX_RECORDS_EXIST';
    return results;
  }

  // Tier 0: DNS A Record (free, instant)
  const dnsResult = await checkDNS(domain);
  results.details.dns = dnsResult;

  if (!dnsResult.success && dnsResult.error === 'ENOTFOUND') {
    // Domain doesn't exist at all
    results.error_category = 'DOMAIN_DEAD';
    results.tool_used = 'DNSLookup';
    results.tool_tier = 0;
    return results;
  }

  // Tier 0: HTTP Check (free, but slower)
  const httpResult = await checkHTTP(domain);
  results.details.http = httpResult;

  if (httpResult.success) {
    results.verified = true;
    results.tool_used = 'HTTPCheck';
    results.tool_tier = 0;
    results.verification_method = `HTTP_${httpResult.status}`;
    return results;
  }

  // Classify the failure
  results.error_category = classifyError(httpResult.error);
  results.tool_used = 'HTTPCheck';
  results.tool_tier = 0;

  return results;
}

async function reclassifyExistingErrors(client) {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 1: RECLASSIFY EXISTING ERRORS');
  console.log('='.repeat(70));

  // Get all unresolved DOMAIN_FAIL errors
  const errors = await client.query(`
    SELECT error_id, company_unique_id, inputs_snapshot->>'domain_error' as domain_error
    FROM cl.cl_errors
    WHERE failure_reason_code = 'DOMAIN_FAIL'
      AND resolved_at IS NULL
  `);

  console.log(`\nFound ${errors.rows.length} unresolved DOMAIN_FAIL errors to classify`);

  const classifications = {
    DOMAIN_TRANSIENT: [],
    DOMAIN_DEAD: [],
    DOMAIN_RATE_LIMITED: [],
    DOMAIN_SSL_ISSUE: [],
    DOMAIN_EXISTS: []
  };

  for (const error of errors.rows) {
    const category = classifyError(error.domain_error);
    classifications[category].push(error.error_id);
  }

  // Report
  console.log('\nClassification breakdown:');
  for (const [category, ids] of Object.entries(classifications)) {
    console.log(`  ${category}: ${ids.length}`);
  }

  // Update errors with their categories and set retry parameters
  console.log('\nUpdating error classifications...');

  // DOMAIN_EXISTS - resolve immediately (these are PASS)
  if (classifications.DOMAIN_EXISTS.length > 0) {
    const result = await client.query(`
      UPDATE cl.cl_errors
      SET resolved_at = NOW(),
          tool_used = 'reclassification_v2',
          tool_tier = 0,
          inputs_snapshot = inputs_snapshot || '{"resolution": "DOMAIN_EXISTS", "resolution_reason": "HTTP_response_indicates_domain_works"}'::jsonb
      WHERE error_id = ANY($1)
      RETURNING error_id
    `, [classifications.DOMAIN_EXISTS]);
    console.log(`  DOMAIN_EXISTS: ${result.rowCount} resolved (domain works, page issue)`);

    // Also mark companies as existence_verified
    const companyResult = await client.query(`
      UPDATE cl.company_identity ci
      SET existence_verified = TRUE, verified_at = NOW()
      FROM cl.cl_errors e
      WHERE e.error_id = ANY($1)
        AND e.company_unique_id = ci.company_unique_id
        AND (ci.existence_verified = FALSE OR ci.existence_verified IS NULL)
      RETURNING ci.company_unique_id
    `, [classifications.DOMAIN_EXISTS]);
    console.log(`    → ${companyResult.rowCount} companies marked as existence_verified`);
  }

  // DOMAIN_DEAD - mark as permanent, no retry
  if (classifications.DOMAIN_DEAD.length > 0) {
    await client.query(`
      UPDATE cl.cl_errors
      SET retry_ceiling = 0,
          tool_used = 'reclassification_v2',
          tool_tier = 0,
          inputs_snapshot = inputs_snapshot || '{"error_category": "DOMAIN_DEAD", "permanent": true}'::jsonb
      WHERE error_id = ANY($1)
    `, [classifications.DOMAIN_DEAD]);
    console.log(`  DOMAIN_DEAD: ${classifications.DOMAIN_DEAD.length} marked permanent (DNS ENOTFOUND)`);
  }

  // DOMAIN_TRANSIENT - set retry_after for 24h, 3 retries max
  if (classifications.DOMAIN_TRANSIENT.length > 0) {
    await client.query(`
      UPDATE cl.cl_errors
      SET retry_ceiling = 3,
          retry_after = NOW() + INTERVAL '24 hours',
          expires_at = NOW() + INTERVAL '30 days',
          tool_used = 'reclassification_v2',
          tool_tier = 0,
          inputs_snapshot = inputs_snapshot || '{"error_category": "DOMAIN_TRANSIENT", "retry_strategy": "backoff_24h"}'::jsonb
      WHERE error_id = ANY($1)
    `, [classifications.DOMAIN_TRANSIENT]);
    console.log(`  DOMAIN_TRANSIENT: ${classifications.DOMAIN_TRANSIENT.length} set for retry in 24h`);
  }

  // DOMAIN_RATE_LIMITED - set for ScraperAPI escalation
  if (classifications.DOMAIN_RATE_LIMITED.length > 0) {
    await client.query(`
      UPDATE cl.cl_errors
      SET retry_ceiling = 1,
          retry_after = NOW() + INTERVAL '1 hour',
          tool_used = 'reclassification_v2',
          tool_tier = 0,
          inputs_snapshot = inputs_snapshot || '{"error_category": "DOMAIN_RATE_LIMITED", "escalation_tool": "ScraperAPI", "escalation_tier": 1}'::jsonb
      WHERE error_id = ANY($1)
    `, [classifications.DOMAIN_RATE_LIMITED]);
    console.log(`  DOMAIN_RATE_LIMITED: ${classifications.DOMAIN_RATE_LIMITED.length} set for ScraperAPI escalation`);
  }

  // DOMAIN_SSL_ISSUE - set for Firecrawl escalation
  if (classifications.DOMAIN_SSL_ISSUE.length > 0) {
    await client.query(`
      UPDATE cl.cl_errors
      SET retry_ceiling = 1,
          retry_after = NOW() + INTERVAL '1 hour',
          tool_used = 'reclassification_v2',
          tool_tier = 0,
          inputs_snapshot = inputs_snapshot || '{"error_category": "DOMAIN_SSL_ISSUE", "escalation_tool": "Firecrawl", "escalation_tier": 1}'::jsonb
      WHERE error_id = ANY($1)
    `, [classifications.DOMAIN_SSL_ISSUE]);
    console.log(`  DOMAIN_SSL_ISSUE: ${classifications.DOMAIN_SSL_ISSUE.length} set for Firecrawl escalation`);
  }

  return classifications;
}

async function verifyTransientErrors(client, batchSize = 50) {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 2: RE-VERIFY TRANSIENT ERRORS WITH MXLOOKUP');
  console.log('='.repeat(70));

  // Get transient errors ready for retry
  const errors = await client.query(`
    SELECT e.error_id, e.company_unique_id, ci.company_domain
    FROM cl.cl_errors e
    JOIN cl.company_identity ci ON e.company_unique_id = ci.company_unique_id
    WHERE e.failure_reason_code = 'DOMAIN_FAIL'
      AND e.resolved_at IS NULL
      AND e.inputs_snapshot->>'error_category' = 'DOMAIN_TRANSIENT'
      AND (e.retry_after IS NULL OR e.retry_after <= NOW())
      AND e.retry_count < COALESCE(e.retry_ceiling, 3)
    LIMIT $1
  `, [batchSize]);

  console.log(`\nFound ${errors.rows.length} transient errors to re-verify`);

  if (errors.rows.length === 0) {
    console.log('No errors ready for re-verification.');
    return { verified: 0, stillFailing: 0, dead: 0 };
  }

  let verified = 0;
  let stillFailing = 0;
  let dead = 0;

  for (const error of errors.rows) {
    const domain = extractDomain(error.company_domain);
    if (!domain) {
      console.log(`  [SKIP] No domain for ${error.company_unique_id}`);
      continue;
    }

    const result = await verifyDomain(domain);

    if (result.verified) {
      // Resolve the error
      await client.query(`
        UPDATE cl.cl_errors
        SET resolved_at = NOW(),
            tool_used = $1,
            tool_tier = $2,
            inputs_snapshot = inputs_snapshot || $3::jsonb
        WHERE error_id = $4
      `, [
        result.tool_used,
        result.tool_tier,
        JSON.stringify({
          resolution: 'VERIFIED',
          verification_method: result.verification_method,
          details: result.details
        }),
        error.error_id
      ]);

      // Mark company as verified
      await client.query(`
        UPDATE cl.company_identity
        SET existence_verified = TRUE, verified_at = NOW()
        WHERE company_unique_id = $1
      `, [error.company_unique_id]);

      verified++;
      process.stdout.write(`  ✓ ${domain} - ${result.verification_method}\n`);
    } else if (result.error_category === 'DOMAIN_DEAD') {
      // Mark as permanent failure
      await client.query(`
        UPDATE cl.cl_errors
        SET retry_ceiling = 0,
            retry_count = retry_count + 1,
            tool_used = $1,
            tool_tier = $2,
            inputs_snapshot = inputs_snapshot || $3::jsonb
        WHERE error_id = $4
      `, [
        result.tool_used,
        result.tool_tier,
        JSON.stringify({
          error_category: 'DOMAIN_DEAD',
          permanent: true,
          details: result.details
        }),
        error.error_id
      ]);
      dead++;
      process.stdout.write(`  ✗ ${domain} - DEAD (DNS not found)\n`);
    } else {
      // Increment retry count and set next retry
      await client.query(`
        UPDATE cl.cl_errors
        SET retry_count = retry_count + 1,
            retry_after = NOW() + INTERVAL '24 hours' * (retry_count + 1),
            tool_used = $1,
            tool_tier = $2,
            inputs_snapshot = inputs_snapshot || $3::jsonb
        WHERE error_id = $4
      `, [
        result.tool_used,
        result.tool_tier,
        JSON.stringify({
          last_check: new Date().toISOString(),
          error_category: result.error_category,
          details: result.details
        }),
        error.error_id
      ]);
      stillFailing++;
      process.stdout.write(`  ~ ${domain} - still failing (${result.error_category})\n`);
    }

    // Small delay to avoid hammering servers
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { verified, stillFailing, dead };
}

async function runVerification() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('\n' + '='.repeat(70));
    console.log('DOMAIN VERIFICATION V2 - TIERED VERIFICATION');
    console.log('Toolbox: MXLookup (T0) → DNS (T0) → HTTP (T0) → Escalation (T1)');
    console.log('='.repeat(70));

    // Get before counts
    const beforeCounts = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved,
        COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved
      FROM cl.cl_errors
      WHERE failure_reason_code = 'DOMAIN_FAIL'
    `);
    console.log('\n[BEFORE] DOMAIN_FAIL errors:');
    console.table(beforeCounts.rows);

    // Phase 1: Reclassify existing errors
    const classifications = await reclassifyExistingErrors(client);

    // Phase 2: Re-verify transient errors (batch of 50)
    const verifyResults = await verifyTransientErrors(client, 50);

    // Get after counts
    const afterCounts = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved,
        COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved
      FROM cl.cl_errors
      WHERE failure_reason_code = 'DOMAIN_FAIL'
    `);
    console.log('\n[AFTER] DOMAIN_FAIL errors:');
    console.table(afterCounts.rows);

    // Category breakdown
    const categoryBreakdown = await client.query(`
      SELECT
        inputs_snapshot->>'error_category' as category,
        COUNT(*) as count
      FROM cl.cl_errors
      WHERE failure_reason_code = 'DOMAIN_FAIL'
        AND resolved_at IS NULL
      GROUP BY inputs_snapshot->>'error_category'
      ORDER BY count DESC
    `);
    console.log('\n[BREAKDOWN] Unresolved by category:');
    console.table(categoryBreakdown.rows);

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`
┌─────────────────────────────────────────┬────────────┐
│ ACTION                                  │ COUNT      │
├─────────────────────────────────────────┼────────────┤
│ DOMAIN_EXISTS resolved (4xx = works)    │ ${classifications.DOMAIN_EXISTS.length.toString().padStart(10)} │
│ DOMAIN_DEAD marked permanent            │ ${classifications.DOMAIN_DEAD.length.toString().padStart(10)} │
│ DOMAIN_TRANSIENT set for retry          │ ${classifications.DOMAIN_TRANSIENT.length.toString().padStart(10)} │
│ DOMAIN_RATE_LIMITED → ScraperAPI        │ ${classifications.DOMAIN_RATE_LIMITED.length.toString().padStart(10)} │
│ DOMAIN_SSL_ISSUE → Firecrawl            │ ${classifications.DOMAIN_SSL_ISSUE.length.toString().padStart(10)} │
├─────────────────────────────────────────┼────────────┤
│ Re-verified (MXLookup/DNS/HTTP)         │ ${verifyResults.verified.toString().padStart(10)} │
│ Confirmed dead (DNS not found)          │ ${verifyResults.dead.toString().padStart(10)} │
│ Still failing (will retry)              │ ${verifyResults.stillFailing.toString().padStart(10)} │
├─────────────────────────────────────────┼────────────┤
│ BEFORE unresolved                       │ ${beforeCounts.rows[0].unresolved.toString().padStart(10)} │
│ AFTER unresolved                        │ ${afterCounts.rows[0].unresolved.toString().padStart(10)} │
│ NET RESOLVED                            │ ${(parseInt(beforeCounts.rows[0].unresolved) - parseInt(afterCounts.rows[0].unresolved)).toString().padStart(10)} │
└─────────────────────────────────────────┴────────────┘
    `);

    console.log('\n✓ Domain Verification v2 complete.');
    console.log('  Tier 0 (free) methods used: MXLookup, DNSLookup, HTTPCheck');
    console.log('  Tier 1 escalation queued: ScraperAPI (rate limited), Firecrawl (SSL issues)');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

runVerification();
