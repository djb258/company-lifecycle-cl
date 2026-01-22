// ============================================================================
// COLLISION DETECTION V2 - CORRECT DOCTRINE
// ============================================================================
// Doctrine: Errors = unexpected, actionable failures
//           Hierarchy = structure (different bucket)
//
// Domain sharing is EXPECTED when parent/child relationships exist.
// Only emit ERRORS when:
//   1. No parent can be determined, AND
//   2. Outreach would be ambiguous (multiple valid targets)
// ============================================================================
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

// Corporate signals for parent detection
const CORPORATE_SIGNALS = ['inc', 'corp', 'corporation', 'llc', 'ltd', 'international', 'holdings', 'group', 'hq', 'headquarters', 'corporate'];
const CHILD_SIGNALS = ['branch', 'location', 'office', 'chapter', 'division', 'department', 'center', 'club', 'local', 'regional', 'hotel', 'suites', 'inn', 'resort'];

function scoreParentConfidence(companyName) {
  const nameLower = companyName.toLowerCase();
  let score = 50;
  for (const sig of CORPORATE_SIGNALS) {
    if (nameLower.includes(sig)) score += 15;
  }
  for (const sig of CHILD_SIGNALS) {
    if (nameLower.includes(sig)) score -= 15;
  }
  if (companyName.length < 25) score += 10;
  if (companyName.length > 50) score -= 10;
  return Math.max(0, Math.min(100, score));
}

async function detectCollisions() {
  const client = new Client({ connectionString });
  await client.connect();
  const runId = 'COLLISION-V2-' + Date.now();

  console.log('='.repeat(70));
  console.log('COLLISION DETECTION V2 - CORRECT DOCTRINE');
  console.log('='.repeat(70));
  console.log('Run ID:', runId);
  console.log('Doctrine: Hierarchy = structure, Errors = ambiguous only');

  try {
    // Ensure hierarchy table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS cl.domain_hierarchy (
        hierarchy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain TEXT NOT NULL,
        parent_company_id UUID,
        child_company_id UUID,
        relationship_type TEXT NOT NULL,
        confidence_score INT,
        resolution_method TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(domain, child_company_id)
      )
    `);

    // Get domains with multiple companies
    const clusters = await client.query(`
      SELECT company_domain, COUNT(*) as cnt
      FROM cl.company_identity
      WHERE company_domain IS NOT NULL
        AND company_domain != ''
        AND (eligibility_status IS NULL OR eligibility_status NOT IN ('EXCLUDED_POLICY', 'BLOCKED_NO_DOMAIN'))
      GROUP BY company_domain
      HAVING COUNT(*) > 1
    `);

    console.log('\nFound', clusters.rows.length, 'domains with multiple companies');

    const metrics = { hierarchyRecorded: 0, parentsIdentified: 0, childrenIdentified: 0, ambiguousErrors: 0 };

    for (const cluster of clusters.rows) {
      const domain = cluster.company_domain;
      const companies = await client.query(`
        SELECT company_unique_id, company_name, entity_role, created_at
        FROM cl.company_identity
        WHERE company_domain = $1
        ORDER BY created_at ASC
      `, [domain]);

      // If roles already assigned, record hierarchy
      const parent = companies.rows.find(c => c.entity_role === 'PARENT_ANCHOR');
      const children = companies.rows.filter(c => c.entity_role === 'CHILD_OPERATING_UNIT');

      if (parent && children.length > 0) {
        for (const child of children) {
          await client.query(`
            INSERT INTO cl.domain_hierarchy (domain, parent_company_id, child_company_id, relationship_type, confidence_score, resolution_method)
            VALUES ($1, $2, $3, 'CHILD_OPERATING_UNIT', 80, 'ENTITY_ROLE_PRESET')
            ON CONFLICT (domain, child_company_id) DO NOTHING
          `, [domain, parent.company_unique_id, child.company_unique_id]);
          metrics.hierarchyRecorded++;
          metrics.childrenIdentified++;
        }
        metrics.parentsIdentified++;
        continue;
      }

      // Score and determine hierarchy
      const scored = companies.rows.map(c => ({ ...c, score: scoreParentConfidence(c.company_name) })).sort((a, b) => b.score - a.score);
      const topScorer = scored[0];
      const isConfident = topScorer.score >= 60;

      if (isConfident) {
        for (const child of scored.slice(1)) {
          await client.query(`
            INSERT INTO cl.domain_hierarchy (domain, parent_company_id, child_company_id, relationship_type, confidence_score, resolution_method)
            VALUES ($1, $2, $3, 'CHILD_OPERATING_UNIT', $4, 'CORPORATE_SIGNAL_SCORING')
            ON CONFLICT (domain, child_company_id) DO NOTHING
          `, [domain, topScorer.company_unique_id, child.company_unique_id, topScorer.score]);
          metrics.hierarchyRecorded++;
          metrics.childrenIdentified++;
        }
        metrics.parentsIdentified++;
      } else {
        // AMBIGUOUS - log actual ERROR (this is the only case we log to cl_errors)
        for (const company of scored) {
          await client.query(`
            INSERT INTO cl.domain_hierarchy (domain, parent_company_id, child_company_id, relationship_type, confidence_score, resolution_method)
            VALUES ($1, NULL, $2, 'AMBIGUOUS_UNRESOLVED', $3, 'LOW_CONFIDENCE')
            ON CONFLICT (domain, child_company_id) DO NOTHING
          `, [domain, company.company_unique_id, company.score]);
        }
        await client.query(`
          INSERT INTO cl.cl_errors (company_unique_id, lifecycle_run_id, pass_name, failure_reason_code, inputs_snapshot)
          VALUES ($1, $2, 'collision', 'COLLISION_AMBIGUOUS', $3)
          ON CONFLICT (company_unique_id, pass_name, failure_reason_code) DO NOTHING
        `, [topScorer.company_unique_id, runId, JSON.stringify({
          domain, issue: 'No clear parent', candidates: scored.map(c => ({ name: c.company_name, score: c.score }))
        })]);
        metrics.ambiguousErrors++;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('COMPLETE');
    console.log('Hierarchy recorded:', metrics.hierarchyRecorded);
    console.log('Parents identified:', metrics.parentsIdentified);
    console.log('Children identified:', metrics.childrenIdentified);
    console.log('Ambiguous ERRORS:', metrics.ambiguousErrors);

    const stats = await client.query(`SELECT relationship_type, COUNT(*) as count FROM cl.domain_hierarchy GROUP BY relationship_type`);
    console.log('\nHierarchy table:');
    console.table(stats.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

detectCollisions().catch(console.error);
