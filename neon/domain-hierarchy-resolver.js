// Domain Hierarchy Resolution Agent - PHASE 1: ANALYSIS ONLY
// Barton Doctrine: NO WRITES, NO DELETES until explicitly authorized
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

// Scoring keywords for PARENT_ANCHOR detection
const PARENT_KEYWORDS = ['corporate', 'headquarters', 'hq', 'international', 'inc', 'corp', 'global', 'worldwide', 'main', 'central'];
const CHILD_KEYWORDS = ['branch', 'location', 'office', 'chapter', 'division', 'department', 'center', 'club', 'association', 'local', 'regional'];

function scoreParentAnchor(companyName) {
  const nameLower = companyName.toLowerCase();
  let score = 0;

  // Bonus for parent keywords
  for (const kw of PARENT_KEYWORDS) {
    if (nameLower.includes(kw)) score += 10;
  }

  // Penalty for child keywords
  for (const kw of CHILD_KEYWORDS) {
    if (nameLower.includes(kw)) score -= 10;
  }

  // Shorter names tend to be parent entities
  if (companyName.length < 20) score += 5;
  if (companyName.length < 15) score += 5;
  if (companyName.length > 40) score -= 5;
  if (companyName.length > 60) score -= 10;

  // Penalty for geo-specific names (city, state references)
  const geoPatterns = /\b(north|south|east|west|downtown|airport|county|district|chapter)\b/i;
  if (geoPatterns.test(nameLower)) score -= 10;

  return score;
}

function classifyRecord(domain, companyName, clusterSize, isTopScorer) {
  const domainLower = domain?.toLowerCase() || '';

  // Global exclusion policy: .edu, .gov, .mil
  if (domainLower.endsWith('.edu') || domainLower.includes('.edu/') ||
      domainLower.endsWith('.gov') || domainLower.includes('.gov/') ||
      domainLower.endsWith('.mil') || domainLower.includes('.mil/')) {
    return 'EXCLUDED_POLICY';
  }

  // Single company on domain - it's the anchor by default
  if (clusterSize === 1) {
    return 'PARENT_ANCHOR';
  }

  // In a cluster, top scorer is PARENT_ANCHOR
  if (isTopScorer) {
    return 'PARENT_ANCHOR';
  }

  // Score the name
  const score = scoreParentAnchor(companyName);
  if (score >= 10) return 'PARENT_ANCHOR';
  if (score <= -10) return 'CHILD_OPERATING_UNIT';

  return 'CHILD_OPERATING_UNIT'; // Default children in clusters
}

