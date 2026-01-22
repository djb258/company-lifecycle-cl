// Domain Hierarchy Resolution Agent - PHASE 2: APPLY WITH GUARDRAILS
// Barton Doctrine: Delete nothing, eligibility gates only
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

// GUARDRAIL 1: Hotel brand domains - require corporate/legal entity signals
const HOTEL_BRAND_DOMAINS = [
  'http://hilton.com', 'http://marriott.com', 'http://hyatt.com',
  'http://ihg.com', 'http://choicehotels.com', 'http://wyndhamhotels.com',
  'http://bestwestern.com', 'http://radissonhotels.com'
];

// Corporate/legal entity signals for parent scoring
const CORPORATE_SIGNALS = ['inc', 'corp', 'corporation', 'llc', 'ltd', 'international', 'holdings', 'group', 'hq', 'headquarters', 'corporate'];
const PROPERTY_SIGNALS = ['hotel', 'suites', 'inn', 'resort', 'lodge', 'airport', 'downtown', 'north', 'south', 'east', 'west'];

function scoreHotelParent(companyName) {
  const nameLower = companyName.toLowerCase();
  let score = 0;

  // Strong corporate signals
  for (const sig of CORPORATE_SIGNALS) {
    if (nameLower.includes(sig)) score += 20;
  }

  // Penalty for property-specific names
  for (const sig of PROPERTY_SIGNALS) {
    if (nameLower.includes(sig)) score -= 15;
  }

  // Bonus for shorter, cleaner names
  if (companyName.length < 30) score += 5;
  if (companyName.length > 50) score -= 10;

  return score;
}

