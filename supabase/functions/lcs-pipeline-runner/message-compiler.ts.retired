/**
 * LCS Message Compiler — Deterministic Template Resolution
 *
 * Resolves frame templates against intelligence snapshots to produce
 * compiled message payloads (subject, body_html, body_text).
 *
 * Phase 1: No LLM. Templates are static code, not database rows.
 * Variables are resolved from lcs.v_company_intelligence fields.
 * Missing fields use safe fallbacks — never send broken strings.
 *
 * Authority: HUB-CL-001, SUBHUB-CL-LCS
 */

// =====================================================================
// TYPES
// =====================================================================

type FrameType = 'HAMMER' | 'NEWSLETTER' | 'POND' | 'MEETING_FOLLOWUP' | 'EMPLOYEE_COMM' | 'RENEWAL_NOTICE' | 'ONBOARDING';

interface CompiledMessage {
  subject: string;
  body_html: string;
  body_text: string;
  snapshot: {
    frame_id: string;
    template_key: string;
    variables_resolved: Record<string, string>;
    compiled_at: string;
  };
}

interface CompilerResult {
  success: boolean;
  message: CompiledMessage | null;
  error: string | null;
}

// =====================================================================
// VARIABLE RESOLUTION
// =====================================================================

/**
 * Extract and resolve template variables from the intelligence snapshot.
 * Every variable has a safe fallback — no null leakage into templates.
 */
function resolveVariables(intelligence: Record<string, unknown> | null): Record<string, string> {
  const i = intelligence ?? {};

  const companyName = str(i.company_name) || 'your company';
  const ceoName = str(i.ceo_name) || '';
  const ceoFirstName = ceoName ? ceoName.split(' ')[0] : '';
  const ceoEmail = str(i.ceo_email) || '';
  const cfoName = str(i.cfo_name) || '';
  const cfoFirstName = cfoName ? cfoName.split(' ')[0] : '';
  const renewalMonth = i.renewal_month ? monthName(Number(i.renewal_month)) : '';
  const carrierName = str(i.carrier_name) || '';
  const brokerOrAdvisor = str(i.broker_or_advisor) || '';

  // Determine best recipient name
  const recipientFirstName = ceoFirstName || cfoFirstName || '';
  const recipientGreeting = recipientFirstName || 'there';

  return {
    company_name: companyName,
    ceo_name: ceoName,
    ceo_first_name: ceoFirstName,
    ceo_email: ceoEmail,
    cfo_name: cfoName,
    cfo_first_name: cfoFirstName,
    renewal_month: renewalMonth,
    carrier_name: carrierName,
    broker_or_advisor: brokerOrAdvisor,
    recipient_first_name: recipientFirstName,
    recipient_greeting: recipientGreeting,
  };
}

function str(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function monthName(month: number): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1] || '';
}

// =====================================================================
// TEMPLATE REGISTRY — Static templates per FrameType
// =====================================================================

interface TemplateSpec {
  template_key: string;
  required_vars: string[];
  subject: (v: Record<string, string>) => string;
  body_html: (v: Record<string, string>) => string;
  body_text: (v: Record<string, string>) => string;
}

