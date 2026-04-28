# Insurance Informatics Explainer — REJECTED

## ⚠️ DO NOT DISTRIBUTE

This entry documents a rejected video render that is preserved in the library for audit purposes only. **The video content is contaminated with sales material and does not match the locked vendor operational explainer script.**

---

## Identity

| Field | Value |
|---|---|
| **Title** | Insurance Informatics Explainer (as rendered by NotebookLM) |
| **Slug** | insurance-informatics-explainer-rejected |
| **Notebook Name** | The Integration Multiplier: Proving Industrial Scale for Vendors |
| **CTB Position** | fleet / content / videos / rendered |
| **Status** | ARCHIVED (rejected — preserved for audit only) |
| **Authority** | Dave Barton |

### HEIR

| Field | Value |
|---|---|
| sovereign_ref | imo-creator |
| hub_id | svg-video-library |
| cc_layer | CC-03 |
| ctb_placement | leaf |

---

## Cloudflare Stream

| Field | Value |
|---|---|
| **Stream UID** | `38aabdfe2232690ee0edc37262db1807` |
| **Customer Subdomain** | `customer-1prkz5571edaq9k9.cloudflarestream.com` |
| **Thumbnail** | https://customer-1prkz5571edaq9k9.cloudflarestream.com/38aabdfe2232690ee0edc37262db1807/thumbnails/thumbnail.jpg |
| **Size** | 31.4 MB |
| **Uploaded** | 2026-04-15T11:xx UTC |
| **Disposition** | Retained in CF Stream. Not linked from any distribution page. Do not embed. |

---

## Source (what went wrong)

| Field | Value |
|---|---|
| **NotebookLM Notebook** | "The Integration Multiplier: Proving Industrial Scale for Vendors" |
| **NotebookLM URL** | https://notebooklm.google.com/notebook/32a0a69b-acb5-4fc6-83f7-e637e2dda04d |
| **Source Count** | **10 mixed sources** (the root cause) |
| **Sources observed in snapshot** | "130 years strong" document, "DATA SUBMISSION MANUAL - Maryland Health Care Commission," and 8 others. These sources were NOT the locked v1.0 vendor briefing script — they were a mix of reference material Dave had added to the notebook over time. |
| **Generation Method** | NotebookLM Video Overview (default format, no strict customization prompt) |

---

## Why it was rejected

Dave watched the rendered video and reported: "the 10% video is completely wrong." Investigation revealed:

1. **The video contained sales content that should not have been there** — four-step buyer funnel, fact finder references, Gate 1/2/3/4 language, prospect-facing pitch
2. **The video was generated from a multi-source notebook** (10 sources) — NotebookLM blended across all of them and synthesized a hybrid output that pulled in sales material from the older reference documents
3. **The locked v1.0 script was never the only source** — Dave had been iterating in the notebook for a while and accumulated reference material that contaminated the generation

The root cause was not the v1.0 script itself. The root cause was **notebook construction** — too many mixed sources allowed NotebookLM to drift toward the richer sales material. The fix was a new single-source notebook with a rewritten v2.0 script, strict Explainer format, and a strict customization prompt that forbids sales content. See `the-10-percent-with-orchestrator.md` for the replacement.

---

## Lessons learned (locked into the library doctrine)

From this failure, the following rules are now part of the video library doctrine:

1. **One video per notebook, one script per notebook.** Do not add reference material to a rendering notebook even if it feels related.
2. **Use the Explainer format for operational explainers, not Cinematic.** Cinematic tells stories; Explainer walks through mechanics.
3. **Provide an explicit customization prompt** that names what the video IS and what it IS NOT, with explicit forbidden-content rules.
4. **Verify NotebookLM's auto-generated source summary** before triggering generation. If the summary captures the intended framing, the video is likely to land. If the summary drifts, the script or notebook is contaminated and needs fixing before generation.

---

## Disposition

| Action | Status |
|---|---|
| Delete from CF Stream | **NOT TAKEN** — retained as learning artifact. CF Stream storage cost is negligible. If Dave decides later to delete, the UID is above. |
| Link from distribution page | **NEVER** |
| Reference in any vendor-facing communication | **NEVER** |
| Use as a counterexample in internal training | **ACCEPTABLE** — the contrast between this and the v2.0 Vendor Flow Explainer is instructive |

---

## State Log

| Timestamp | From State | To State | Notes |
|---|---|---|---|
| 2026-04-12 or earlier | (none) | NOTEBOOKLM_QUEUED | "The Integration Multiplier" notebook created with multiple reference sources |
| 2026-04-15T~11:00 UTC | NOTEBOOKLM_QUEUED | MP4_DOWNLOADED | Video Overview rendered, downloaded as `Insurance_Informatics.mp4` |
| 2026-04-15T~11:15 UTC | MP4_DOWNLOADED | STREAM_UPLOADED | Uploaded to CF Stream before review |
| 2026-04-15T~12:15 UTC | STREAM_UPLOADED | REJECTED | Dave reviewed and reported "the 10% video is completely wrong" |
| 2026-04-15T~12:30 UTC | REJECTED | ARCHIVED | Preserved in library as audit/learning artifact only |

---

## Document Control

| Field | Value |
|---|---|
| Created | 2026-04-15 |
| Last Modified | 2026-04-15 |
| Version | 0.1.0 |
| Status | ARCHIVED (rejected) |
| Authority | Dave Barton |
