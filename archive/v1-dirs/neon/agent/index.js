// Neon Agent - Database Administration for Company Lifecycle
//
// Responsibilities:
// - Schema migrations (versioned, explicit)
// - Data quality checks (counts, nulls, drift)
// - Stage gate enforcement (CL → Outreach requires PASS)
// - Controlled promotions (stage transitions)
//
// NOT responsible for:
// - Inventing business logic
// - Guessing intent
// - Rewriting identity
// - Running enrichment

import { Command } from 'commander';
import { MigrationRunner } from './commands/migrate.js';
import { AuditRunner } from './commands/audit.js';
import { GateChecker } from './commands/gate.js';
import { PromotionRunner } from './commands/promote.js';
import { HealthChecker } from './commands/health.js';

const program = new Command();

program
  .name('neon-agent')
  .description('Database administration agent for Company Lifecycle')
  .version('1.0.0');

// ============================================================================
// MIGRATE - Schema migrations
// ============================================================================
program
  .command('migrate')
  .description('Run database migrations')
  .option('--dry-run', 'Preview changes without executing')
  .option('--target <version>', 'Migrate to specific version')
  .option('--rollback', 'Rollback last migration')
  .action(async (options) => {
    const runner = new MigrationRunner();
    await runner.run(options);
  });

// ============================================================================
// AUDIT - Data quality checks
// ============================================================================
program
  .command('audit')
  .description('Run data quality audit')
  .option('--schema <name>', 'Audit specific schema (cl, outreach, sales, client)')
  .option('--full', 'Run comprehensive audit')
  .option('--counts-only', 'Only check table counts')
  .action(async (options) => {
    const runner = new AuditRunner();
    await runner.run(options);
  });

// ============================================================================
// GATE - Check eligibility for stage transitions
// ============================================================================
program
  .command('gate')
  .description('Check gate eligibility')
  .option('--stage <name>', 'Gate to check (cl-to-outreach, outreach-to-sales, sales-to-client)')
  .option('--company <id>', 'Check specific company by sovereign_id')
  .option('--summary', 'Show gate summary statistics')
  .action(async (options) => {
    const checker = new GateChecker();
    await checker.run(options);
  });

// ============================================================================
// PROMOTE - Move companies between stages
// ============================================================================
program
  .command('promote')
  .description('Promote companies to next stage')
  .option('--from <stage>', 'Source stage')
  .option('--to <stage>', 'Target stage')
  .option('--batch <size>', 'Batch size', '100')
  .option('--dry-run', 'Preview promotions without executing')
  .option('--company <id>', 'Promote specific company')
  .action(async (options) => {
    const runner = new PromotionRunner();
    await runner.run(options);
  });

// ============================================================================
// HEALTH - System health checks
// ============================================================================
program
  .command('health')
  .description('Check system health')
  .option('--connection', 'Test database connection')
  .option('--schemas', 'Verify schema integrity')
  .option('--gates', 'Verify gate constraints')
  .action(async (options) => {
    const checker = new HealthChecker();
    await checker.run(options);
  });

// ============================================================================
// SYNC - Status sync operations
// ============================================================================
program
  .command('sync')
  .description('Sync identity status with verification results')
  .option('--dry-run', 'Preview changes without executing')
  .option('--force', 'Force re-sync all records')
  .action(async (options) => {
    const { syncIdentityStatus } = await import('./commands/sync.js');
    await syncIdentityStatus(options);
  });

program.parse();
