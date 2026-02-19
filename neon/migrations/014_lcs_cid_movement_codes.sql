-- ============================================================================
-- MIGRATION 014: CID MOVEMENT CODE SEEDS — OUT, SAL, CLI
-- ============================================================================
-- Authority: HUB-CL-001
-- Prompt:    BUILD_CID_SHEETS.md
-- Depends:   012_create_movement_registry.sql (movement_code_registry table)
-- Purpose:   Seed movement codes for all three sub-hub silos.
--            Each subhub gets 5 starter codes. Codes are additive only.
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 1: OUTREACH (OUT) — 5 movement codes
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO cl.movement_code_registry (subhub, code, description)
VALUES
  ('OUT', 1, 'Initial outreach contact'),
  ('OUT', 2, 'Follow-up sequence start'),
  ('OUT', 3, 'DOL renewal window opens'),
  ('OUT', 4, 'Blog signal detected'),
  ('OUT', 5, 'Outreach cycle closed')
ON CONFLICT (subhub, code) DO NOTHING;

COMMENT ON TABLE cl.movement_code_registry IS 'Registry of movement codes per sub-hub. Additive only — codes cannot be removed or repurposed. Seeded by migration 014.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 2: SALES (SAL) — 5 movement codes
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO cl.movement_code_registry (subhub, code, description)
VALUES
  ('SAL', 1, 'Lead qualified'),
  ('SAL', 2, 'Discovery scheduled'),
  ('SAL', 3, 'Proposal sent'),
  ('SAL', 4, 'Follow-up post-proposal'),
  ('SAL', 5, 'Sales cycle closed')
ON CONFLICT (subhub, code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 3: CLIENT (CLI) — 5 movement codes
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO cl.movement_code_registry (subhub, code, description)
VALUES
  ('CLI', 1, 'Onboarding initiated'),
  ('CLI', 2, 'Onboarding completed'),
  ('CLI', 3, 'Quarterly check-in'),
  ('CLI', 4, 'Renewal window opens'),
  ('CLI', 5, 'Client cycle closed')
ON CONFLICT (subhub, code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- Section 4: VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

-- Expected: 15 rows (5 OUT + 5 SAL + 5 CLI)
-- Verify with: SELECT subhub, code, description, active FROM cl.movement_code_registry ORDER BY subhub, code;

COMMIT;
