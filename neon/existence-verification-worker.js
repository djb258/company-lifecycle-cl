// CL Existence Verification Worker
// Verifies company existence before sovereign ID minting
// Checks: Domain resolution, Name coherence, State coherence

import pg from 'pg';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

// Configuration
const CONFIG = {
  CONCURRENCY: 10,              // Parallel requests
  TIMEOUT_MS: 10000,            // 10s timeout per request
  NAME_MATCH_THRESHOLD: 0,      // Name match is informational only
  ERROR_RATE_KILL_SWITCH: 0.8,  // Kill if >80% DOMAIN failures
  ERROR_WINDOW_SIZE: 100,       // Rolling window for error rate
  BATCH_SIZE: 100,              // Records per batch
  VERIFICATION_RUN_ID: `VERIFY-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
  // Treat 403 as PASS (site exists, just blocks bots)
  ACCEPT_403: true
};

// Stats tracking
const stats = {
  total: 0,
  processed: 0,
  passed: 0,
  failed: 0,
  domainFail: 0,
  nameMismatch: 0,
  stateContradiction: 0,
  errors: [],
  startTime: Date.now()
};

// Rolling error window for kill switch
const errorWindow = [];

async function main() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('==========================================');
    console.log('CL EXISTENCE VERIFICATION WORKER');
    console.log('==========================================');
    console.log('Run ID:', CONFIG.VERIFICATION_RUN_ID);
    console.log('Concurrency:', CONFIG.CONCURRENCY);
    console.log('Name match threshold:', CONFIG.NAME_MATCH_THRESHOLD);
    console.log('');

    // 1. Create error table if not exists
    await createErrorTable(client);

    // 2. Add verification columns to company_identity if not exist
    await addVerificationColumns(client);

    // 3. Get unverified NC companies
    const companies = await getUnverifiedCompanies(client);
    stats.total = companies.length;
    console.log('Companies to verify:', stats.total);

    if (stats.total === 0) {
      console.log('No companies to verify. Exiting.');
      return;
    }

    // 4. Process in batches with concurrency control
    for (let i = 0; i < companies.length; i += CONFIG.BATCH_SIZE) {
      const batch = companies.slice(i, i + CONFIG.BATCH_SIZE);
      console.log(`\nBatch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}/${Math.ceil(companies.length / CONFIG.BATCH_SIZE)}`);

      // Process batch with bounded concurrency
      await processBatchWithConcurrency(client, batch, CONFIG.CONCURRENCY);

      // Check kill switch
      if (shouldKill()) {
        console.error('\n🛑 KILL SWITCH ACTIVATED - Error rate exceeded threshold');
        console.error(`Error rate: ${getErrorRate().toFixed(2)} > ${CONFIG.ERROR_RATE_KILL_SWITCH}`);
        break;
      }

      // Progress report
      const elapsed = (Date.now() - stats.startTime) / 1000;
      const rate = stats.processed / elapsed;
      console.log(`  Progress: ${stats.processed}/${stats.total} (${rate.toFixed(1)}/sec) | Pass: ${stats.passed} | Fail: ${stats.failed}`);
    }

    // 5. Final report
    printFinalReport();

  } catch (error) {
    console.error('FATAL ERROR:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Create cl_err_existence table
async function createErrorTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS cl.cl_err_existence (
      error_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_unique_id UUID NOT NULL,
      company_name TEXT,
      company_domain TEXT,
      linkedin_company_url TEXT,
      reason_code TEXT NOT NULL,
      domain_status_code INT,
      domain_redirect_chain TEXT[],
      domain_final_url TEXT,
      domain_error TEXT,
      extracted_name TEXT,
      name_match_score INT,
      extracted_state TEXT,
      state_match_result TEXT,
      evidence JSONB,
      verification_run_id TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_err_existence_run
    ON cl.cl_err_existence(verification_run_id)
  `);

  console.log('✓ Error table ready: cl.cl_err_existence');
}

// Add verification columns to company_identity
async function addVerificationColumns(client) {
  const columns = [
    { name: 'existence_verified', type: 'BOOLEAN DEFAULT FALSE' },
    { name: 'verification_run_id', type: 'TEXT' },
    { name: 'verified_at', type: 'TIMESTAMPTZ' },
    { name: 'domain_status_code', type: 'INT' },
    { name: 'name_match_score', type: 'INT' },
    { name: 'state_match_result', type: 'TEXT' }
  ];

  for (const col of columns) {
    try {
      await client.query(`
        ALTER TABLE cl.company_identity
        ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
      `);
    } catch (e) {
      // Column might already exist
    }
  }
  console.log('✓ Verification columns ready');
}

