# Insurance Informatics Website
## B2B performance page for the named discipline at `insuranceinformatics.com`
### Status: BUILD
### Medium: process
### Business: svg-agency

---

## Purpose

This is the current campaign page for the Insurance Informatics website layer. It applies the FCE-007 website performance constants to the CF Pages surface, keeps the voice direct, and gives the visitor one clear next step.

The page speaks in the Insurance Informatics voice spec:

- Here’s how it works.
- The math is simple.
- Premiums don’t equal cost.
- You can’t stop claims.
- I encourage you to compete it.

The page exists to do three things:

1. Name the category first.
2. Explain the mechanism without fluff.
3. Send every qualified visitor to one booking CTA.

---

## Current CF Pages Structure

| Route | Purpose | Notes |
|---|---|---|
| `/` | Insurance Informatics home page | Primary route in content-pages |
| `/insurance-informatics` | Same home page | Explicit brand route |
| `/5500` | Legacy 5500 content | Preserved alias |

---

## 9-Slot Template

| Slot | Status | Asset / Content | Purpose |
|---|---|---|---|
| video | live | `f5290faa8da6e1d67410697ae2bd5c89` | "Insurance Informatics - The Pipeline Behind Your Next 100 Clients" |
| audio | documented empty | N/A | No audio asset is available yet; the ramp explicitly allows this slot to remain empty |
| slides | live | `/content/insurance-informatics/site-map.svg` | Site map and page hierarchy |
| report | live | Inline HTML in the worker config | Long-form website copy and FCE-007 constants |
| infographic | live | `/content/insurance-informatics/performance-pillars.svg` | Valuation / concentration / trend / liquidity |
| quiz | live | 3-question check | Reinforces the performance constants |
| flashcards | live | 4 cards | Voice phrases and positioning memory |
| mindmap | live | `/content/insurance-informatics/lead-flow.svg` | Traffic to booking flow |
| datatable | live | Conversion and SEO table | Working constants for the site |

---

## Website Copy

The homepage copy is intentionally direct.

- It starts with the category name: Insurance Informatics.
- It states the mechanism first, not the pitch.
- It keeps the CTA singular: Book 15 minutes.
- It tracks page and CTA events back to LCS Hub.

The structure of the report slot is:

1. Voice opening
2. FCE-007 constants table
3. Site behavior bullets
4. Competition line
5. Booking link

The audio slot is intentionally left empty until a real page asset exists.

---

## Tracking

Page load and CTA clicks send events to `https://lcs-hub.svg-outreach.workers.dev/page-event`.

Tracked event names:

- `page_loaded`
- `cta_clicked`

Tracked payload keys:

- `sovereign_company_id`
- `communication_id`
- `event_type`
- `lifecycle_phase`
- `page_step`
- `signal_set_hash`
- `payload`

---

## Acceptance Snapshot

- Website reflects the FCE-007 B2B performance constants.
- Voice spec is applied to the copy.
- The 9-slot template is instantiated.
- Conversion events flow to LCS Hub.
