-- Migration 008: Insert catch-all OUTREACH frame for low-tier companies
-- Work Packet: wp-20260304-outreach-catchall-frame
-- Direction: FORWARD
-- Ensures tier 5 companies can match during CID compilation without CEO/DOL data

BEGIN;

INSERT INTO lcs.frame_registry (
    frame_id, frame_name, lifecycle_phase, frame_type, tier,
    required_fields, fallback_frame, channel, step_in_sequence,
    description, is_active,
    cid_compilation_rule, sid_template_id, mid_sequence_type,
    mid_delay_hours, mid_max_attempts
) VALUES (
    'OUT-GENERAL-V1',
    'Outreach General — Catch-All',
    'OUTREACH',
    'POND',
    5,
    '[]'::jsonb,
    NULL,
    'MG',
    1,
    'Catch-all outreach frame for companies with minimal intelligence (tier 5). No required fields. Uses generic company-level messaging. Fallback when no specialized frame matches.',
    true,
    'LITE',
    'TPL-GENERAL-OUTREACH-V1',
    'IMMEDIATE',
    0,
    3
);

COMMIT;
