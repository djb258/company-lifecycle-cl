// Confidence Envelope Recomputation
// Runs after all passes to update confidence scores

import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

const CONFIG = {
  DRY_RUN: process.argv.includes('--dry-run')
};

async function recomputeConfidence() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('==========================================');
  console.log('CONFIDENCE ENVELOPE RECOMPUTATION');
  console.log('==========================================');
  console.log(`Dry Run: ${CONFIG.DRY_RUN}`);
  console.log('==========================================\n');

  try {
    // Get current stats before
    const beforeStats = await client.query(`
      SELECT confidence_bucket, COUNT(*) as cnt
      FROM cl.identity_confidence
      GROUP BY confidence_bucket
      ORDER BY confidence_bucket
    `);

    console.log('Before:');
    beforeStats.rows.forEach(r => console.log(`  ${r.confidence_bucket}: ${r.cnt}`));

    if (!CONFIG.DRY_RUN) {
      // Recompute all confidence scores
      const updateQuery = `
        WITH scores AS (
          SELECT
            ci.company_unique_id,
            -- Base score from existence
            CASE
              WHEN ci.existence_verified = TRUE THEN 20
              ELSE 0
            END
            -- Existence + name match bonus
            + CASE
              WHEN ci.existence_verified = TRUE AND ci.name_match_score >= 70 THEN 60
              WHEN ci.existence_verified = TRUE AND ci.name_match_score >= 40 THEN 40
              WHEN ci.existence_verified = TRUE THEN 30
              ELSE 0
            END
            -- Canonical name bonus
            + CASE
              WHEN ci.canonical_name IS NOT NULL THEN 5
              ELSE 0
            END
            -- Multiple aliases bonus
            + CASE
              WHEN (SELECT COUNT(*) FROM cl.company_names cn WHERE cn.company_unique_id = ci.company_unique_id) > 1 THEN 5
              ELSE 0
            END
            -- Domain coherence bonus/penalty
            + COALESCE((
              SELECT
                CASE
                  WHEN cd.domain_name_confidence >= 80 THEN 10
                  WHEN cd.domain_name_confidence >= 50 THEN 5
                  WHEN cd.domain_name_confidence < 20 THEN -10
                  ELSE 0
                END
              FROM cl.company_domains cd
              WHERE cd.company_unique_id = ci.company_unique_id
              LIMIT 1
            ), 0)
            -- Collision penalty
            - COALESCE((
              SELECT 20
              FROM cl.cl_errors ce
              WHERE ce.company_unique_id = ci.company_unique_id
                AND ce.pass_name = 'collision'
                AND ce.resolved_at IS NULL
              LIMIT 1
            ), 0)
            -- Firmographic bonus/penalty
            + CASE
              WHEN ci.state_verified IS NOT NULL THEN 5
              ELSE 0
            END
            - COALESCE((
              SELECT 10
              FROM cl.cl_errors ce
              WHERE ce.company_unique_id = ci.company_unique_id
                AND ce.pass_name = 'firmographic'
                AND ce.resolved_at IS NULL
              LIMIT 1
            ), 0)
            AS computed_score
          FROM cl.company_identity ci
        )
        UPDATE cl.identity_confidence ic
        SET
          confidence_score = GREATEST(0, LEAST(100, s.computed_score)),
          confidence_bucket = CASE
            WHEN GREATEST(0, LEAST(100, s.computed_score)) >= 70 THEN 'HIGH'
            WHEN GREATEST(0, LEAST(100, s.computed_score)) >= 40 THEN 'MEDIUM'
            WHEN GREATEST(0, LEAST(100, s.computed_score)) >= 20 THEN 'LOW'
            ELSE 'UNVERIFIED'
          END,
          computed_at = now()
        FROM scores s
        WHERE ic.company_unique_id = s.company_unique_id
      `;

      await client.query(updateQuery);

      // Insert any missing records
      await client.query(`
        INSERT INTO cl.identity_confidence (company_unique_id, confidence_score, confidence_bucket)
        SELECT
          ci.company_unique_id,
          CASE WHEN ci.existence_verified = TRUE THEN 20 ELSE 0 END,
          CASE WHEN ci.existence_verified = TRUE THEN 'LOW' ELSE 'UNVERIFIED' END
        FROM cl.company_identity ci
        WHERE ci.company_unique_id NOT IN (SELECT company_unique_id FROM cl.identity_confidence)
        ON CONFLICT (company_unique_id) DO NOTHING
      `);
    }

    // Get stats after
    const afterStats = await client.query(`
      SELECT confidence_bucket, COUNT(*) as cnt
      FROM cl.identity_confidence
      GROUP BY confidence_bucket
      ORDER BY confidence_bucket
    `);

    console.log('\nAfter:');
    afterStats.rows.forEach(r => console.log(`  ${r.confidence_bucket}: ${r.cnt}`));

    // Summary
    console.log('\n==========================================');
    console.log('RECOMPUTATION COMPLETE');
    console.log('==========================================');

    const total = afterStats.rows.reduce((sum, r) => sum + parseInt(r.cnt), 0);
    const high = afterStats.rows.find(r => r.confidence_bucket === 'HIGH')?.cnt || 0;
    const medium = afterStats.rows.find(r => r.confidence_bucket === 'MEDIUM')?.cnt || 0;
    const low = afterStats.rows.find(r => r.confidence_bucket === 'LOW')?.cnt || 0;
    const unverified = afterStats.rows.find(r => r.confidence_bucket === 'UNVERIFIED')?.cnt || 0;

    console.log(`\nTotal: ${total}`);
    console.log(`HIGH:       ${high} (${((high / total) * 100).toFixed(1)}%)`);
    console.log(`MEDIUM:     ${medium} (${((medium / total) * 100).toFixed(1)}%)`);
    console.log(`LOW:        ${low} (${((low / total) * 100).toFixed(1)}%)`);
    console.log(`UNVERIFIED: ${unverified} (${((unverified / total) * 100).toFixed(1)}%)`);

  } catch (error) {
    console.error('ERROR:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

recomputeConfidence().catch(console.error);
