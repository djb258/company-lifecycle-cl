-- ═══════════════════════════════════════════════════════════════
-- LCS Registry Seed Data v2.2.0
-- Run AFTER: 001_lcs_schema_v2.2.0.sql
-- Authority: HUB-CL-001, SUBHUB-CL-LCS
-- Generated: 2026-02-12
--
-- Idempotent: Uses ON CONFLICT DO NOTHING on primary keys.
-- Safe to re-run without duplicating rows.
--
-- Contents:
--   Part A: Adapter Registry (3 rows) — MG, HR, SH
--   Part B: Signal Registry (9 rows) — one per SignalCategory
--   Part C: Frame Registry (11 rows) — OUTREACH + SALES + CLIENT
--
-- Execution:
--   psql $NEON_CONNECTION_STRING -f migrations/lcs/002_lcs_seed_registries.sql
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- Part A — Adapter Registry (3 adapters)
-- ═══════════════════════════════════════════════════════════════

-- MG (Mailgun — Email)
INSERT INTO lcs.adapter_registry (
  adapter_type, adapter_name, channel, direction, description,
  domain_rotation_config,
  health_status, daily_cap, sent_today,
  bounce_rate_24h, complaint_rate_24h,
  auto_pause_rules, is_active
) VALUES (
  'MG', 'Mailgun Email Adapter', 'MG', 'outbound',
  'Primary email delivery via Mailgun. Domain rotation across cold outreach domains. Strict separation from Google Workspace.',
  '{
    "domains": [],
    "rotation_strategy": "round_robin",
    "daily_cap_per_domain": 150
  }'::jsonb,
  'HEALTHY', 1500, 0,
  0.0000, 0.0000,
  '{
    "max_bounce_rate": 0.05,
    "max_complaint_rate": 0.001,
    "daily_cap_pause": true
  }'::jsonb,
  true
) ON CONFLICT (adapter_type) DO NOTHING;

-- NOTE: Actual sending domains are a deployment secret.
-- Operator populates via UPDATE after deployment:
-- UPDATE lcs.adapter_registry
-- SET domain_rotation_config = jsonb_set(domain_rotation_config, '{domains}', '["d1.example.com","d2.example.com"]')
-- WHERE adapter_type = 'MG';

-- HR (HeyReach — LinkedIn)
INSERT INTO lcs.adapter_registry (
  adapter_type, adapter_name, channel, direction, description,
  domain_rotation_config,
  health_status, daily_cap, sent_today,
  bounce_rate_24h, complaint_rate_24h,
  auto_pause_rules, is_active
) VALUES (
  'HR', 'HeyReach LinkedIn Adapter', 'HR', 'outbound',
  'LinkedIn outreach via HeyReach API. Connection requests and InMail. Subject to LinkedIn daily limits.',
  NULL,
  'HEALTHY', 100, 0,
  0.0000, 0.0000,
  '{
    "max_bounce_rate": 0.10,
    "max_complaint_rate": 0.005,
    "daily_cap_pause": true
  }'::jsonb,
  true
) ON CONFLICT (adapter_type) DO NOTHING;

-- SH (Sales Handoff — Internal)
INSERT INTO lcs.adapter_registry (
  adapter_type, adapter_name, channel, direction, description,
  domain_rotation_config,
  health_status, daily_cap, sent_today,
  bounce_rate_24h, complaint_rate_24h,
  auto_pause_rules, is_active
) VALUES (
  'SH', 'Sales Handoff Adapter', 'SH', 'outbound',
  'Internal handoff to sales process. Logs CET event but does not send external message. Triggers Calendly or CRM action.',
  NULL,
  'HEALTHY', NULL, 0,
  0.0000, 0.0000,
  NULL,
  true
) ON CONFLICT (adapter_type) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- Part B — Signal Registry (9 signals)
-- ═══════════════════════════════════════════════════════════════

-- RENEWAL_PROXIMITY — DOL sub-hub: plan renewal approaching
INSERT INTO lcs.signal_registry (
  signal_set_hash, signal_name, lifecycle_phase, signal_category,
  description, freshness_window, validity_threshold, is_active
) VALUES (
  'SIG-RENEWAL-PROXIMITY-V1',
  'Renewal Proximity Signal',
  'OUTREACH',
  'RENEWAL_PROXIMITY',
  'Fires when a company renewal date is within the outreach start window (renewal_month - 5 months). Source: dol.pressure_signals with signal_type=renewal_proximity.',
  '90 days'::interval,
  0.50,
  true
) ON CONFLICT (signal_set_hash) DO NOTHING;