async function analyzePhase1() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('\n' + '='.repeat(80));
    console.log('DOMAIN HIERARCHY RESOLUTION AGENT - PHASE 1: ANALYSIS ONLY');
    console.log('Barton Doctrine Active: NO WRITES, NO DELETES');
    console.log('='.repeat(80));

    const results = {
      EXCLUDED_POLICY: [],
      PARENT_ANCHOR: [],
      CHILD_OPERATING_UNIT: [],
      ROLE_UNCERTAIN: []
    };

    // =========================================================================
    // STEP 1: Total universe scan
    // =========================================================================
    const totalCount = await client.query(`SELECT COUNT(*) as cnt FROM cl.company_identity`);
    console.log(`\n[SCAN] Total company_identity records: ${parseInt(totalCount.rows[0].cnt).toLocaleString()}`);

    // =========================================================================
    // STEP 2: Global exclusion policy (.edu, .gov, .mil)
    // =========================================================================
    console.log('\n' + '-'.repeat(80));
    console.log('[STEP 2] GLOBAL EXCLUSION POLICY - Non-commercial TLDs');
    console.log('-'.repeat(80));

    const excludedTLDs = await client.query(`
      SELECT
        CASE
          WHEN company_domain ILIKE '%.edu' OR company_domain ILIKE '%.edu/%' THEN '.edu'
          WHEN company_domain ILIKE '%.gov' OR company_domain ILIKE '%.gov/%' THEN '.gov'
          WHEN company_domain ILIKE '%.mil' OR company_domain ILIKE '%.mil/%' THEN '.mil'
        END as tld,
        COUNT(*) as count
      FROM cl.company_identity
      WHERE company_domain ILIKE '%.edu' OR company_domain ILIKE '%.edu/%'
         OR company_domain ILIKE '%.gov' OR company_domain ILIKE '%.gov/%'
         OR company_domain ILIKE '%.mil' OR company_domain ILIKE '%.mil/%'
      GROUP BY 1
      ORDER BY count DESC
    `);
    console.log('\nRecords by excluded TLD:');
    console.table(excludedTLDs.rows);

    const totalExcluded = excludedTLDs.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
    console.log(`Total EXCLUDED_POLICY candidates: ${totalExcluded.toLocaleString()}`);

    // Sample excluded records
    const excludedSample = await client.query(`
      SELECT company_name, company_domain
      FROM cl.company_identity
      WHERE company_domain ILIKE '%.edu' OR company_domain ILIKE '%.gov' OR company_domain ILIKE '%.mil'
      LIMIT 10
    `);
    console.log('\nSample excluded records:');
    console.table(excludedSample.rows);

    // =========================================================================
    // STEP 3: Identify shared-domain clusters (commercial/nonprofit)
    // =========================================================================
    console.log('\n' + '-'.repeat(80));
    console.log('[STEP 3] SHARED-DOMAIN CLUSTERS - Commercial/Nonprofit');
    console.log('-'.repeat(80));

    const clusters = await client.query(`
      SELECT company_domain, COUNT(*) as cluster_size
      FROM cl.company_identity
      WHERE company_domain IS NOT NULL
        AND company_domain != ''
        AND NOT (company_domain ILIKE '%.edu' OR company_domain ILIKE '%.edu/%')
        AND NOT (company_domain ILIKE '%.gov' OR company_domain ILIKE '%.gov/%')
        AND NOT (company_domain ILIKE '%.mil' OR company_domain ILIKE '%.mil/%')
      GROUP BY company_domain
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `);

    console.log(`\nFound ${clusters.rows.length} commercial/nonprofit domains with multiple companies`);

    const clusterStats = {
      size2: clusters.rows.filter(r => parseInt(r.cluster_size) === 2).length,
      size3to5: clusters.rows.filter(r => parseInt(r.cluster_size) >= 3 && parseInt(r.cluster_size) <= 5).length,
      size6to10: clusters.rows.filter(r => parseInt(r.cluster_size) >= 6 && parseInt(r.cluster_size) <= 10).length,
      size11plus: clusters.rows.filter(r => parseInt(r.cluster_size) > 10).length,
    };
    console.log('\nCluster size distribution:');
    console.table([clusterStats]);

    // =========================================================================
    // STEP 4: Score and classify each cluster
    // =========================================================================
    console.log('\n' + '-'.repeat(80));
    console.log('[STEP 4] SCORING CLUSTERS - Identifying PARENT_ANCHOR vs CHILD');
    console.log('-'.repeat(80));

    let parentAnchors = 0;
    let childUnits = 0;
    let uncertain = 0;
    const clusterAnalysis = [];

    // Process top 50 clusters for detailed analysis
    const topClusters = clusters.rows.slice(0, 50);

    for (const cluster of topClusters) {
      const domain = cluster.company_domain;
      const companies = await client.query(`
        SELECT company_unique_id, company_name
        FROM cl.company_identity
        WHERE company_domain = $1
        ORDER BY company_name
      `, [domain]);

      // Score all companies in cluster
      const scored = companies.rows.map(c => ({
        ...c,
        score: scoreParentAnchor(c.company_name)
      })).sort((a, b) => b.score - a.score);

      const topScorer = scored[0];
      const children = scored.slice(1);

      clusterAnalysis.push({
        domain: domain.substring(0, 40),
        cluster_size: parseInt(cluster.cluster_size),
        parent_anchor: topScorer.company_name.substring(0, 35),
        parent_score: topScorer.score,
        children_count: children.length
      });

      parentAnchors += 1;
      childUnits += children.length;
    }

    console.log('\nTop 50 clusters - PARENT_ANCHOR identification:');
    console.table(clusterAnalysis.slice(0, 25));

    // =========================================================================
    // STEP 5: Calculate totals across ALL clusters
    // =========================================================================
    console.log('\n' + '-'.repeat(80));
    console.log('[STEP 5] FULL UNIVERSE CLASSIFICATION');
    console.log('-'.repeat(80));

    // Count all children in all commercial clusters
    const allClusterChildren = await client.query(`
      WITH cluster_domains AS (
        SELECT company_domain, COUNT(*) as cnt
        FROM cl.company_identity
        WHERE company_domain IS NOT NULL
          AND company_domain != ''
          AND NOT (company_domain ILIKE '%.edu' OR company_domain ILIKE '%.edu/%')
          AND NOT (company_domain ILIKE '%.gov' OR company_domain ILIKE '%.gov/%')
          AND NOT (company_domain ILIKE '%.mil' OR company_domain ILIKE '%.mil/%')
        GROUP BY company_domain
        HAVING COUNT(*) > 1
      )
      SELECT
        COUNT(DISTINCT cd.company_domain) as cluster_count,
        SUM(cd.cnt) as total_in_clusters,
        SUM(cd.cnt) - COUNT(DISTINCT cd.company_domain) as potential_children
      FROM cluster_domains cd
    `);

    const clusterData = allClusterChildren.rows[0];

    // Count singleton domains (no collision = PARENT_ANCHOR)
    const singletons = await client.query(`
      SELECT COUNT(*) as cnt
      FROM cl.company_identity
      WHERE company_domain IS NOT NULL
        AND company_domain != ''
        AND NOT (company_domain ILIKE '%.edu' OR company_domain ILIKE '%.edu/%')
        AND NOT (company_domain ILIKE '%.gov' OR company_domain ILIKE '%.gov/%')
        AND NOT (company_domain ILIKE '%.mil' OR company_domain ILIKE '%.mil/%')
        AND company_domain IN (
          SELECT company_domain FROM cl.company_identity
          WHERE company_domain IS NOT NULL AND company_domain != ''
          GROUP BY company_domain HAVING COUNT(*) = 1
        )
    `);

    // Count records with no domain
    const noDomain = await client.query(`
      SELECT COUNT(*) as cnt FROM cl.company_identity
      WHERE company_domain IS NULL OR company_domain = ''
    `);

    // =========================================================================
    // FINAL SUMMARY
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 1 ANALYSIS COMPLETE - SUMMARY');
    console.log('='.repeat(80));

    const summary = {
      total_records: parseInt(totalCount.rows[0].cnt),
      excluded_policy_edu_gov_mil: totalExcluded,
      commercial_clusters: parseInt(clusterData.cluster_count),
      parent_anchors_in_clusters: parseInt(clusterData.cluster_count),
      child_operating_units: parseInt(clusterData.potential_children),
      singleton_domains_parent: parseInt(singletons.rows[0].cnt),
      no_domain_records: parseInt(noDomain.rows[0].cnt),
    };

    summary.total_parent_anchors = summary.parent_anchors_in_clusters + summary.singleton_domains_parent;
    summary.estimated_deletions = 0; // We don't delete, we exclude
    summary.estimated_exclusions = summary.excluded_policy_edu_gov_mil;
    summary.estimated_retained = summary.total_records - summary.excluded_policy_edu_gov_mil;

    console.log('\n┌─────────────────────────────────────────┬────────────┐');
    console.log('│ CLASSIFICATION                          │ COUNT      │');
    console.log('├─────────────────────────────────────────┼────────────┤');
    console.log(`│ Total Records                           │ ${summary.total_records.toLocaleString().padStart(10)} │`);
    console.log('├─────────────────────────────────────────┼────────────┤');
    console.log(`│ EXCLUDED_POLICY (.edu/.gov/.mil)        │ ${summary.excluded_policy_edu_gov_mil.toLocaleString().padStart(10)} │`);
    console.log(`│ PARENT_ANCHOR (cluster winners)         │ ${summary.parent_anchors_in_clusters.toLocaleString().padStart(10)} │`);
    console.log(`│ PARENT_ANCHOR (singleton domains)       │ ${summary.singleton_domains_parent.toLocaleString().padStart(10)} │`);
    console.log(`│ CHILD_OPERATING_UNIT                    │ ${summary.child_operating_units.toLocaleString().padStart(10)} │`);
    console.log(`│ NO_DOMAIN (unclassified)                │ ${summary.no_domain_records.toLocaleString().padStart(10)} │`);
    console.log('├─────────────────────────────────────────┼────────────┤');
    console.log(`│ TOTAL PARENT_ANCHORS                    │ ${summary.total_parent_anchors.toLocaleString().padStart(10)} │`);
    console.log('└─────────────────────────────────────────┴────────────┘');

    console.log('\n┌─────────────────────────────────────────┬────────────┐');
    console.log('│ PROJECTED ACTIONS                       │ COUNT      │');
    console.log('├─────────────────────────────────────────┼────────────┤');
    console.log(`│ Mark EXCLUDED_POLICY (no outreach)      │ ${summary.estimated_exclusions.toLocaleString().padStart(10)} │`);
    console.log(`│ Retain as PARENT_ANCHOR                 │ ${summary.total_parent_anchors.toLocaleString().padStart(10)} │`);
    console.log(`│ Downgrade CHILD_OPERATING_UNIT          │ ${summary.child_operating_units.toLocaleString().padStart(10)} │`);
    console.log(`│ DELETE (none without explicit approval) │ ${summary.estimated_deletions.toLocaleString().padStart(10)} │`);
    console.log('└─────────────────────────────────────────┴────────────┘');

    // =========================================================================
    // DOMAINS WITH ROLE_UNCERTAIN (manual review needed)
    // =========================================================================
    console.log('\n' + '-'.repeat(80));
    console.log('[REVIEW] Domains requiring manual review (top scorer has low confidence):');
    console.log('-'.repeat(80));

    const uncertainDomains = clusterAnalysis.filter(c => c.parent_score < 5 && c.parent_score > -5);
    if (uncertainDomains.length > 0) {
      console.table(uncertainDomains.slice(0, 15));
    } else {
      console.log('No uncertain domains in top 50 clusters.');
    }

    // =========================================================================
    // COLLISION ERRORS IMPACT
    // =========================================================================
    console.log('\n' + '-'.repeat(80));
    console.log('[IMPACT] Effect on COLLISION_DOMAIN errors:');
    console.log('-'.repeat(80));

    const collisionErrors = await client.query(`
      SELECT COUNT(*) as cnt FROM cl.cl_errors
      WHERE failure_reason_code = 'COLLISION_DOMAIN' AND resolved_at IS NULL
    `);
    console.log(`Current unresolved COLLISION_DOMAIN errors: ${parseInt(collisionErrors.rows[0].cnt).toLocaleString()}`);
    console.log(`These would be resolved as EXPECTED_HIERARCHY (not errors)`);

    console.log('\n' + '='.repeat(80));
    console.log('PHASE 1 COMPLETE - AWAITING REVIEW BEFORE PHASE 2');
    console.log('='.repeat(80));
    console.log('\nNO MUTATIONS PERFORMED. Review above analysis.');
    console.log('To proceed to Phase 2, run with --apply flag after review.\n');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

analyzePhase1();
