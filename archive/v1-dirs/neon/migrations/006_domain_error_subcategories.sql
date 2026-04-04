-- ============================================================================
-- DOMAIN ERROR SUBCATEGORIES
-- ============================================================================
-- Purpose: Split DOMAIN_FAIL into actionable subcategories for observability
--
-- New categories:
--   DOMAIN_TRANSIENT    - Temporary failures (timeout, socket hang up) - retry
--   DOMAIN_DEAD         - DNS doesn't resolve (ENOTFOUND) - permanent
--   DOMAIN_RATE_LIMITED - 429 errors - use ScraperAPI
--   DOMAIN_SSL_ISSUE    - TLS handshake failures - use Firecrawl
--   DOMAIN_EXISTS       - 404/403 = domain works, page missing - PASS
-- ============================================================================

-- Update the CHECK constraint to allow new failure codes
ALTER TABLE cl.cl_errors DROP CONSTRAINT IF EXISTS cl_errors_pass_name_check;

ALTER TABLE cl.cl_errors ADD CONSTRAINT cl_errors_pass_name_check
CHECK (pass_name IN ('existence', 'name', 'domain', 'collision', 'firmographic'));

-- Add retry tracking columns
ALTER TABLE cl.cl_errors ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;
ALTER TABLE cl.cl_errors ADD COLUMN IF NOT EXISTS retry_ceiling INT DEFAULT 3;
ALTER TABLE cl.cl_errors ADD COLUMN IF NOT EXISTS retry_after TIMESTAMPTZ;
ALTER TABLE cl.cl_errors ADD COLUMN IF NOT EXISTS tool_used TEXT;
ALTER TABLE cl.cl_errors ADD COLUMN IF NOT EXISTS tool_tier INT;

-- Create index for retry queries
CREATE INDEX IF NOT EXISTS idx_errors_retry
ON cl.cl_errors(retry_after)
WHERE resolved_at IS NULL AND retry_count < retry_ceiling;

-- Add TTL for transient errors (30 days)
ALTER TABLE cl.cl_errors ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Comment for documentation
COMMENT ON COLUMN cl.cl_errors.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN cl.cl_errors.retry_ceiling IS 'Max retries before marking permanent';
COMMENT ON COLUMN cl.cl_errors.retry_after IS 'Earliest time to retry this error';
COMMENT ON COLUMN cl.cl_errors.tool_used IS 'Tool that resolved/attempted (e.g., MXLookup, Firecrawl)';
COMMENT ON COLUMN cl.cl_errors.tool_tier IS 'Toolbox tier: 0=free, 1=cheap, 2=surgical';
COMMENT ON COLUMN cl.cl_errors.expires_at IS 'TTL for transient errors - auto-resolve after this';