-- PLAN_CHANGE — DOL sub-hub: broker change or cost increase detected
INSERT INTO lcs.signal_registry (
  signal_set_hash, signal_name, lifecycle_phase, signal_category,
  description, freshness_window, validity_threshold, is_active
) VALUES (
  'SIG-PLAN-CHANGE-V1',
  'Plan Change Signal',
  'OUTREACH',
  'PLAN_CHANGE',
  'Fires when DOL filing shows broker change, cost increase, or carrier switch between filing years. Source: dol.pressure_signals with signal_type=cost_increase or broker_change.',
  '180 days'::interval,
  0.60,
  true
) ON CONFLICT (signal_set_hash) DO NOTHING;

-- GROWTH_SIGNAL — People sub-hub: executive movement or slot vacancy
INSERT INTO lcs.signal_registry (
  signal_set_hash, signal_name, lifecycle_phase, signal_category,
  description, freshness_window, validity_threshold, is_active
) VALUES (
  'SIG-GROWTH-SIGNAL-V1',
  'Growth / Executive Movement Signal',
  'OUTREACH',
  'GROWTH_SIGNAL',
  'Fires when People hub detects executive movement, slot vacancy, or organizational reconfiguration. Source: people.pressure_signals.',
  '60 days'::interval,
  0.50,
  true
) ON CONFLICT (signal_set_hash) DO NOTHING;

-- ENGAGEMENT_SIGNAL — CET-derived: open/click/reply detected
INSERT INTO lcs.signal_registry (
  signal_set_hash, signal_name, lifecycle_phase, signal_category,
  description, freshness_window, validity_threshold, is_active
) VALUES (
  'SIG-ENGAGEMENT-V1',
  'Engagement Signal',
  'OUTREACH',
  'ENGAGEMENT_SIGNAL',
  'Fires when Mailgun webhook reports open, click, or reply on a previously sent message. Source: CET webhook events.',
  '14 days'::interval,
  0.40,
  true
) ON CONFLICT (signal_set_hash) DO NOTHING;

-- BLOG_TRIGGER — Blog sub-hub: news mention or content signal
INSERT INTO lcs.signal_registry (
  signal_set_hash, signal_name, lifecycle_phase, signal_category,
  description, freshness_window, validity_threshold, is_active
) VALUES (
  'SIG-BLOG-TRIGGER-V1',
  'Blog / News Trigger Signal',
  'OUTREACH',
  'BLOG_TRIGGER',
  'Fires when Blog hub detects funding announcement, news mention, or growth indicator. Source: blog.pressure_signals. Trust cap: max Band 1 alone.',
  '30 days'::interval,
  0.30,
  true
) ON CONFLICT (signal_set_hash) DO NOTHING;

-- SITEMAP_CHANGE — Sitemap sub-hub: careers page or new pages detected
INSERT INTO lcs.signal_registry (
  signal_set_hash, signal_name, lifecycle_phase, signal_category,
  description, freshness_window, validity_threshold, is_active
) VALUES (
  'SIG-SITEMAP-CHANGE-V1',
  'Sitemap Change Signal',
  'OUTREACH',
  'SITEMAP_CHANGE',
  'Fires when company_source_urls detects new careers page, leadership page, or significant page additions. Amplifier only.',
  '60 days'::interval,
  0.30,
  true
) ON CONFLICT (signal_set_hash) DO NOTHING;

-- MEETING_BOOKED — Sales phase: Calendly meeting confirmed
INSERT INTO lcs.signal_registry (
  signal_set_hash, signal_name, lifecycle_phase, signal_category,
  description, freshness_window, validity_threshold, is_active
) VALUES (
  'SIG-MEETING-BOOKED-V1',
  'Meeting Booked Signal',
  'SALES',
  'MEETING_BOOKED',
  'Fires when Calendly webhook confirms a meeting booking. Transitions company from OUTREACH to SALES phase.',
  '7 days'::interval,
  0.90,
  true
) ON CONFLICT (signal_set_hash) DO NOTHING;

