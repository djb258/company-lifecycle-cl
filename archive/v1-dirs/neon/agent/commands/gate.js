// Gate Checker - Verify eligibility for stage transitions

import { getClient } from '../db.js';

export class GateChecker {
  async run(options) {
    console.log('='.repeat(60));
    console.log('NEON AGENT: GATE CHECKER');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('');

    const client = await getClient();

    try {
      if (options.company) {
        await this.checkCompany(client, options.company, options.stage);
      } else if (options.summary) {
        await this.showSummary(client, options.stage);
      } else {
        await this.showAllGates(client);
      }
    } finally {
      await client.end();
    }
  }

  async checkCompany(client, sovereignId, stage) {
    console.log(`Checking company: ${sovereignId}`);
    console.log('-'.repeat(40));

    // Get company from CL
    const company = await client.query(`
      SELECT
        company_unique_id,
        company_name,
        company_domain,
        identity_status,
        existence_verified,
        name_match_score,
        state_match_result
      FROM cl.company_identity
      WHERE company_unique_id = $1
    `, [sovereignId]);

    if (company.rows.length === 0) {
      console.log('  Company not found in cl.company_identity');
      return;
    }

    const c = company.rows[0];
    console.log(`  Name: ${c.company_name}`);
    console.log(`  Domain: ${c.company_domain}`);
    console.log(`  Status: ${c.identity_status}`);
    console.log(`  Existence Verified: ${c.existence_verified}`);
    console.log('');

    // Check CL → Outreach gate
    console.log('GATE: CL → Outreach');
    if (c.identity_status === 'PASS') {
      console.log('  ✓ ELIGIBLE - identity_status = PASS');
    } else {
      console.log(`  ✗ BLOCKED - identity_status = ${c.identity_status}`);
      console.log('  Reason: Company has not passed identity verification');
    }

    // Check if already in outreach
    const inOutreach = await client.query(`
      SELECT target_id, outreach_status
      FROM outreach.company_target
      WHERE company_unique_id = $1
    `, [sovereignId]);

    if (inOutreach.rows.length > 0) {
      console.log(`  Already in outreach: ${inOutreach.rows[0].outreach_status}`);
    }
  }

  async showSummary(client, stage) {
    if (!stage || stage === 'cl-to-outreach') {
      console.log('GATE: CL → Outreach');
      console.log('-'.repeat(40));

      const summary = await client.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE identity_status = 'PASS') as eligible,
          COUNT(*) FILTER (WHERE identity_status = 'PENDING') as pending,
          COUNT(*) FILTER (WHERE identity_status = 'FAIL') as failed
        FROM cl.company_identity
      `);

      const s = summary.rows[0];
      console.log(`  Total companies: ${s.total}`);
      console.log(`  Eligible (PASS): ${s.eligible}`);
      console.log(`  Pending: ${s.pending}`);
      console.log(`  Failed: ${s.failed}`);
      console.log(`  Pass rate: ${(s.eligible / s.total * 100).toFixed(2)}%`);

      // Check how many eligible are already in outreach
      const inOutreach = await client.query(`
        SELECT COUNT(*) as cnt
        FROM cl.company_identity ci
        JOIN outreach.company_target ct ON ci.company_unique_id::text = ct.company_unique_id
        WHERE ci.identity_status = 'PASS'
      `);
      console.log(`  Already in outreach: ${inOutreach.rows[0].cnt}`);
      console.log(`  Ready to promote: ${s.eligible - inOutreach.rows[0].cnt}`);
    }
  }

  async showAllGates(client) {
    console.log('ALL GATES STATUS');
    console.log('='.repeat(60));

    await this.showSummary(client, 'cl-to-outreach');

    // Future: Add outreach-to-sales and sales-to-client gates
    console.log('\nGATE: Outreach → Sales');
    console.log('-'.repeat(40));
    console.log('  (Managed by outreach repo)');

    console.log('\nGATE: Sales → Client');
    console.log('-'.repeat(40));
    console.log('  (Managed by Lovable.dev)');
  }
}