// Get unverified companies (all with NULL existence_verified)
async function getUnverifiedCompanies(client) {
  const result = await client.query(`
    SELECT company_unique_id, company_name, company_domain, linkedin_company_url
    FROM cl.company_identity
    WHERE existence_verified IS NULL
    ORDER BY created_at
  `);
  return result.rows;
}

// Process batch with bounded concurrency
async function processBatchWithConcurrency(client, batch, concurrency) {
  const chunks = [];
  for (let i = 0; i < batch.length; i += concurrency) {
    chunks.push(batch.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(company => verifyCompany(company))
    );

    // Write results to database
    for (const result of results) {
      await writeResult(client, result);
    }
  }
}

// Verify a single company
async function verifyCompany(company) {
  const result = {
    company,
    domain: { resolved: false, statusCode: null, redirectChain: [], finalUrl: null, error: null },
    name: { extracted: null, score: 0 },
    state: { extracted: null, match: 'SOFT_FAIL' },
    decision: 'FAIL',
    reasonCode: null,
    evidence: {}
  };

  try {
    // 1. Domain Resolution (HARD GATE)
    if (company.company_domain) {
      const domainResult = await checkDomain(company.company_domain);
      result.domain = domainResult;

      if (!domainResult.resolved) {
        result.reasonCode = 'DOMAIN_FAIL';
        result.evidence.domainError = domainResult.error;
        return result;
      }

      // 2. Extract page content for coherence checks
      if (domainResult.html) {
        // Name coherence
        const extractedName = extractCompanyName(domainResult.html);
        result.name.extracted = extractedName;
        result.name.score = calculateNameScore(company.company_name, extractedName);
        result.evidence.extractedName = extractedName;

        // State coherence
        const extractedState = extractState(domainResult.html);
        result.state.extracted = extractedState;
        result.state.match = checkStateMatch(extractedState, 'NC');
        result.evidence.extractedState = extractedState;
      }
    } else if (company.linkedin_company_url) {
      // LinkedIn-only company - pass domain check, skip coherence
      result.domain.resolved = true;
      result.domain.statusCode = 0; // Indicates LinkedIn-only
      result.name.score = 100; // Trust LinkedIn
      result.state.match = 'SOFT_FAIL'; // Can't verify from LinkedIn
    }

    // 3. Decision Logic
    // PRIMARY GATE: Domain resolves = company exists
    // Name/State are informational, not blocking (except state contradiction)
    if (result.domain.resolved) {
      if (result.state.match === 'HARD_FAIL') {
        // Only fail if we found a DIFFERENT state (contradiction)
        result.decision = 'FAIL';
        result.reasonCode = 'STATE_CONTRADICTION';
      } else {
        // Domain resolved = company exists
        // Name score is informational only
        result.decision = 'PASS';
        result.reasonCode = null;
      }
    }

  } catch (error) {
    result.reasonCode = 'DOMAIN_FAIL';
    result.domain.error = error.message;
    result.evidence.error = error.message;
  }

  return result;
}

