# Video Library — Manifest

The canonical index of every rendered video asset in the SVG content system. One row per video. Keep sorted by most recent at the top.

See `fleet/content/videos/README.md` for the library doctrine (pipeline, naming, states, rules).

---

## Live Videos

| Title | Audience | Length | CF Stream UID | Status | Entry File |
|---|---|---|---|---|---|
| **The 10% with the Orchestrator — Vendor Operational Explainer** | vendor-ops (pre-cert, drug flag, Layer 2 execution shops) | 3:50 | `f287ac78c267deecf55c653841800456` | STREAM_UPLOADED | [rendered/the-10-percent-with-orchestrator.md](rendered/the-10-percent-with-orchestrator.md) |

---

## Archived / Rejected

Videos retained for audit but NOT for distribution. Usually because content drifted from the locked script, or the underlying script was retired.

| Title | Audience | Length | CF Stream UID | Status | Reason | Entry File |
|---|---|---|---|---|---|---|
| Insurance Informatics Explainer (The Integration Multiplier notebook) | vendor-bd (intended, but contaminated) | ~3:00 | `38aabdfe2232690ee0edc37262db1807` | ARCHIVED | NotebookLM Video Overview drifted into sales content (four-step buyer funnel, fact finder, prospect-facing language) because the source notebook had 10 mixed sources including older Gate video material. Retained as a learning artifact only — **do not distribute**. | [rendered/insurance-informatics-explainer-REJECTED.md](rendered/insurance-informatics-explainer-REJECTED.md) |

---

## Staged — Downloaded but not yet uploaded

MP4s sitting on Dave's local Downloads folder from earlier NotebookLM renders. Each needs its own cataloging pass: review for script-alignment, upload to CF Stream if still useful, create entry file, move to Live or Archived.

| Filename | Size | Date | Likely Topic | Status |
|---|---|---|---|---|
| `The_10-85_Process__Engineering_the_Hub_and_Spoke.mp4` | 55 MB | 2026-04-12 | Hub-and-spoke intro, pre-architecture-lock | PRE_ARCHITECTURE_LOCK |
| `Gate_4_—_The_Math_Will_Speak.mp4` | 21 MB | 2026-04-07 | Gate 4 prospect video | PRE_ARCHITECTURE_LOCK |
| `Your_New_Operating_System.mp4` | 30 MB | 2026-04-07 | Operating system explainer | PRE_ARCHITECTURE_LOCK |
| `Architecting_the_Bifurcated_Health_Plan.mp4` | 60 MB | 2026-04-07 | Bifurcated plan architecture | PRE_ARCHITECTURE_LOCK |
| `Re-Architecting_the_Benefits_Machine.mp4` | 65 MB | 2026-04-06 | Benefits machine re-architecture | PRE_ARCHITECTURE_LOCK |

**Note:** all five of these were generated BEFORE today's architecture lock (Pattern of Twos, Layer 1/2, Canonical Mailboxes, Fracture frame, Teacher Frame, 10/90 Prospect Fractal). They may or may not need re-rendering. Review needed. Do not catalog as Live until reviewed against current doctrine.

---

## Document Control

| Field | Value |
|---|---|
| Created | 2026-04-15 |
| Last Modified | 2026-04-15 |
| Library Version | 0.1.0 |
| Live Videos | 1 |
| Archived | 1 |
| Staged | 5 |
| Authority | Dave Barton |
