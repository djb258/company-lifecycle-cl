-- ============================================================================
-- MIGRATION 008: LIFECYCLE POINTER REGISTRY
-- ============================================================================
-- Extends company_identity to act as lifecycle pointer registry.
-- CL is authority. Sub-hubs (Outreach, Sales, Client) fill their assigned slots.
-- Write-once semantics: once an ID is set, it cannot be changed.
-- ============================================================================

-- 1. ADD LIFECYCLE POINTER COLUMNS (nullable, write-once)
ALTER TABLE cl.company_identity
  ADD COLUMN IF NOT EXISTS outreach_id UUID,
  ADD COLUMN IF NOT EXISTS sales_process_id UUID,
  ADD COLUMN IF NOT EXISTS client_id UUID;

-- 2. ADD TIMESTAMP METADATA (no payloads, just when attached)
ALTER TABLE cl.company_identity
  ADD COLUMN IF NOT EXISTS outreach_attached_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sales_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_promoted_at TIMESTAMPTZ;

-- 3. WRITE-ONCE TRIGGER: Block updates to non-NULL pointer columns
CREATE OR REPLACE FUNCTION cl.enforce_write_once_pointers()
RETURNS TRIGGER AS $$
BEGIN
  -- outreach_id: write-once
  IF OLD.outreach_id IS NOT NULL AND NEW.outreach_id IS DISTINCT FROM OLD.outreach_id THEN
    RAISE EXCEPTION 'outreach_id is write-once and already set for company %', OLD.company_unique_id;
  END IF;

  -- sales_process_id: write-once
  IF OLD.sales_process_id IS NOT NULL AND NEW.sales_process_id IS DISTINCT FROM OLD.sales_process_id THEN
    RAISE EXCEPTION 'sales_process_id is write-once and already set for company %', OLD.company_unique_id;
  END IF;

  -- client_id: write-once
  IF OLD.client_id IS NOT NULL AND NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'client_id is write-once and already set for company %', OLD.company_unique_id;
  END IF;

  -- Auto-set timestamps on first write
  IF OLD.outreach_id IS NULL AND NEW.outreach_id IS NOT NULL THEN
    NEW.outreach_attached_at := COALESCE(NEW.outreach_attached_at, NOW());
  END IF;

  IF OLD.sales_process_id IS NULL AND NEW.sales_process_id IS NOT NULL THEN
    NEW.sales_opened_at := COALESCE(NEW.sales_opened_at, NOW());
  END IF;

  IF OLD.client_id IS NULL AND NEW.client_id IS NOT NULL THEN
    NEW.client_promoted_at := COALESCE(NEW.client_promoted_at, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists, then create trigger
DROP TRIGGER IF EXISTS trg_write_once_pointers ON cl.company_identity;

CREATE TRIGGER trg_write_once_pointers
  BEFORE UPDATE ON cl.company_identity
  FOR EACH ROW
  EXECUTE FUNCTION cl.enforce_write_once_pointers();

-- 4. READ-ONLY VIEW FOR UI CONSUMERS (Lovable.DAVE)
CREATE OR REPLACE VIEW cl.v_company_lifecycle_status AS
SELECT
  company_unique_id,
  sovereign_company_id,
  company_name,
  company_domain,

  -- Pointer IDs
  outreach_id,
  sales_process_id,
  client_id,

  -- Timestamps
  outreach_attached_at,
  sales_opened_at,
  client_promoted_at,

  -- Derived booleans for UI
  (outreach_id IS NOT NULL) AS has_outreach,
  (sales_process_id IS NOT NULL) AS has_sales,
  (client_id IS NOT NULL) AS is_client,

  -- Lifecycle stage (derived, for convenience)
  CASE
    WHEN client_id IS NOT NULL THEN 'CLIENT'
    WHEN sales_process_id IS NOT NULL THEN 'SALES'
    WHEN outreach_id IS NOT NULL THEN 'OUTREACH'
    ELSE 'PROSPECT'
  END AS lifecycle_stage

FROM cl.company_identity;

-- 5. INDEX FOR LIFECYCLE QUERIES
CREATE INDEX IF NOT EXISTS idx_company_identity_outreach_id
  ON cl.company_identity(outreach_id) WHERE outreach_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_company_identity_sales_process_id
  ON cl.company_identity(sales_process_id) WHERE sales_process_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_company_identity_client_id
  ON cl.company_identity(client_id) WHERE client_id IS NOT NULL;

-- 6. COMMENTS
COMMENT ON COLUMN cl.company_identity.outreach_id IS 'Write-once pointer to outreach.outreach. Set when Outreach claims this company.';
COMMENT ON COLUMN cl.company_identity.sales_process_id IS 'Write-once pointer to sales process. Set when Sales opens opportunity.';
COMMENT ON COLUMN cl.company_identity.client_id IS 'Write-once pointer to client record. Set when company becomes client.';
COMMENT ON VIEW cl.v_company_lifecycle_status IS 'Read-only view for UI consumers. Exposes lifecycle pointers and derived stage.';