const TEMPLATE_REGISTRY: Partial<Record<FrameType, TemplateSpec>> = {

  // -----------------------------------------------------------------
  // HAMMER — Direct outreach, high signal (renewal window known)
  // -----------------------------------------------------------------
  HAMMER: {
    template_key: 'hammer_renewal_v1',
    required_vars: ['renewal_month'],
    subject: (v) => `${v.company_name} — ${v.renewal_month} renewal, zero-commission option`,
    body_html: (v) => `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a; line-height: 1.6;">
  <p>Hi ${v.recipient_greeting},</p>

  <p>Your benefits renewal is coming up in ${v.renewal_month}${v.carrier_name ? ` and I see you're currently with ${v.carrier_name}` : ''}. I wanted to reach out before that window opens.</p>

  <p>We're a benefits consulting firm that operates on a flat-fee model — no commissions, no overrides, no carrier incentives. That means when we recommend a plan, it's because it's the right fit for ${v.company_name}, not because it pays us more.</p>

  <p>Most companies we work with save 15–30% on their first renewal after switching to this model. The savings come from removing the conflicts that are built into commission-based brokerage.</p>

  <p>If you have 15 minutes before your renewal cycle starts, I'd like to walk you through how this works and what the numbers look like for a company like yours.</p>

  <p>Would any day this week or next work for a quick call?</p>

  <p>Best,<br>
  {{sender_identity}}</p>
</div>`.trim(),
    body_text: (v) => `Hi ${v.recipient_greeting},

Your benefits renewal is coming up in ${v.renewal_month}${v.carrier_name ? ` and I see you're currently with ${v.carrier_name}` : ''}. I wanted to reach out before that window opens.

We're a benefits consulting firm that operates on a flat-fee model — no commissions, no overrides, no carrier incentives. That means when we recommend a plan, it's because it's the right fit for ${v.company_name}, not because it pays us more.

Most companies we work with save 15–30% on their first renewal after switching to this model. The savings come from removing the conflicts that are built into commission-based brokerage.

If you have 15 minutes before your renewal cycle starts, I'd like to walk you through how this works and what the numbers look like for a company like yours.

Would any day this week or next work for a quick call?

Best,
{{sender_identity}}`,
  },

  // -----------------------------------------------------------------
  // POND — Lower signal, general awareness (no renewal date known)
  // -----------------------------------------------------------------
  POND: {
    template_key: 'pond_awareness_v1',
    required_vars: [],
    subject: (v) => `Quick question for ${v.company_name}`,
    body_html: (v) => `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a; line-height: 1.6;">
  <p>Hi ${v.recipient_greeting},</p>

  <p>Do you know how much of your employee benefits premium goes to your broker's commission? Most business owners don't — and it's usually between 3–6% of your total spend, baked in every year.</p>

  <p>We work differently. Our firm charges a flat consulting fee and takes zero commissions from carriers. That removes the incentive to recommend plans based on payout rather than fit.</p>

  <p>It's a straightforward model: we get paid for advice, not placement. Companies that switch to this approach typically see meaningful savings at their next renewal because the recommendations are finally aligned with their interests, not ours.</p>

  <p>If this sounds like something worth a 15-minute conversation, I'm happy to walk through it whenever works for you.</p>

  <p>Best,<br>
  {{sender_identity}}</p>
</div>`.trim(),
    body_text: (v) => `Hi ${v.recipient_greeting},

Do you know how much of your employee benefits premium goes to your broker's commission? Most business owners don't — and it's usually between 3–6% of your total spend, baked in every year.

We work differently. Our firm charges a flat consulting fee and takes zero commissions from carriers. That removes the incentive to recommend plans based on payout rather than fit.

It's a straightforward model: we get paid for advice, not placement. Companies that switch to this approach typically see meaningful savings at their next renewal because the recommendations are finally aligned with their interests, not ours.

If this sounds like something worth a 15-minute conversation, I'm happy to walk through it whenever works for you.

Best,
{{sender_identity}}`,
  },

  // -----------------------------------------------------------------
  // NEWSLETTER — Insight-led, educational, soft awareness
  // -----------------------------------------------------------------
  NEWSLETTER: {
    template_key: 'newsletter_insight_v1',
    required_vars: [],
    subject: (_v) => `The hidden cost most employers miss at renewal`,
    body_html: (v) => `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a; line-height: 1.6;">
  <p>Hi ${v.recipient_greeting},</p>

  <p>Every year, employers renew their benefits plans and absorb rate increases they're told are "market-driven." And every year, their broker collects a commission on the higher premium — a commission that goes up when your costs go up.</p>

  <p>That's not a bug. That's the business model.</p>

  <p>Here's what the industry doesn't advertise: the same carriers offer the same plans at the same rates whether you use a commissioned broker or a fee-only advisor. The difference is what happens behind the scenes — which plans get recommended, which alternatives get surfaced, and whether anyone is incentivized to actually lower your spend.</p>

  <p>A growing number of companies are moving to fee-only benefits consulting for exactly this reason. No commissions means the advisor's income doesn't depend on which plan you choose or how much you pay.</p>

  <p>If you want to understand how this model works and what it could look like for ${v.company_name}, we're always happy to have that conversation.</p>

  <p>Best,<br>
  {{sender_identity}}</p>
</div>`.trim(),
    body_text: (v) => `Hi ${v.recipient_greeting},

Every year, employers renew their benefits plans and absorb rate increases they're told are "market-driven." And every year, their broker collects a commission on the higher premium — a commission that goes up when your costs go up.

That's not a bug. That's the business model.

Here's what the industry doesn't advertise: the same carriers offer the same plans at the same rates whether you use a commissioned broker or a fee-only advisor. The difference is what happens behind the scenes — which plans get recommended, which alternatives get surfaced, and whether anyone is incentivized to actually lower your spend.

A growing number of companies are moving to fee-only benefits consulting for exactly this reason. No commissions means the advisor's income doesn't depend on which plan you choose or how much you pay.

If you want to understand how this model works and what it could look like for ${v.company_name}, we're always happy to have that conversation.

Best,
{{sender_identity}}`,
  },
};

// =====================================================================
// COMPILER — Main entry point
// =====================================================================

export function compileMessage(
  frameId: string,
  frameType: FrameType,
  intelligence: Record<string, unknown> | null,
  senderIdentity: string
): CompilerResult {
  // 1. Look up template
  const template = TEMPLATE_REGISTRY[frameType];
  if (!template) {
    return {
      success: false,
      message: null,
      error: `No template registered for frame type: ${frameType}`,
    };
  }

  // 2. Resolve variables
  const vars = resolveVariables(intelligence);

  // 3. Check required variables have real values (not fallbacks)
  for (const requiredVar of template.required_vars) {
    if (!vars[requiredVar]) {
      return {
        success: false,
        message: null,
        error: `Required variable '${requiredVar}' is empty for frame type ${frameType} (frame_id: ${frameId})`,
      };
    }
  }

  // 4. Compile subject, body_html, body_text
  try {
    let subject = template.subject(vars);
    let bodyHtml = template.body_html(vars);
    let bodyText = template.body_text(vars);

    // Replace {{sender_identity}} placeholder with actual sender
    subject = subject.replace(/\{\{sender_identity\}\}/g, senderIdentity);
    bodyHtml = bodyHtml.replace(/\{\{sender_identity\}\}/g, senderIdentity);
    bodyText = bodyText.replace(/\{\{sender_identity\}\}/g, senderIdentity);

    // 5. Final safety check — no unresolved placeholders
    const unresolvedHtml = bodyHtml.match(/\{\{[^}]+\}\}/g);
    const unresolvedText = bodyText.match(/\{\{[^}]+\}\}/g);
    if (unresolvedHtml || unresolvedText) {
      const unresolved = [...(unresolvedHtml ?? []), ...(unresolvedText ?? [])];
      return {
        success: false,
        message: null,
        error: `Unresolved placeholders in compiled message: ${unresolved.join(', ')}`,
      };
    }

    return {
      success: true,
      message: {
        subject,
        body_html: bodyHtml,
        body_text: bodyText,
        snapshot: {
          frame_id: frameId,
          template_key: template.template_key,
          variables_resolved: vars,
          compiled_at: new Date().toISOString(),
        },
      },
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      message: null,
      error: `Template compilation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}
