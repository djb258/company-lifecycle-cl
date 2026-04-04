#!/usr/bin/env node
/**
 * Contract Hash Generator
 *
 * DOCTRINE: This script generates deterministic hashes of:
 *   1. Neon schema structure
 *   2. Pipeline Intent Matrix
 *
 * These hashes are used by CI to detect drift.
 * Hash mismatch == doctrine violation == blocked merge.
 *
 * Usage:
 *   doppler run -- node scripts/generate_contract_hash.cjs           # Generate and save
 *   doppler run -- node scripts/generate_contract_hash.cjs --verify  # Generate to /tmp for CI comparison
 */

const { Pool } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONNECTION_STRING = process.env.VITE_DATABASE_URL;
const VERIFY_MODE = process.argv.includes('--verify');

if (!CONNECTION_STRING) {
  console.error('ERROR: VITE_DATABASE_URL not set.');
  console.error('Run with: doppler run -- node scripts/generate_contract_hash.cjs');
  process.exit(1);
}

const OUTPUT_PATH = VERIFY_MODE
  ? '/tmp/CONTRACT_HASH_VERIFY.json'
  : path.join(__dirname, '..', 'docs', 'audit', 'CONTRACT_HASH.json');

const PIPELINE_REVIEW_PATH = path.join(__dirname, '..', 'docs', 'operations', 'PIPELINE_SCRIPTS_REVIEW.md');

/**
 * Query Neon for schema structure
 */
async function getSchemaStructure(pool) {
  const query = `
    SELECT
      t.table_schema,
      t.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      tc.constraint_type,
      tc.constraint_name
    FROM information_schema.tables t
    JOIN information_schema.columns c
      ON t.table_schema = c.table_schema
      AND t.table_name = c.table_name
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON c.table_schema = ccu.table_schema
      AND c.table_name = ccu.table_name
      AND c.column_name = ccu.column_name
    LEFT JOIN information_schema.table_constraints tc
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE t.table_schema = 'cl'
      AND t.table_type = 'BASE TABLE'
    ORDER BY
      t.table_schema,
      t.table_name,
      c.ordinal_position,
      tc.constraint_type NULLS LAST
  `;

  const result = await pool.query(query);
  return result.rows;
}

/**
 * Extract Pipeline Intent Matrix from markdown
 */
function extractPipelineIntentMatrix() {
  const content = fs.readFileSync(PIPELINE_REVIEW_PATH, 'utf-8');

  // Find the Pipeline Intent Matrix section
  const matrixStart = content.indexOf('## Pipeline Intent Matrix');
  if (matrixStart === -1) {
    throw new Error('Pipeline Intent Matrix section not found in PIPELINE_SCRIPTS_REVIEW.md');
  }

  // Find the next section or end
  const nextSection = content.indexOf('\n## ', matrixStart + 1);
  const matrixEnd = nextSection === -1 ? content.length : nextSection;

  // Extract the matrix section
  const matrixSection = content.slice(matrixStart, matrixEnd);

  // Find the Authority Summary table as well
  const authorityStart = matrixSection.indexOf('### Authority Summary');
  if (authorityStart === -1) {
    throw new Error('Authority Summary section not found');
  }

  return matrixSection;
}

/**
 * Generate SHA-256 hash with stable ordering
 */
function generateHash(data) {
  // Sort for determinism
  const sorted = typeof data === 'string'
    ? data
    : JSON.stringify(data, Object.keys(data).sort());

  return crypto
    .createHash('sha256')
    .update(sorted, 'utf8')
    .digest('hex');
}

/**
 * Main execution
 */
async function main() {
  console.log('═'.repeat(60));
  console.log('CONTRACT HASH GENERATOR');
  console.log('═'.repeat(60));
  console.log(`Mode: ${VERIFY_MODE ? 'VERIFY (CI)' : 'GENERATE'}`);
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log('═'.repeat(60));

  const pool = new Pool({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Step 1: Get schema structure from Neon
    console.log('\n[1/3] Querying Neon schema...');
    const schemaRows = await getSchemaStructure(pool);
    console.log(`     Found ${schemaRows.length} column definitions`);

    // Normalize schema for hashing (stable structure)
    const schemaData = schemaRows.map(row => ({
      schema: row.table_schema,
      table: row.table_name,
      column: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable,
      constraint: row.constraint_type || null,
    }));

    const schemaHash = generateHash(schemaData);
    console.log(`     Schema hash: ${schemaHash.slice(0, 16)}...`);

    // Step 2: Extract Pipeline Intent Matrix
    console.log('\n[2/3] Extracting Pipeline Intent Matrix...');
    const pipelineIntent = extractPipelineIntentMatrix();
    const pipelineHash = generateHash(pipelineIntent);
    console.log(`     Pipeline intent hash: ${pipelineHash.slice(0, 16)}...`);

    // Step 3: Generate contract hash document
    console.log('\n[3/3] Generating contract hash document...');

    const contractHash = {
      schema_hash: schemaHash,
      pipeline_intent_hash: pipelineHash,
      generated_at: new Date().toISOString().split('T')[0],
      source_of_truth: 'Neon + Doctrine Docs',
      verification_mode: VERIFY_MODE ? 'CI_VERIFY' : 'GENERATE',
      schema_stats: {
        tables: [...new Set(schemaRows.map(r => r.table_name))].length,
        columns: schemaRows.length,
      },
    };

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write contract hash
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(contractHash, null, 2) + '\n');

    console.log('\n' + '═'.repeat(60));
    console.log('CONTRACT HASH GENERATED');
    console.log('═'.repeat(60));
    console.log(`\nSchema Hash:          ${schemaHash}`);
    console.log(`Pipeline Intent Hash: ${pipelineHash}`);
    console.log(`Generated At:         ${contractHash.generated_at}`);
    console.log(`Output:               ${OUTPUT_PATH}`);
    console.log('\n' + '═'.repeat(60));

    if (!VERIFY_MODE) {
      console.log('\nNext step: Commit docs/audit/CONTRACT_HASH.json');
    }

  } catch (err) {
    console.error('\nERROR:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
