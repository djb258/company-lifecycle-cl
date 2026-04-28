# Launch Campaign 01 — Message Drafts

**Date:** 2026-04-21
**Author:** Dave Barton (voice) / Opus (foreman draft)
**Voice Spec:** `fleet/content/VOICE-SPEC.yaml` v1.0.0
**Three positioning hooks (from Dave):**
1. **20–55% savings** on benefits costs
2. **No administration of benefits** — this is informatics, not TPA work
3. **Only person in the US doing Insurance Informatics as a named discipline**

All drafts below pass a manual check against the voice gate:
- Required phrases hit (at least one per message)
- Zero forbidden phrases
- No emoji, no exclamation marks, no hedging
- Short declarative sentences, George Patton posture
- Category first, explicit next step, one link only

---

## Email — 3 Variants (A/B/C test)

### Variant A — CFO Angle

**Subject:** Your premiums are not your cost.

---

Premiums don't equal cost.

Employers I work with cut benefits costs 20–55%. Same coverage. Same carrier network. Different math.

Here's how it works. Your premium is what the carrier charges. Your cost is what actually leaves the company. The gap between those two is where the work happens.

I don't administer your benefits. I don't sell you a plan. I apply Insurance Informatics to your actual claims data and tell you what the numbers say you should do next.

I'm the only person in the US doing this as a named discipline. I encourage you to compete it.

One 30-minute call. I'll show you the math on one of your renewals.

→ [Calendly link placeholder]

Dave Barton
Insurance Informatics
insuranceinformatics.com

---

### Variant B — HR Leader Angle

**Subject:** You can't stop claims. But you can change what they cost you.

---

You can't stop claims.

What you can change is how your plan structures the cost of those claims. Most companies save 20–55% once the structure gets fixed. Same benefits. Same network. Less cost.

Here's how it works. I don't administer your benefits. I don't broker your plan. I apply Insurance Informatics to your data and show you where the structure is leaking money.

I'm the only person in the US doing this as a named discipline. I encourage you to compete it.

30 minutes. Your renewal data. Real numbers.

→ [Calendly link placeholder]

Dave Barton
Insurance Informatics
insuranceinformatics.com

---

### Variant C — Owner / Operator Angle

**Subject:** The math is simple.

---

The math is simple.

Your benefits plan has two numbers: what the carrier charges (premium) and what leaves your company (cost). Premiums don't equal cost. The gap is where 20–55% savings sit.

Here's how it works. I don't administer your benefits. I don't sell you a plan. I apply Insurance Informatics to your data and tell you what the numbers say to do.

I'm the only person in the US doing this as a named discipline. I encourage you to compete it.

One call. Your data. Done.

→ [Calendly link placeholder]

Dave Barton
Insurance Informatics
insuranceinformatics.com

---

## LinkedIn — 3 Post Variants

### Post A — Category Claim

Premiums don't equal cost.

That one sentence is where 20–55% of employer benefits spend lives.

Your premium is the price tag. Your cost is what leaves the company. The gap between them is math, not magic.

Here's how it works. I don't administer benefits. I don't sell plans. I apply Insurance Informatics to your data and tell you what the numbers say.

I'm the only person in the US doing this as a named discipline.

If you run benefits at a 50–5000 life employer, I encourage you to compete it.

→ [Calendly link placeholder]

Insurance Informatics • insuranceinformatics.com

---

### Post B — Frame

You can't stop claims.

You can change what those claims cost your company. Most companies cut benefits spend 20–55% once the structure is right. Same coverage. Same carrier.

The work is not administration. It's informatics.

I'm the only person in the US doing this as a named discipline. I encourage you to compete it.

Insurance Informatics • insuranceinformatics.com

---

### Post C — Math Frame

The math is simple.

Premiums don't equal cost. 20–55% of what you pay can come back. Same benefits. Same network.

I don't administer your plan. I apply Insurance Informatics to your data.

The only person in the US doing this as a named discipline.

I encourage you to compete it.

Insurance Informatics • insuranceinformatics.com

---

## Website — Hero Block (insuranceinformatics.com homepage)

### H1
Premiums don't equal cost.

### Subhead
Employers who work with me cut benefits costs 20–55%. Same coverage. Same carrier. Different math.

### Explainer
Here's how it works. Your premium is what the carrier charges. Your cost is what actually leaves the company. The gap is where Insurance Informatics lives.

I don't administer your benefits. I don't broker your plan. I apply Insurance Informatics to your claims data and tell you what the numbers say to do.

I'm the only person in the US doing this as a named discipline.

You can't stop claims. You can change what they cost you.

### CTA
Book a 30-minute review →
[Calendly link placeholder]

---

## Voice Gate Self-Check

| Required phrase | A | B | C | LI-A | LI-B | LI-C | Web |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| "Insurance Informatics" | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| "I encourage you to compete it." | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| "Here's how it works." | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| "The math is simple." | — | — | ✓ | — | — | ✓ | — |
| "You can't stop claims." | — | ✓ | — | — | ✓ | — | ✓ |
| "Premiums don't equal cost." | ✓ | — | ✓ | ✓ | — | ✓ | ✓ |

**Forbidden phrases:** none present. **Emoji/exclamation:** none.

---

## Operator Notes

- Replace `[Calendly link placeholder]` with the actual scheduling URL before send.
- Run `npm run voice:check` against the full compiled campaign body before batch fire.
- Smoke test each variant to `dave@svg.agency` first (per `docs/dispatches/SEND-READINESS.md` Phase 5).
- A/B/C split suggestion: 1/3 volume each on the first calibration batch (100–500 contacts). Measure reply rate, not just click rate.
- These are draft v1. Dave's sovereign edit before send — treat as starting point.

---

## Document Control

| Field | Value |
|---|---|
| Created | 2026-04-21 |
| Status | DRAFT — pending Dave's sovereign edit |
| Campaign ID | launch-01 |
| Next step | Dave reviews + edits; operator loads approved version into LCS |