// Check if domain resolves
async function checkDomain(domain) {
  return new Promise((resolve) => {
    const result = {
      resolved: false,
      statusCode: null,
      redirectChain: [],
      finalUrl: null,
      error: null,
      html: null
    };

    // Normalize domain
    let url = domain;
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    const makeRequest = (requestUrl, redirectCount = 0) => {
      if (redirectCount > 5) {
        result.error = 'Too many redirects';
        resolve(result);
        return;
      }

      try {
        const parsedUrl = new URL(requestUrl);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          timeout: CONFIG.TIMEOUT_MS,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CLVerificationBot/1.0)',
            'Accept': 'text/html,application/xhtml+xml'
          },
          rejectUnauthorized: false // Allow self-signed certs
        };

        const req = protocol.request(options, (res) => {
          result.redirectChain.push({ url: requestUrl, status: res.statusCode });
          result.statusCode = res.statusCode;

          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            // Follow redirect
            let redirectUrl = res.headers.location;
            if (redirectUrl.startsWith('/')) {
              redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
            }
            makeRequest(redirectUrl, redirectCount + 1);
            return;
          }

          result.finalUrl = requestUrl;

          // Accept 2xx, 3xx, and optionally 403 (bot blocked but site exists)
          const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
          const is403 = res.statusCode === 403 && CONFIG.ACCEPT_403;

          if (isSuccess || is403) {
            result.resolved = true;

            if (is403) {
              // Site exists but blocks bots - no HTML to analyze
              result.html = null;
              resolve(result);
              return;
            }

            // Collect HTML for coherence checks (limit to 100KB)
            let html = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
              if (html.length < 100000) {
                html += chunk;
              }
            });
            res.on('end', () => {
              result.html = html;
              resolve(result);
            });
          } else {
            result.error = `HTTP ${res.statusCode}`;
            resolve(result);
          }
        });

        req.on('error', (error) => {
          result.error = error.message;
          resolve(result);
        });

        req.on('timeout', () => {
          req.destroy();
          result.error = 'Timeout';
          resolve(result);
        });

        req.end();
      } catch (error) {
        result.error = error.message;
        resolve(result);
      }
    };

    makeRequest(url);
  });
}

// Extract company name from HTML
function extractCompanyName(html) {
  const names = [];

  // Try <title>
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    names.push(cleanName(titleMatch[1]));
  }

  // Try og:site_name
  const ogMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  if (ogMatch) {
    names.push(cleanName(ogMatch[1]));
  }

  // Try schema.org Organization name
  const schemaMatch = html.match(/"@type"\s*:\s*"Organization"[^}]*"name"\s*:\s*"([^"]+)"/i);
  if (schemaMatch) {
    names.push(cleanName(schemaMatch[1]));
  }

  // Try footer copyright
  const copyrightMatch = html.match(/©\s*\d{4}\s*([^<\n.]+)/i);
  if (copyrightMatch) {
    names.push(cleanName(copyrightMatch[1]));
  }

  // Return most common or first
  return names[0] || null;
}

// Clean extracted name
function cleanName(name) {
  return name
    .replace(/\s*[-|–—]\s*.+$/, '') // Remove " - tagline"
    .replace(/\s*\|.+$/, '')        // Remove " | tagline"
    .replace(/^\s+|\s+$/g, '')      // Trim
    .replace(/\s+/g, ' ')           // Normalize spaces
    .slice(0, 100);                 // Limit length
}

// Calculate name match score (0-100)
function calculateNameScore(intakeName, extractedName) {
  if (!intakeName || !extractedName) return 0;

  const normalize = (s) => s.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const a = normalize(intakeName);
  const b = normalize(extractedName);

  if (a === b) return 100;

  // Token overlap
  const tokensA = new Set(a.split(' '));
  const tokensB = new Set(b.split(' '));
  const intersection = [...tokensA].filter(t => tokensB.has(t));
  const tokenScore = Math.round((intersection.length / Math.max(tokensA.size, tokensB.size)) * 100);

  // Substring check
  if (a.includes(b) || b.includes(a)) {
    return Math.max(tokenScore, 70);
  }

  return tokenScore;
}

// Extract state from HTML
function extractState(html) {
  // Common patterns for NC
  const patterns = [
    /,\s*(NC|North Carolina)\s*\d{5}/i,
    /addressRegion["']\s*:\s*["'](NC|North Carolina)["']/i,
    /(NC|North Carolina)\s*\d{5}/i,
    /headquarters?.+?(NC|North Carolina)/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1].toUpperCase() === 'NORTH CAROLINA' ? 'NC' : match[1].toUpperCase();
    }
  }

  return null;
}

// Check state match
function checkStateMatch(extracted, expected) {
  if (!extracted) return 'SOFT_FAIL';

  const normalizedExtracted = extracted.toUpperCase().replace('NORTH CAROLINA', 'NC');
  const normalizedExpected = expected.toUpperCase().replace('NORTH CAROLINA', 'NC');

  if (normalizedExtracted === normalizedExpected) return 'PASS';

  // Check for contradiction (different state found)
  const stateAbbrevs = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

  if (stateAbbrevs.includes(normalizedExtracted) && normalizedExtracted !== normalizedExpected) {
    return 'HARD_FAIL';
  }

  return 'SOFT_FAIL';
}

