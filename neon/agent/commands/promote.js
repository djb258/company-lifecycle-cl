// Promotion Runner - Move companies between stages

import { getClient, withTransaction } from '../db.js';

export class PromotionRunner {
  async run(options) {
    console.log('='.repeat(60));
    console.log('NEON AGENT: PROMOTION RUNNER');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`From: ${options.from || 'cl'}`);
    console.log(`To: ${options.to || 'outreach'}`);
    console.log(`Batch Size: ${options.batch}`);
    console.log(`Dry Run: ${options.dryRun || false}`);
    console.log('');

    if (options.company) {
      return this.promoteOne(options.company, options);
    }

    const from = options.from || 'cl';
    const to = options.to || 'outreach';

    if (from === 'cl' && to === 'outreach') {
      return this.promoteCLToOutreach(options);
    }

    console.log(`Promotion from ${from} to ${to} not yet implemented`);
    console.log('CL manages: cl → outreach eligibility');
    console.log('Outreach manages: outreach → sales');
    console.log('Lovable manages: sales → client');
  }

  async promoteOne(sovereignId, options) {
    console.log(`Promoting single company: ${sovereignId}`);
    console.log('-'.repeat(40));

    const client = await getClient();
    try {
      // Check eligibility
      const eligible = await client.query(`
        SELECT company_unique_id, company_name, identity_status
        FROM cl.company_identity
        WHERE company_unique_id = $1
      `, [sovereignId]);

      if (eligible.rows.length === 0) {
        console.log('  ERROR: Company not found');
        return;
      }

      const company = eligible.rows[0];
      if (company.identity_status !== 'PASS') {
        console.log(`  BLOCKED: identity_status = ${company.identity_status}`);
        console.log('  Company must have identity_status = PASS to enter outreach');
        return;
      }

      // Check if already in outreach
      const existing = await client.query(`
        SELECT target_id FROM outreach.company_target
        WHERE company_unique_id = $1
      `, [sovereignId]);

      if (existing.rows.length > 0) {
        console.log('  Already in outreach');
        return;
      }

      if (options.dryRun) {
        console.log('  DRY RUN: Would promote to outreach');
        console.log(`  Company: ${company.company_name}`);
        return;
      }

      // Note: Actual promotion to outreach.company_target
      // is handled by the outreach repo, not CL
      console.log('  READY for outreach');
      console.log('  Outreach repo should insert into outreach.company_target');
      console.log(`  sovereign_id: ${sovereignId}`);

    } finally {
      await client.end();
    }
  }

  async promoteCLToOutreach(options) {
    console.log('CL → Outreach Promotion');
    console.log('-'.repeat(40));

    const client = await getClient();
    try {
      // Find eligible companies not yet in outreach
      const eligible = await client.query(`
        SELECT ci.company_unique_id, ci.company_name
        FROM cl.company_identity ci
        LEFT JOIN outreach.company_target ct ON ci.company_unique_id::text = ct.company_unique_id
        WHERE ci.identity_status = 'PASS'
          AND ct.target_id IS NULL
        LIMIT $1
      `, [parseInt(options.batch)]);

      console.log(`Found ${eligible.rows.length} companies ready for outreach`);

      if (options.dryRun) {
        console.log('\nDRY RUN - Companies that would be promoted:');
        eligible.rows.slice(0, 10).forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.company_name} (${r.company_unique_id})`);
        });
        if (eligible.rows.length > 10) {
          console.log(`  ... and ${eligible.rows.length - 10} more`);
        }
        return;
      }

      // Note: CL does not insert into outreach tables
      // It only verifies eligibility
      console.log('\nEligible sovereign_ids for outreach repo:');
      console.log(JSON.stringify(eligible.rows.map(r => r.company_unique_id), null, 2));
      console.log('\nOutreach repo should insert these into outreach.company_target');

    } finally {
      await client.end();
    }
  }
}