-- REPLY_RECEIVED — Outreach phase: email reply detected
INSERT INTO lcs.signal_registry (
  signal_set_hash, signal_name, lifecycle_phase, signal_category,
  description, freshness_window, validity_threshold, is_active
) VALUES (
  'SIG-REPLY-RECEIVED-V1',
  'Reply Received Signal',
  'OUTREACH',
  'REPLY_RECEIVED',
  'Fires when Mailgun webhook detects an email reply. May trigger meeting booking sequence or sales handoff.',
  '7 days'::interval,
  0.80,
  true
) ON CONFLICT (signal_set_hash) DO NOTHING;

-- MANUAL_TRIGGER — Any phase: human-initiated override
INSERT INTO lcs.signal_registry (
  signal_set_hash, signal_name, lifecycle_phase, signal_category,
  description, freshness_window, validity_threshold, is_active
) VALUES (
  'SIG-MANUAL-TRIGGER-V1',
  'Manual Trigger Signal',
  'OUTREACH',
  'MANUAL_TRIGGER',
  'Human-initiated signal via admin interface or direct queue insert. Bypasses automated signal detection. lifecycle_phase set per invocation.',
  '1 day'::interval,
  1.00,
  true
) ON CONFLICT (signal_set_hash) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- Part C — Frame Registry (11 frames)
-- ═══════════════════════════════════════════════════════════════

-- ═══ OUTREACH PHASE — HAMMER SEQUENCE (Tier 1-3) ══════════

-- Hammer Step 1: DOL-personalized intro
INSERT INTO lcs.frame_registry (
  frame_id, frame_name, lifecycle_phase, frame_type, tier,
  required_fields, fallback_frame, channel, step_in_sequence,
  description, is_active
) VALUES (
  'OUT-HAMMER-01', 'Outreach Hammer Step 1 — DOL Intro', 'OUTREACH', 'HAMMER', 3,
  '["ceo_name", "ceo_email", "renewal_month", "carrier_name"]'::jsonb,
  'OUT-HAMMER-01-LITE',
  'MG', 1,
  'First touch: personalized with DOL filing data (carrier, renewal timing). Requires CEO name+email and DOL data (tier 3+).',
  true
) ON CONFLICT (frame_id) DO NOTHING;

-- Hammer Step 1 LITE: fallback without DOL
INSERT INTO lcs.frame_registry (
  frame_id, frame_name, lifecycle_phase, frame_type, tier,
  required_fields, fallback_frame, channel, step_in_sequence,
  description, is_active
) VALUES (
  'OUT-HAMMER-01-LITE', 'Outreach Hammer Step 1 — Lite', 'OUTREACH', 'HAMMER', 4,
  '["ceo_name", "ceo_email"]'::jsonb,
  NULL,
  'MG', 1,
  'Fallback first touch: personalized with name only (no DOL). Tier 4 minimum.',
  true
) ON CONFLICT (frame_id) DO NOTHING;

-- Hammer Step 2: Follow-up with blog/sitemap context
INSERT INTO lcs.frame_registry (
  frame_id, frame_name, lifecycle_phase, frame_type, tier,
  required_fields, fallback_frame, channel, step_in_sequence,
  description, is_active
) VALUES (
  'OUT-HAMMER-02', 'Outreach Hammer Step 2 — Context Follow-up', 'OUTREACH', 'HAMMER', 2,
  '["ceo_name", "ceo_email", "renewal_month", "blog_summary"]'::jsonb,
  'OUT-HAMMER-02-LITE',
  'MG', 2,
  'Second touch: references blog/news context alongside DOL data. Requires tier 2+.',
  true
) ON CONFLICT (frame_id) DO NOTHING;

-- Hammer Step 2 LITE: follow-up without blog
INSERT INTO lcs.frame_registry (
  frame_id, frame_name, lifecycle_phase, frame_type, tier,
  required_fields, fallback_frame, channel, step_in_sequence,
  description, is_active
) VALUES (
  'OUT-HAMMER-02-LITE', 'Outreach Hammer Step 2 — Lite', 'OUTREACH', 'HAMMER', 3,
  '["ceo_name", "ceo_email", "renewal_month"]'::jsonb,
  NULL,
  'MG', 2,
  'Fallback second touch: DOL-only follow-up without blog context.',
  true
) ON CONFLICT (frame_id) DO NOTHING;

