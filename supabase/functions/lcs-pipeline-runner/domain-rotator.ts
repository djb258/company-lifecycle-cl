/**
 * LCS Domain Rotator — Deterministic Sending Domain Assignment
 *
 * Selects a sending domain from lcs.domain_pool via deterministic round-robin.
 * Domain locks per cadence (same company always sees same sender domain).
 * No randomness. No mid-cadence rotation.
 *
 * Authority: HUB-CL-001, SUBHUB-CL-LCS
 */

// =====================================================================
// TYPES
// =====================================================================

interface DomainAssignment {
  domain: string;
  subdomain: string;
  sender_name: string;
  sender_email: string;
  domain_pool_id: string;
}

interface DomainRotatorResult {
  success: boolean;
  assignment: DomainAssignment | null;
  error: string | null;
}

// SupabaseClient type is inherited from the caller — avoid duplicate import
type SupabaseClient = any;

// =====================================================================
// DOMAIN ASSIGNMENT — Main entry point
// =====================================================================

/**
 * Assign a sending domain for this cadence instance.
 *
 * Step 1: Check for existing assignment (cadence lock — same company reuses domain)
 * Step 2: If no prior assignment, select next via round-robin (least-used first)
 * Step 3: If no eligible domain, fail closed
 */
export async function assignDomain(
  supabase: SupabaseClient,
  cadenceInstanceId: string,
  sovereignCompanyId: string
): Promise<DomainRotatorResult> {
  try {
    // --- Step 1: Check for existing cadence lock ---
    const existing = await findExistingAssignment(supabase, sovereignCompanyId);
    if (existing) {
      return { success: true, assignment: existing, error: null };
    }

    // --- Step 2: Round-robin selection ---
    const selected = await selectNextDomain(supabase);
    if (selected) {
      return { success: true, assignment: selected, error: null };
    }

    // --- Step 3: No eligible domain ---
    return {
      success: false,
      assignment: null,
      error: 'No eligible sending domain available — all domains at cap, paused, or unverified',
    };
  } catch (err) {
    return {
      success: false,
      assignment: null,
      error: `Domain rotation error: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

// =====================================================================
// STEP 1 — Find existing assignment (cadence lock)
// =====================================================================

/**
 * Check lcs.event for a prior send from this sovereign_company_id.
 * If a domain was used and it's still eligible, reuse it.
 */
async function findExistingAssignment(
  supabase: SupabaseClient,
  sovereignCompanyId: string
): Promise<DomainAssignment | null> {
  // Look for the most recent ADAPTER_CALLED event for this company
  const { data: priorEvent } = await supabase
    .schema('lcs')
    .from('event')
    .select('sender_identity, payload')
    .eq('sovereign_company_id', sovereignCompanyId)
    .eq('event_type', 'ADAPTER_CALLED')
    .eq('channel', 'MG')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!priorEvent?.payload?.message_snapshot?.variables_resolved) {
    return null;
  }

  // Extract the sender_email domain from the prior event
  const priorSenderEmail = priorEvent.payload?.sender_email as string | undefined;
  if (!priorSenderEmail) return null;

  const priorDomain = priorSenderEmail.split('@')[1];
  if (!priorDomain) return null;

  // Check if that domain is still eligible in the pool
  const { data: poolRow } = await supabase
    .schema('lcs')
    .from('domain_pool')
    .select('id, domain, subdomain, sender_name, sender_email, status, mailgun_verified, sent_today, daily_cap, bounce_rate_24h, complaint_rate_24h')
    .eq('subdomain', priorDomain)
    .maybeSingle();

  if (!poolRow) return null;

  // Verify the domain is still eligible
  if (!isEligible(poolRow)) return null;

  return {
    domain: poolRow.domain,
    subdomain: poolRow.subdomain,
    sender_name: poolRow.sender_name,
    sender_email: poolRow.sender_email,
    domain_pool_id: poolRow.id,
  };
}

// =====================================================================
// STEP 2 — Round-robin selection (least-used first)
// =====================================================================

/**
 * Select the next eligible domain via deterministic round-robin.
 * Ordered by sent_today ASC, last_sent_at ASC NULLS FIRST.
 * The domain with the fewest sends today (and least recently used) wins.
 */
async function selectNextDomain(
  supabase: SupabaseClient
): Promise<DomainAssignment | null> {
  const { data: candidates } = await supabase
    .schema('lcs')
    .from('domain_pool')
    .select('id, domain, subdomain, sender_name, sender_email, status, mailgun_verified, sent_today, daily_cap, bounce_rate_24h, complaint_rate_24h')
    .in('status', ['ACTIVE', 'WARMING'])
    .eq('mailgun_verified', true)
    .order('sent_today', { ascending: true })
    .order('last_sent_at', { ascending: true, nullsFirst: true });

  if (!candidates || candidates.length === 0) return null;

  // Find the first eligible domain (respects cap + health thresholds)
  for (const row of candidates) {
    if (isEligible(row)) {
      return {
        domain: row.domain,
        subdomain: row.subdomain,
        sender_name: row.sender_name,
        sender_email: row.sender_email,
        domain_pool_id: row.id,
      };
    }
  }

  return null;
}

// =====================================================================
// ELIGIBILITY CHECK
// =====================================================================

function isEligible(row: {
  status: string;
  mailgun_verified: boolean;
  sent_today: number;
  daily_cap: number;
  bounce_rate_24h: number | string;
  complaint_rate_24h: number | string;
}): boolean {
  if (row.status !== 'ACTIVE' && row.status !== 'WARMING') return false;
  if (!row.mailgun_verified) return false;
  if (row.sent_today >= row.daily_cap) return false;
  if (Number(row.bounce_rate_24h) >= 0.05) return false;
  if (Number(row.complaint_rate_24h) >= 0.001) return false;
  return true;
}

// =====================================================================
// POST-SEND — Record domain send
// =====================================================================

/**
 * Increment sent_today and update last_sent_at after successful adapter dispatch.
 * Call this ONLY after the adapter confirms send — never before.
 */
export async function recordDomainSend(
  supabase: SupabaseClient,
  domainPoolId: string
): Promise<void> {
  // Use RPC to atomically increment sent_today
  // Fallback: read-modify-write if RPC not available
  const { data: current } = await supabase
    .schema('lcs')
    .from('domain_pool')
    .select('sent_today')
    .eq('id', domainPoolId)
    .single();

  if (current) {
    await supabase
      .schema('lcs')
      .from('domain_pool')
      .update({
        sent_today: current.sent_today + 1,
        last_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', domainPoolId);
  }
}
