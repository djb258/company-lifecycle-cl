#!/usr/bin/env node
/**
 * Validate NEW_COMPANIES_FOR_CLAY.csv against Company Lifecycle doctrine
 *
 * Checks:
 * 1. CSV contract compliance (Name + Domain OR LinkedIn)
 * 2. Duplicate domains in cl.company_identity
 * 3. Duplicate LinkedIn URLs in cl.company_identity
 */

const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { Pool } = require('pg');

// Use Doppler for secrets: doppler run -- node scripts/validate_new_companies.cjs
const CONNECTION_STRING = process.env.VITE_DATABASE_URL;

if (!CONNECTION_STRING) {
  console.error('ERROR: VITE_DATABASE_URL not set. Run with: doppler run -- node scripts/validate_new_companies.cjs');
  process.exit(1);
}

async function main() {
  const csvPath = process.argv[2] || 'c:\\Users\\CUSTOM PC\\Desktop\\Clay Tables\\pipeline_output\\NEW_COMPANIES_FOR_CLAY.csv';

  console.log('═'.repeat(70));
  console.log('COMPANY LIFECYCLE - NEW COMPANY VALIDATION');
  console.log('═'.repeat(70));
  console.log(`File: ${csvPath}`);
  console.log('═'.repeat(70));

  // Read CSV
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
  });

  console.log(`\nTotal rows in CSV: ${rows.length}`);

  // Connect to database
  const pool = new Pool({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Validate CSV contract
    console.log('\n' + '─'.repeat(70));
    console.log('STEP 1: CSV CONTRACT VALIDATION');
    console.log('─'.repeat(70));

    const contractResults = {
      pass: [],
      fail: [],
    };

    for (const row of rows) {
      const name = row['Company Name'] || row['Name'];
      const domain = normalizeDomain(row['Domain']);
      const linkedin = row['LinkedIn URL'];

      const errors = [];

      if (!name || name.trim().length === 0) {
        errors.push('Missing company name');
      }

      if (!domain && !linkedin) {
        errors.push('Missing both Domain and LinkedIn URL');
      }

      if (errors.length > 0) {
        contractResults.fail.push({ name, domain, linkedin, errors });
      } else {
        contractResults.pass.push({ name, domain, linkedin, row });
      }
    }

    console.log(`✓ Contract PASS: ${contractResults.pass.length}`);
    console.log(`✗ Contract FAIL: ${contractResults.fail.length}`);

    if (contractResults.fail.length > 0) {
      console.log('\nFailed records:');
      contractResults.fail.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.name || '(no name)'}: ${f.errors.join(', ')}`);
      });
    }

    // Check for duplicate domains
    console.log('\n' + '─'.repeat(70));
    console.log('STEP 2: DUPLICATE DOMAIN CHECK');
    console.log('─'.repeat(70));

    const domains = contractResults.pass
      .map(r => r.domain)
      .filter(d => d && d.length > 0);

    console.log(`Domains to check: ${domains.length}`);

    const domainDupes = [];
    const domainNew = [];

    for (const domain of domains) {
      const result = await pool.query(
        'SELECT company_unique_id, company_name FROM cl.company_identity WHERE company_domain = $1',
        [domain]
      );

      if (result.rows.length > 0) {
        domainDupes.push({
          domain,
          existing_id: result.rows[0].company_unique_id,
          existing_name: result.rows[0].company_name,
        });
      } else {
        domainNew.push(domain);
      }
    }

    console.log(`✓ New domains: ${domainNew.length}`);
    console.log(`⚠ Duplicate domains: ${domainDupes.length}`);

    if (domainDupes.length > 0) {
      console.log('\nDuplicate domains (already in CL):');
      domainDupes.forEach((d, i) => {
        console.log(`  ${i + 1}. ${d.domain} → ${d.existing_name} (${d.existing_id.slice(0, 8)}...)`);
      });
    }

    // Check for duplicate LinkedIn URLs
    console.log('\n' + '─'.repeat(70));
    console.log('STEP 3: DUPLICATE LINKEDIN CHECK');
    console.log('─'.repeat(70));

    const linkedins = contractResults.pass
      .map(r => r.linkedin)
      .filter(l => l && l.length > 0);

    console.log(`LinkedIn URLs to check: ${linkedins.length}`);

    const linkedinDupes = [];
    const linkedinNew = [];

    for (const linkedin of linkedins) {
      const result = await pool.query(
        'SELECT company_unique_id, company_name FROM cl.company_identity WHERE linkedin_company_url = $1',
        [linkedin]
      );

      if (result.rows.length > 0) {
        linkedinDupes.push({
          linkedin,
          existing_id: result.rows[0].company_unique_id,
          existing_name: result.rows[0].company_name,
        });
      } else {
        linkedinNew.push(linkedin);
      }
    }

    console.log(`✓ New LinkedIn URLs: ${linkedinNew.length}`);
    console.log(`⚠ Duplicate LinkedIn URLs: ${linkedinDupes.length}`);

    if (linkedinDupes.length > 0) {
      console.log('\nDuplicate LinkedIn URLs (already in CL):');
      linkedinDupes.forEach((l, i) => {
        console.log(`  ${i + 1}. ${l.linkedin.split('/company/')[1]} → ${l.existing_name}`);
      });
    }

    // Determine truly new companies
    console.log('\n' + '─'.repeat(70));
    console.log('STEP 4: FINAL ANALYSIS');
    console.log('─'.repeat(70));

    const duplicateDomainSet = new Set(domainDupes.map(d => d.domain));
    const duplicateLinkedinSet = new Set(linkedinDupes.map(l => l.linkedin));

    const trulyNew = [];
    const duplicates = [];

    for (const company of contractResults.pass) {
      const isDomainDupe = company.domain && duplicateDomainSet.has(company.domain);
      const isLinkedinDupe = company.linkedin && duplicateLinkedinSet.has(company.linkedin);

      if (isDomainDupe || isLinkedinDupe) {
        duplicates.push({
          name: company.name,
          domain: company.domain,
          linkedin: company.linkedin,
          reason: isDomainDupe ? 'domain exists' : 'linkedin exists',
        });
      } else {
        trulyNew.push(company);
      }
    }

    console.log(`\n📊 SUMMARY`);
    console.log(`   Total in CSV:        ${rows.length}`);
    console.log(`   Contract failures:   ${contractResults.fail.length}`);
    console.log(`   Already in CL:       ${duplicates.length}`);
    console.log(`   ────────────────────────────`);
    console.log(`   TRULY NEW:           ${trulyNew.length}`);

    if (trulyNew.length > 0) {
      console.log('\n✓ New companies ready for ingestion:');
      trulyNew.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.name} (${c.domain || c.linkedin.split('/company/')[1]})`);
      });
    }

    if (duplicates.length > 0) {
      console.log('\n⚠ Duplicates (will be skipped):');
      duplicates.forEach((d, i) => {
        console.log(`  ${i + 1}. ${d.name} - ${d.reason}`);
      });
    }

    console.log('\n' + '═'.repeat(70));
    console.log('VALIDATION COMPLETE');
    console.log('═'.repeat(70));

    // Return summary for programmatic use
    return {
      total: rows.length,
      contractPass: contractResults.pass.length,
      contractFail: contractResults.fail.length,
      duplicates: duplicates.length,
      trulyNew: trulyNew.length,
      newCompanies: trulyNew,
    };

  } finally {
    await pool.end();
  }
}

function normalizeDomain(domain) {
  if (!domain) return null;
  let normalized = String(domain).trim().toLowerCase();
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/^www\./, '');
  normalized = normalized.split('/')[0];
  return normalized.includes('.') ? normalized : null;
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