-- Hammer Step 3: LinkedIn connection request
INSERT INTO lcs.frame_registry (
  frame_id, frame_name, lifecycle_phase, frame_type, tier,
  required_fields, fallback_frame, channel, step_in_sequence,
  description, is_active
) VALUES (
  'OUT-HAMMER-03-LI', 'Outreach Hammer Step 3 — LinkedIn', 'OUTREACH', 'HAMMER', 4,
  '["ceo_name", "ceo_linkedin_url"]'::jsonb,
  NULL,
  'HR', 3,
  'LinkedIn connection request via HeyReach. Requires CEO LinkedIn URL. Channel: HR.',
  true
) ON CONFLICT (frame_id) DO NOTHING;

-- Hammer Step 4: Final email push
INSERT INTO lcs.frame_registry (
  frame_id, frame_name, lifecycle_phase, frame_type, tier,
  required_fields, fallback_frame, channel, step_in_sequence,
  description, is_active
) VALUES (
  'OUT-HAMMER-04', 'Outreach Hammer Step 4 — Final Push', 'OUTREACH', 'HAMMER', 4,
  '["ceo_name", "ceo_email"]'::jsonb,
  NULL,
  'MG', 4,
  'Final email touch before cooldown. Minimal data requirement.',
  true
) ON CONFLICT (frame_id) DO NOTHING;

-- ═══ OUTREACH PHASE — POND (Tier 4-5) ═══════════════════════

INSERT INTO lcs.frame_registry (
  frame_id, frame_name, lifecycle_phase, frame_type, tier,
  required_fields, fallback_frame, channel, step_in_sequence,
  description, is_active
) VALUES (
  'OUT-POND-01', 'Outreach Pond — Educational Touch', 'OUTREACH', 'POND', 5,
  '[]'::jsonb,
  NULL,
  'MG', NULL,
  'Light educational content for companies in the pond (minimal or no intelligence). No personalization required. Sent to company-level addresses.',
  true
) ON CONFLICT (frame_id) DO NOTHING;

-- ═══ OUTREACH PHASE — NEWSLETTER (All Tiers) ════════════════

INSERT INTO lcs.frame_registry (
  frame_id, frame_name, lifecycle_phase, frame_type, tier,
  required_fields, fallback_frame, channel, step_in_sequence,
  description, is_active
) VALUES (
  'OUT-NEWSLETTER-01', 'Outreach Newsletter — Monthly', 'OUTREACH', 'NEWSLETTER', 5,
  '[]'::jsonb,
  NULL,
  'MG', NULL,
  'Monthly newsletter to all OUTREACH companies. No intelligence requirement. Lane: NEWSLETTER.',
  true
) ON CONFLICT (frame_id) DO NOTHING;

-- ═══ SALES PHASE — MEETING FOLLOWUP ═════════════════════════

INSERT INTO lcs.frame_registry (
  frame_id, frame_name, lifecycle_phase, frame_type, tier,
  required_fields, fallback_frame, channel, step_in_sequence,
  description, is_active
) VALUES (
  'SAL-MEETING-01', 'Sales Meeting Follow-up', 'SALES', 'MEETING_FOLLOWUP', 3,
  '["ceo_name", "ceo_email", "renewal_month"]'::jsonb,
  NULL,
  'MG', 1,
  'Post-meeting follow-up email with proposal summary. Triggered by MEETING_BOOKED signal.',
  true
) ON CONFLICT (frame_id) DO NOTHING;

-- ═══ CLIENT PHASE — EMPLOYEE COMMUNICATION ══════════════════

INSERT INTO lcs.frame_registry (
  frame_id, frame_name, lifecycle_phase, frame_type, tier,
  required_fields, fallback_frame, channel, step_in_sequence,
  description, is_active
) VALUES (
  'CLI-EMPLOYEE-01', 'Client Employee Communication', 'CLIENT', 'EMPLOYEE_COMM', 3,
  '["ceo_name"]'::jsonb,
  NULL,
  'MG', 1,
  'White-labeled employee benefits communication sent on behalf of client company. HR-facing.',
  true
) ON CONFLICT (frame_id) DO NOTHING;

COMMIT;
