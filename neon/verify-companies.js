// CL Company Verification Script - PHASE 1 (READ-ONLY)
// Run with: node neon/verify-companies.js
// Purpose: Verify existing company records before any backfill

import pg from 'pg';

const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function runVerification() {
  const client = new Client({ connectionString });
  const report = {
    timestamp: new Date().toISOString(),
    phase: 'PHASE 1 - VERIFICATION (READ-ONLY)',
    inventory: {},
    nullReadiness: {},
    collisionChecks: {},
    idIntegrity: {},
    gateStatus: 'PENDING',
    risks: []
  };

  try {
    await client.connect();
    console.log('========================================');
    console.log('CL COMPANY VERIFICATION REPORT');
    console.log('Phase 1 - READ-ONLY DIAGNOSTICS');
    console.log('========================================\n');

    // 1. INVENTORY
    console.log('1. INVENTORY');
    console.log('------------');

    const totalCount = await client.query(`
      SELECT COUNT(*) as total FROM cl.company_identity
    `);
    report.inventory.totalCompanies = parseInt(totalCount.rows[0].total);
    console.log(`Total companies: ${report.inventory.totalCompanies}`);

    const domainCount = await client.query(`
      SELECT COUNT(DISTINCT company_domain) as count
      FROM cl.company_identity
      WHERE company_domain IS NOT NULL
    `);
    report.inventory.distinctDomains = parseInt(domainCount.rows[0].count);
    console.log(`Distinct domains: ${report.inventory.distinctDomains}`);

    const linkedinCount = await client.query(`
      SELECT COUNT(DISTINCT linkedin_company_url) as count
      FROM cl.company_identity
      WHERE linkedin_company_url IS NOT NULL
    `);
    report.inventory.distinctLinkedIn = parseInt(linkedinCount.rows[0].count);
    console.log(`Distinct LinkedIn URLs: ${report.inventory.distinctLinkedIn}`);

    // 2. NULL READINESS
    console.log('\n2. NULL READINESS');
    console.log('-----------------');

    const missingDomain = await client.query(`
      SELECT COUNT(*) as count
      FROM cl.company_identity
      WHERE company_domain IS NULL
    `);
    report.nullReadiness.missingDomain = parseInt(missingDomain.rows[0].count);
    console.log(`Missing company_domain: ${report.nullReadiness.missingDomain}`);

    const missingLinkedin = await client.query(`
      SELECT COUNT(*) as count
      FROM cl.company_identity
      WHERE linkedin_company_url IS NULL
    `);
    report.nullReadiness.missingLinkedIn = parseInt(missingLinkedin.rows[0].count);
    console.log(`Missing linkedin_company_url: ${report.nullReadiness.missingLinkedIn}`);

    const missingUid = await client.query(`
      SELECT COUNT(*) as count
      FROM cl.company_identity
      WHERE company_unique_id IS NULL
    `);
    report.nullReadiness.missingUid = parseInt(missingUid.rows[0].count);
    console.log(`Missing company_unique_id: ${report.nullReadiness.missingUid}`);

    // Check admission gate (need at least one of domain or linkedin)
    const failsAdmissionGate = await client.query(`
      SELECT COUNT(*) as count
      FROM cl.company_identity
      WHERE company_domain IS NULL AND linkedin_company_url IS NULL
    `);
    report.nullReadiness.failsAdmissionGate = parseInt(failsAdmissionGate.rows[0].count);
    console.log(`Fails admission gate (no domain AND no LinkedIn): ${report.nullReadiness.failsAdmissionGate}`);

    if (report.nullReadiness.failsAdmissionGate > 0) {
      report.risks.push(`CRITICAL: ${report.nullReadiness.failsAdmissionGate} records fail admission gate`);
    }

    // 3. COLLISION CHECKS
    console.log('\n3. COLLISION CHECKS');
    console.log('-------------------');

    const domainCollisions = await client.query(`
      SELECT company_domain, COUNT(*) as count
      FROM cl.company_identity
      WHERE company_domain IS NOT NULL
      GROUP BY company_domain
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `);
    report.collisionChecks.domainCollisions = domainCollisions.rows.length;
    console.log(`Domain collisions (same domain → multiple companies): ${domainCollisions.rows.length}`);
    if (domainCollisions.rows.length > 0) {
      console.log('  Top collisions:');
      domainCollisions.rows.forEach(r => console.log(`    - ${r.company_domain}: ${r.count} records`));
      report.risks.push(`WARNING: ${domainCollisions.rows.length} domains map to multiple companies`);
    }

    const linkedinCollisions = await client.query(`
      SELECT linkedin_company_url, COUNT(*) as count
      FROM cl.company_identity
      WHERE linkedin_company_url IS NOT NULL
      GROUP BY linkedin_company_url
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    `);
    report.collisionChecks.linkedinCollisions = linkedinCollisions.rows.length;
    console.log(`LinkedIn collisions (same URL → multiple companies): ${linkedinCollisions.rows.length}`);
    if (linkedinCollisions.rows.length > 0) {
      console.log('  Top collisions:');
      linkedinCollisions.rows.forEach(r => console.log(`    - ${r.linkedin_company_url}: ${r.count} records`));
      report.risks.push(`WARNING: ${linkedinCollisions.rows.length} LinkedIn URLs map to multiple companies`);
    }

    // 4. ID INTEGRITY
    console.log('\n4. ID INTEGRITY');
    console.log('---------------');

    const duplicateUids = await client.query(`
      SELECT company_unique_id, COUNT(*) as count
      FROM cl.company_identity
      WHERE company_unique_id IS NOT NULL
      GROUP BY company_unique_id
      HAVING COUNT(*) > 1
    `);
    report.idIntegrity.duplicateUids = duplicateUids.rows.length;
    console.log(`Duplicate company_unique_id values: ${duplicateUids.rows.length}`);
    if (duplicateUids.rows.length > 0) {
      report.risks.push(`CRITICAL: ${duplicateUids.rows.length} duplicate company_unique_id values found`);
    }

    const uidCount = await client.query(`
      SELECT COUNT(*) as count
      FROM cl.company_identity
      WHERE company_unique_id IS NOT NULL
    `);
    report.idIntegrity.recordsWithUid = parseInt(uidCount.rows[0].count);
    console.log(`Records with company_unique_id: ${report.idIntegrity.recordsWithUid}`);

    // DECISION GATE
    console.log('\n========================================');
    console.log('DECISION GATE EVALUATION');
    console.log('========================================');

    const gateConditions = {
      noDuplicateUids: report.idIntegrity.duplicateUids === 0,
      collisionsAcceptable: report.collisionChecks.domainCollisions <= 10 && report.collisionChecks.linkedinCollisions <= 10,
      missingUidsOnly: report.nullReadiness.missingUid > 0,
      admissionGatePass: report.nullReadiness.failsAdmissionGate === 0
    };

    console.log(`\n✓ No duplicate UIDs: ${gateConditions.noDuplicateUids ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Collisions acceptable (≤10): ${gateConditions.collisionsAcceptable ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Missing UIDs to backfill: ${gateConditions.missingUidsOnly ? `YES (${report.nullReadiness.missingUid})` : 'NONE'}`);
    console.log(`✓ Admission gate: ${gateConditions.admissionGatePass ? 'PASS' : 'FAIL'}`);

    const allGatesPass = gateConditions.noDuplicateUids &&
                         gateConditions.collisionsAcceptable &&
                         gateConditions.admissionGatePass;

    report.gateStatus = allGatesPass ? 'PASS' : 'FAIL';

    console.log('\n----------------------------------------');
    if (allGatesPass && gateConditions.missingUidsOnly) {
      console.log('GATE STATUS: ✅ PASS - Ready for Phase 3 backfill');
      console.log(`Rows to backfill: ${report.nullReadiness.missingUid}`);
    } else if (allGatesPass && !gateConditions.missingUidsOnly) {
      console.log('GATE STATUS: ✅ PASS - No backfill needed');
      console.log('All records already have company_unique_id');
    } else {
      console.log('GATE STATUS: ❌ FAIL - DO NOT PROCEED');
      console.log('Risks identified:');
      report.risks.forEach(r => console.log(`  - ${r}`));
    }
    console.log('----------------------------------------');

    // Summary
    console.log('\n========================================');
    console.log('VERIFICATION REPORT SUMMARY');
    console.log('========================================');
    console.log(JSON.stringify(report, null, 2));

    return report;

  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    report.gateStatus = 'ERROR';
    report.risks.push(`ERROR: ${error.message}`);
    return report;
  } finally {
    await client.end();
  }
}

runVerification();