// Write verification result to database
async function writeResult(client, result) {
  stats.processed++;

  if (result.decision === 'PASS') {
    stats.passed++;
    errorWindow.push(false);

    // Update company_identity
    await client.query(`
      UPDATE cl.company_identity
      SET existence_verified = TRUE,
          verification_run_id = $1,
          verified_at = now(),
          domain_status_code = $2,
          name_match_score = $3,
          state_match_result = $4
      WHERE company_unique_id = $5
    `, [
      CONFIG.VERIFICATION_RUN_ID,
      result.domain.statusCode,
      result.name.score,
      result.state.match,
      result.company.company_unique_id
    ]);

  } else {
    stats.failed++;
    errorWindow.push(true);

    // Track failure type
    if (result.reasonCode === 'DOMAIN_FAIL') stats.domainFail++;
    else if (result.reasonCode === 'NAME_MISMATCH') stats.nameMismatch++;
    else if (result.reasonCode === 'STATE_CONTRADICTION') stats.stateContradiction++;

    // Insert into error table
    await client.query(`
      INSERT INTO cl.cl_err_existence (
        company_unique_id, company_name, company_domain, linkedin_company_url,
        reason_code, domain_status_code, domain_redirect_chain, domain_final_url,
        domain_error, extracted_name, name_match_score, extracted_state,
        state_match_result, evidence, verification_run_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      result.company.company_unique_id,
      result.company.company_name,
      result.company.company_domain,
      result.company.linkedin_company_url,
      result.reasonCode,
      result.domain.statusCode,
      result.domain.redirectChain.map(r => `${r.status}:${r.url}`),
      result.domain.finalUrl,
      result.domain.error,
      result.name.extracted,
      result.name.score,
      result.state.extracted,
      result.state.match,
      JSON.stringify(result.evidence),
      CONFIG.VERIFICATION_RUN_ID
    ]);

    // Mark as verified (failed)
    await client.query(`
      UPDATE cl.company_identity
      SET existence_verified = FALSE,
          verification_run_id = $1,
          verified_at = now(),
          domain_status_code = $2,
          name_match_score = $3,
          state_match_result = $4
      WHERE company_unique_id = $5
    `, [
      CONFIG.VERIFICATION_RUN_ID,
      result.domain.statusCode,
      result.name.score,
      result.state.match,
      result.company.company_unique_id
    ]);
  }

  // Trim error window
  if (errorWindow.length > CONFIG.ERROR_WINDOW_SIZE) {
    errorWindow.shift();
  }
}

// Get current error rate
function getErrorRate() {
  if (errorWindow.length === 0) return 0;
  const errors = errorWindow.filter(e => e).length;
  return errors / errorWindow.length;
}

// Check if kill switch should activate
function shouldKill() {
  return errorWindow.length >= CONFIG.ERROR_WINDOW_SIZE &&
         getErrorRate() > CONFIG.ERROR_RATE_KILL_SWITCH;
}

// Print final report
function printFinalReport() {
  const elapsed = (Date.now() - stats.startTime) / 1000;

  console.log('\n==========================================');
  console.log('EXISTENCE VERIFICATION REPORT');
  console.log('==========================================');
  console.log(`Run ID: ${CONFIG.VERIFICATION_RUN_ID}`);
  console.log(`Duration: ${elapsed.toFixed(1)}s`);
  console.log('');
  console.log('┌────────────────────┬──────────┐');
  console.log('│ Metric             │ Count    │');
  console.log('├────────────────────┼──────────┤');
  console.log(`│ Total              │ ${String(stats.total).padStart(8)} │`);
  console.log(`│ Processed          │ ${String(stats.processed).padStart(8)} │`);
  console.log(`│ PASS               │ ${String(stats.passed).padStart(8)} │`);
  console.log(`│ FAIL               │ ${String(stats.failed).padStart(8)} │`);
  console.log('├────────────────────┼──────────┤');
  console.log(`│ Domain Fail        │ ${String(stats.domainFail).padStart(8)} │`);
  console.log(`│ Name Mismatch      │ ${String(stats.nameMismatch).padStart(8)} │`);
  console.log(`│ State Contradiction│ ${String(stats.stateContradiction).padStart(8)} │`);
  console.log('└────────────────────┴──────────┘');
  console.log('');
  console.log(`Pass Rate: ${((stats.passed / stats.processed) * 100).toFixed(1)}%`);
  console.log(`Throughput: ${(stats.processed / elapsed).toFixed(1)} records/sec`);
}

main().catch(console.error);