async function applyPhase2() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('\n' + '='.repeat(80));
    console.log('DOMAIN HIERARCHY RESOLUTION - PHASE 2: APPLY WITH GUARDRAILS');
    console.log('='.repeat(80));

    // =========================================================================
    // ENSURE SCHEMA EXISTS FIRST
    // =========================================================================
    console.log('\n[SETUP] Ensuring schema columns exist...');

    await client.query(`
      ALTER TABLE cl.company_identity
      ADD COLUMN IF NOT EXISTS eligibility_status TEXT;
    `);
    await client.query(`
      ALTER TABLE cl.company_identity
      ADD COLUMN IF NOT EXISTS exclusion_reason TEXT;
    `);
    await client.query(`
      ALTER TABLE cl.company_identity
      ADD COLUMN IF NOT EXISTS entity_role TEXT;
    `);

    await client.query(`
      CREATE SCHEMA IF NOT EXISTS shq;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS shq.audit_log (
        audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action_type TEXT NOT NULL,
        action_details JSONB,
        before_counts JSONB,
        after_counts JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        created_by TEXT DEFAULT 'domain_hierarchy_resolver'
      );
    `);

    console.log('  Schema ready.');

    // =========================================================================
    // BEFORE COUNTS
    // =========================================================================
    const beforeCounts = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE eligibility_status IS NULL) as no_status,
        COUNT(*) FILTER (WHERE eligibility_status = 'ELIGIBLE') as eligible,
        COUNT(*) FILTER (WHERE eligibility_status = 'EXCLUDED_POLICY') as excluded,
        COUNT(*) FILTER (WHERE eligibility_status = 'BLOCKED_NO_DOMAIN') as blocked_no_domain,
        COUNT(*) FILTER (WHERE eligibility_status = 'RESTRICTED_NONPROFIT') as restricted_nonprofit,
        COUNT(*) FILTER (WHERE eligibility_status = 'ROLE_UNCERTAIN') as uncertain
      FROM cl.company_identity
    `);

    console.log('\n[BEFORE] Company eligibility status:');
    console.table(beforeCounts.rows);

    let totalUpdated = 0;
    const uncertainDomains = [];

    // =========================================================================
    // ACTION 1: Mark .edu/.gov/.mil as EXCLUDED_POLICY
    // =========================================================================
    console.log('\n' + '-'.repeat(80));
    console.log('[ACTION 1] Marking .edu/.gov/.mil as EXCLUDED_POLICY');
    console.log('-'.repeat(80));

    const excludeResult = await client.query(`
      UPDATE cl.company_identity
      SET eligibility_status = 'EXCLUDED_POLICY',
          exclusion_reason = 'NON_COMMERCIAL_ENTITY',
          entity_role = 'EXCLUDED'
      WHERE (company_domain ILIKE '%.edu' OR company_domain ILIKE '%.edu/%'
          OR company_domain ILIKE '%.gov' OR company_domain ILIKE '%.gov/%'
          OR company_domain ILIKE '%.mil' OR company_domain ILIKE '%.mil/%')
        AND (eligibility_status IS NULL OR eligibility_status != 'EXCLUDED_POLICY')
      RETURNING company_unique_id
    `);
    console.log(`  Updated: ${excludeResult.rowCount} records`);
    totalUpdated += excludeResult.rowCount;

    // =========================================================================
    // ACTION 2: GUARDRAIL - NO_DOMAIN → BLOCKED_NO_DOMAIN
    // =========================================================================
    console.log('\n' + '-'.repeat(80));
    console.log('[ACTION 2] GUARDRAIL: Blocking records with no domain');
    console.log('-'.repeat(80));

    const noDomainResult = await client.query(`
      UPDATE cl.company_identity
      SET eligibility_status = 'BLOCKED_NO_DOMAIN',
          exclusion_reason = 'MISSING_DOMAIN',
          entity_role = 'BLOCKED'
      WHERE (company_domain IS NULL OR company_domain = '')
        AND (eligibility_status IS NULL OR eligibility_status NOT IN ('EXCLUDED_POLICY', 'BLOCKED_NO_DOMAIN'))
      RETURNING company_unique_id
    `);
    console.log(`  Updated: ${noDomainResult.rowCount} records`);
    totalUpdated += noDomainResult.rowCount;

    // =========================================================================
    // ACTION 3: GUARDRAIL - Nonprofits (.org) → RESTRICTED_NONPROFIT
    // =========================================================================
    console.log('\n' + '-'.repeat(80));
    console.log('[ACTION 3] GUARDRAIL: Restricting nonprofits (.org)');
    console.log('-'.repeat(80));

    const nonprofitResult = await client.query(`
      UPDATE cl.company_identity
      SET eligibility_status = 'RESTRICTED_NONPROFIT',
          exclusion_reason = 'NONPROFIT_PENDING_ALLOWLIST',
          entity_role = 'RESTRICTED'
      WHERE company_domain ILIKE '%.org' OR company_domain ILIKE '%.org/%'
        AND NOT (company_domain ILIKE '%.edu' OR company_domain ILIKE '%.gov' OR company_domain ILIKE '%.mil')
        AND (eligibility_status IS NULL OR eligibility_status NOT IN ('EXCLUDED_POLICY', 'BLOCKED_NO_DOMAIN'))
      RETURNING company_unique_id
    `);
    console.log(`  Updated: ${nonprofitResult.rowCount} records`);
    totalUpdated += nonprofitResult.rowCount;

    // =========================================================================
    // ACTION 4: GUARDRAIL - Hotel brands with corporate/legal entity bias
    // =========================================================================
    console.log('\n' + '-'.repeat(80));
    console.log('[ACTION 4] GUARDRAIL: Hotel brands - corporate entity scoring');
    console.log('-'.repeat(80));

    for (const domain of HOTEL_BRAND_DOMAINS) {
      const companies = await client.query(`
        SELECT company_unique_id, company_name
        FROM cl.company_identity
        WHERE company_domain = $1
        ORDER BY company_name
      `, [domain]);

      if (companies.rows.length === 0) continue;

      // Score with corporate bias
      const scored = companies.rows.map(c => ({
        ...c,
        score: scoreHotelParent(c.company_name)
      })).sort((a, b) => b.score - a.score);

      const topScorer = scored[0];
      const isConfident = topScorer.score >= 15; // Require strong corporate signals

      console.log(`\n  ${domain}: ${companies.rows.length} companies`);
      console.log(`    Top scorer: "${topScorer.company_name}" (score: ${topScorer.score})`);

      if (isConfident) {
        // Mark parent
        await client.query(`
          UPDATE cl.company_identity
          SET entity_role = 'PARENT_ANCHOR', eligibility_status = 'ELIGIBLE'
          WHERE company_unique_id = $1
        `, [topScorer.company_unique_id]);

        // Mark children
        const childIds = scored.slice(1).map(c => c.company_unique_id);
        if (childIds.length > 0) {
          await client.query(`
            UPDATE cl.company_identity
            SET entity_role = 'CHILD_OPERATING_UNIT', eligibility_status = 'ELIGIBLE'
            WHERE company_unique_id = ANY($1)
          `, [childIds]);
        }
        console.log(`    → PARENT_ANCHOR: "${topScorer.company_name}"`);
        console.log(`    → CHILD_OPERATING_UNIT: ${childIds.length} properties`);
        totalUpdated += companies.rows.length;
      } else {
        // ROLE_UNCERTAIN - block the entire domain
        const allIds = companies.rows.map(c => c.company_unique_id);
        await client.query(`
          UPDATE cl.company_identity
          SET entity_role = 'ROLE_UNCERTAIN', eligibility_status = 'ROLE_UNCERTAIN'
          WHERE company_unique_id = ANY($1)
        `, [allIds]);
        uncertainDomains.push({ domain, count: allIds.length, top_score: topScorer.score });
        console.log(`    → ROLE_UNCERTAIN: Entire domain blocked (insufficient corporate signals)`);
        totalUpdated += allIds.length;
      }
    }

    // =========================================================================
    // ACTION 5: Process remaining commercial clusters
    // =========================================================================
    console.log('\n' + '-'.repeat(80));
    console.log('[ACTION 5] Processing remaining commercial clusters');
    console.log('-'.repeat(80));

    const remainingClusters = await client.query(`
      SELECT company_domain, COUNT(*) as cnt
      FROM cl.company_identity
      WHERE company_domain IS NOT NULL
        AND company_domain != ''
        AND eligibility_status IS NULL
        AND NOT (company_domain ILIKE '%.edu' OR company_domain ILIKE '%.gov' OR company_domain ILIKE '%.mil' OR company_domain ILIKE '%.org')
      GROUP BY company_domain
      HAVING COUNT(*) > 1
    `);

    let clustersProcessed = 0;
    for (const cluster of remainingClusters.rows) {
      const domain = cluster.company_domain;

      // Get companies, pick shortest name as parent (simple heuristic)
      const companies = await client.query(`
        SELECT company_unique_id, company_name
        FROM cl.company_identity
        WHERE company_domain = $1 AND eligibility_status IS NULL
        ORDER BY LENGTH(company_name) ASC, created_at ASC
      `, [domain]);

      if (companies.rows.length > 1) {
        const parentId = companies.rows[0].company_unique_id;
        const childIds = companies.rows.slice(1).map(c => c.company_unique_id);

        await client.query(`
          UPDATE cl.company_identity
          SET entity_role = 'PARENT_ANCHOR', eligibility_status = 'ELIGIBLE'
          WHERE company_unique_id = $1
        `, [parentId]);

        await client.query(`
          UPDATE cl.company_identity
          SET entity_role = 'CHILD_OPERATING_UNIT', eligibility_status = 'ELIGIBLE'
          WHERE company_unique_id = ANY($1)
        `, [childIds]);

        clustersProcessed++;
        totalUpdated += companies.rows.length;
      }
    }
    console.log(`  Processed ${clustersProcessed} clusters`);

    // =========================================================================
    // ACTION 6: Mark remaining singletons as PARENT_ANCHOR + ELIGIBLE
    // =========================================================================
    console.log('\n' + '-'.repeat(80));
    console.log('[ACTION 6] Marking singleton domains as PARENT_ANCHOR');
    console.log('-'.repeat(80));

    const singletonResult = await client.query(`
      UPDATE cl.company_identity
      SET entity_role = 'PARENT_ANCHOR', eligibility_status = 'ELIGIBLE'
      WHERE eligibility_status IS NULL
        AND company_domain IS NOT NULL
        AND company_domain != ''
      RETURNING company_unique_id
    `);
    console.log(`  Updated: ${singletonResult.rowCount} records`);
    totalUpdated += singletonResult.rowCount;

    // =========================================================================
    // ACTION 7: Resolve COLLISION_DOMAIN errors as EXPECTED_HIERARCHY
    // =========================================================================
    console.log('\n' + '-'.repeat(80));
    console.log('[ACTION 7] Resolving COLLISION_DOMAIN errors');
    console.log('-'.repeat(80));

    const resolveErrors = await client.query(`
      UPDATE cl.cl_errors
      SET resolved_at = NOW()
      WHERE failure_reason_code = 'COLLISION_DOMAIN'
        AND resolved_at IS NULL
      RETURNING error_id
    `);
    console.log(`  Resolved: ${resolveErrors.rowCount} collision errors as EXPECTED_HIERARCHY`);

    // =========================================================================
    // AFTER COUNTS
    // =========================================================================
    const afterCounts = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE eligibility_status IS NULL) as no_status,
        COUNT(*) FILTER (WHERE eligibility_status = 'ELIGIBLE') as eligible,
        COUNT(*) FILTER (WHERE eligibility_status = 'EXCLUDED_POLICY') as excluded,
        COUNT(*) FILTER (WHERE eligibility_status = 'BLOCKED_NO_DOMAIN') as blocked_no_domain,
        COUNT(*) FILTER (WHERE eligibility_status = 'RESTRICTED_NONPROFIT') as restricted_nonprofit,
        COUNT(*) FILTER (WHERE eligibility_status = 'ROLE_UNCERTAIN') as uncertain
      FROM cl.company_identity
    `);

    console.log('\n[AFTER] Company eligibility status:');
    console.table(afterCounts.rows);

    const roleCounts = await client.query(`
      SELECT entity_role, COUNT(*) as count
      FROM cl.company_identity
      WHERE entity_role IS NOT NULL
      GROUP BY entity_role
      ORDER BY count DESC
    `);
    console.log('\n[AFTER] Entity roles:');
    console.table(roleCounts.rows);

    // =========================================================================
    // AUDIT LOG
    // =========================================================================
    console.log('\n' + '-'.repeat(80));
    console.log('[AUDIT] Logging to shq.audit_log');
    console.log('-'.repeat(80));

    await client.query(`
      INSERT INTO shq.audit_log (action_type, action_details, before_counts, after_counts)
      VALUES (
        'DOMAIN_HIERARCHY_RESOLUTION',
        $1::jsonb,
        $2::jsonb,
        $3::jsonb
      )
    `, [
      JSON.stringify({
        total_updated: totalUpdated,
        collision_errors_resolved: resolveErrors.rowCount,
        uncertain_domains: uncertainDomains,
        guardrails_applied: ['HOTEL_BRAND_CORPORATE_BIAS', 'NO_DOMAIN_BLOCK', 'NONPROFIT_RESTRICT']
      }),
      JSON.stringify(beforeCounts.rows[0]),
      JSON.stringify(afterCounts.rows[0])
    ]);
    console.log('  Audit log entry created');

    // Log uncertain domains separately
    if (uncertainDomains.length > 0) {
      await client.query(`
        INSERT INTO shq.audit_log (action_type, action_details)
        VALUES ('ROLE_UNCERTAIN_DOMAINS', $1::jsonb)
      `, [JSON.stringify({ domains: uncertainDomains })]);
      console.log(`  Uncertain domains logged: ${uncertainDomains.length}`);
    }

    // =========================================================================
    // ERROR TABLE STATUS
    // =========================================================================
    const errorStatus = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved,
        COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved
      FROM cl.cl_errors
    `);
    console.log('\n[ERRORS] cl.cl_errors status:');
    console.table(errorStatus.rows);

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 2 COMPLETE - SUMMARY');
    console.log('='.repeat(80));

    console.log(`
┌─────────────────────────────────────────┬────────────┐
│ ACTION                                  │ COUNT      │
├─────────────────────────────────────────┼────────────┤
│ EXCLUDED_POLICY (.edu/.gov/.mil)        │ ${excludeResult.rowCount.toString().padStart(10)} │
│ BLOCKED_NO_DOMAIN                       │ ${noDomainResult.rowCount.toString().padStart(10)} │
│ RESTRICTED_NONPROFIT                    │ ${nonprofitResult.rowCount.toString().padStart(10)} │
│ ELIGIBLE (parents + children)           │ ${(singletonResult.rowCount + clustersProcessed * 2).toString().padStart(10)} │
│ ROLE_UNCERTAIN (hotel brands)           │ ${uncertainDomains.reduce((s, d) => s + d.count, 0).toString().padStart(10)} │
├─────────────────────────────────────────┼────────────┤
│ Collision errors resolved               │ ${resolveErrors.rowCount.toString().padStart(10)} │
│ Records DELETED                         │ ${(0).toString().padStart(10)} │
└─────────────────────────────────────────┴────────────┘
    `);

    if (uncertainDomains.length > 0) {
      console.log('\n[KILL SWITCH] Domains blocked due to uncertainty:');
      console.table(uncertainDomains);
    }

    console.log('\nPhase 2 complete. All guardrails applied. No deletions performed.');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

applyPhase2();
