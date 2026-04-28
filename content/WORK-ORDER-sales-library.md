# Work Order — Sales Content Library (Cross-Source Dewey Index)

## Role
MECHANIC

## Task
Build a cross-source content library that uses the existing LBB Dewey Decimal taxonomy to index sales content across all three storage backends: LBB, R2, and the repo. The library document reads the shared taxonomy and shows what exists under each subject across all sources.

## Read First (in order)
1. `AGENTS.md` — mechanic operating manual
2. `law/UNIFIED_TEMPLATE.md` — 14-section template (library document MUST follow this exactly)
3. `law/doctrine/PROCESS_FILL_INSTRUCTIONS.md` — fill rules per section for medium=process
4. `law/VOICE-LIBRARY.md` — voice constants, core frames, one-liners
5. `factory/agents/up/dyno-runs/claims-process/CLAIMS-PROCESS-MANUAL.md` — Dyno-validated process
6. `fleet/content/video-10-85-claims-engine.md` — 10-85 vendor operating spec
7. `fleet/content/tpa-evaluation-framework.md` — TPA evaluation framework
8. `fleet/content/svg-operating-model.md` — operating model

## Context

LBB already has the Dewey Decimal taxonomy. The `lbb_subjects` table is the single source of truth for subject IDs. Every piece of sales content — no matter which backend it lives in — gets classified with a subject_id from that tree. One taxonomy, three storage backends, one index.

Three sources, each using the same subject IDs:
- **LBB** — native (already uses subject_id on every record)
- **R2** — indexed through LBB (each slide has a record in LBB that points to the R2 path via source_url)
- **Repo** — indexed through a manifest file that maps repo paths to subject IDs

Existing svg-sales state:
- `svg-sales` branch exists under `svg-agency`
- One existing leaf: `svg-sales-proc`
- 226 R2 slide records at `r2://svg-files/sales-materials/pages/*` currently tagged to `svg-sales` (need retagging to finer-grained leaves)
- 16 distinct presentation decks in R2

## Phase 1 — Extend the Dewey Tree

Check the lbb_subjects schema first:

```
cd "/c/Users/CUSTOM PC/Desktop/Cursor Builds/imo-creator-v2/workers/lcs-hub"
npx wrangler d1 execute lbb --remote --command "SELECT sql FROM sqlite_master WHERE name='lbb_subjects'"
```

Add these 7 new leaves under `svg-sales` with INSERT OR IGNORE. Use the exact columns from the schema.

| subject_id | name | ctb_level | parent_id |
|-----------|------|-----------|-----------|
| svg-sales-frames | core-frames | leaf | svg-sales |
| svg-sales-process-ed | process-education | leaf | svg-sales |
| svg-sales-gates | sales-gates | leaf | svg-sales |
| svg-sales-voice | voice-assets | leaf | svg-sales |
| svg-sales-visual | visual-assets | leaf | svg-sales |
| svg-sales-domain | domain-education | leaf | svg-sales |
| svg-sales-formats | output-formats | leaf | svg-sales |

## Phase 2 — Retag R2 Records to the Right Leaves

The 226 R2 slide records currently sit under `svg-sales`. They need to move to `svg-sales-visual` because they are visual assets.

```
UPDATE lbb_records
SET subject_id='svg-sales-visual', updated_at=datetime('now')
WHERE source_url LIKE 'r2://svg-files/sales-materials/pages/%'
  AND subject_id='svg-sales'
```

Verify: `SELECT COUNT(*) FROM lbb_records WHERE subject_id='svg-sales-visual'` should return ~226.

## Phase 3 — Ingest Core Frames from VOICE-LIBRARY.md

Check lbb_records schema:

```
npx wrangler d1 execute lbb --remote --command "SELECT sql FROM sqlite_master WHERE name='lbb_records'"
```

Insert 6 core frame records under `svg-sales-frames`. Pull content VERBATIM from `law/VOICE-LIBRARY.md`. Do NOT invent text.

Each record needs all required fields: fresh UUID for record_id, sovereign_ref='imo-creator', hub_id='lbb', cc_layer='CC-03', subject_id='svg-sales-frames', ctb_placement='leaf', title, content (verbatim from VOICE-LIBRARY), content_hash, content_format='text', source_url='law/VOICE-LIBRARY.md', source_type='document', source_name='VOICE-LIBRARY', fetched_by='codex-mechanic', orbt_mode='BUILD', strike_count=0, tags (JSON array), found_at, created_at, updated_at.

Frames to ingest:
1. `Core Frame — You Cannot Stop The Claim` — from VOICE-LIBRARY section "The Core Frame"
2. `Core Frame — Convenience Store vs Grocery Store` — from VOICE-LIBRARY section "The Convenience Store Metaphor"
3. `Core Frame — BUCA One Decision vs Four Decisions` — from VOICE-LIBRARY section "Fully Insured vs Self-Insured — The Real Comparison"
4. `Core Frame — Process Is The Moat` — from VOICE-LIBRARY section "The Process Is the Moat"
5. `Core Frame — Hub And Spoke Many To One` — from `fleet/content/svg-operating-model.md` (Many-to-One section)
6. `Core Frame — Two Loops Service And Financial` — from `fleet/content/video-10-85-claims-engine.md` (Financial Close section)

## Phase 4 — Ingest Process-Ed Pointers

Insert 4 pointer records under `svg-sales-process-ed`. Content field is a 2-3 sentence summary. source_url is the repo path.

1. `10-85 Vendor Operating Spec` → `fleet/content/video-10-85-claims-engine.md`
2. `Claims Process Manual (Dyno-validated)` → `factory/agents/up/dyno-runs/claims-process/CLAIMS-PROCESS-MANUAL.md`
3. `TPA Evaluation Framework` → `fleet/content/tpa-evaluation-framework.md`
4. `SVG Operating Model` → `fleet/content/svg-operating-model.md`

## Phase 5 — Ingest Voice Assets

Insert 1 pointer record under `svg-sales-voice` pointing to `law/VOICE-LIBRARY.md`. Content field lists the 20 one-liners by number.

## Phase 6 — Create the Repo Manifest

Create `fleet/content/repo-subject-manifest.yaml` that maps repo file paths to subject IDs using the shared Dewey taxonomy. This is how the repo source gets indexed with the same vocabulary as LBB and R2.

Format:
```yaml
# Repo Subject Manifest — maps repo files to LBB Dewey subject IDs
version: 1.0.0
taxonomy: lbb_subjects (single source of truth)
mappings:
  - path: law/VOICE-LIBRARY.md
    subject_ids: [svg-sales-voice, svg-sales-frames]
  - path: factory/agents/up/dyno-runs/claims-process/CLAIMS-PROCESS-MANUAL.md
    subject_ids: [svg-sales-process-ed]
  - path: fleet/content/video-10-85-claims-engine.md
    subject_ids: [svg-sales-process-ed, svg-sales-frames]
  - path: fleet/content/tpa-evaluation-framework.md
    subject_ids: [svg-sales-process-ed]
  - path: fleet/content/svg-operating-model.md
    subject_ids: [svg-sales-process-ed, svg-sales-frames]
```

## Phase 7 — Build the Library Document

Create `fleet/content/SALES-CONTENT-LIBRARY.md` following `law/UNIFIED_TEMPLATE.md` exactly. All 14 sections, 3 clusters, full HEIR.

**Top matter:**
- Title: `SVG Sales Content Library`
- One-sentence: `The cross-source Dewey index over LBB, R2, and repo — ask a topic, get every resource across all three sources.`
- Status: OPERATE
- Medium: process
- Business: svg-agency

**Section 1 (IDENTITY):** Full identity table + 8-field HEIR.
- ID: PROC-SALES-LIB
- CTB Position: branch -> fleet/content -> SALES-CONTENT-LIBRARY
- Authority: inherited (Dave Barton + VOICE-LIBRARY.md)
- HEIR: sovereign_ref=svg-agency, hub_id=sales-content-library, ctb_placement=branch, imo_topology=middle, cc_layer=CC-02 hub, services=[LBB worker, R2 bucket svg-files, repo filesystem], secrets_provider=doppler, acceptance_criteria=Cross-source query returns resources from all three backends using shared Dewey taxonomy

**Section 2 (PURPOSE):** 2-3 sentences only. Template rule. Say what breaks without it (every message build restarts from scratch and misses half the available assets), name the downstream consumer (Dave building any sales message).

**Section 3 (RESOURCES):**
- Dependencies: LBB worker (query endpoint), R2 bucket svg-files, repo filesystem, `lbb_subjects` table (single source of truth for taxonomy)
- Downstream consumers: Dave's message builds (LinkedIn, email, video scripts, meeting prep), Gate 1-4 video builds
- Tools: LBB worker API (`/query`, `/records`), R2 access via sandbox, git for repo files
- Secrets: LBB_API_KEY from Doppler imo-creator/dev

**Section 4 (IMO):**
- Two-question intake: (1) What triggers this? — A message needs to be built (video, email, LinkedIn, meeting). (2) How do we get it? — Query the library by topic.
- Input: Topic string (e.g., `self-insured`, `10-85`, `BUCA`, `stop-loss`)
- Middle: Step table:
  1. Topic → find matching subject_ids in `lbb_subjects`
  2. Subject IDs → query LBB for records
  3. Query returns records with source_url pointing to each backend
  4. Assemble bundle (LBB records + R2 paths + repo paths)
  5. Pass bundle to message builder
- Output: Resource bundle (cross-source list of everything on the topic)
- Circle: Ingested learnings from new sessions feed back as new LBB records under the right subject leaf

**Section 5 (DATA SCHEMA) — THE CORE SECTION:**

READ Access table:

| Source | Backend | What It Provides | Join Key |
|--------|---------|-----------------|----------|
| LBB D1 lbb_records | LBB | All indexed content metadata + text records | subject_id |
| LBB D1 lbb_subjects | LBB | Dewey taxonomy (single source of truth) | subject_id |
| R2 svg-files/sales-materials/pages | R2 | 226 slide PNGs across 16 decks | source_url |
| Repo fleet/content/* | Repo | Sales content docs (10-85, TPA eval, operating model) | file path |
| Repo factory/agents/up/dyno-runs/claims-process/* | Repo | Claims process manual | file path |
| Repo law/VOICE-LIBRARY.md | Repo | Voice constants and one-liners | file path |
| Repo fleet/content/repo-subject-manifest.yaml | Repo | Repo-to-subject mapping | path |

WRITE Access table:

| Target | What It Writes | When |
|--------|---------------|------|
| lbb_records | New content ingests, session learnings | On message completion or new content creation |
| lbb_subjects | New leaves when a new topic emerges | On topic expansion (human approval) |
| fleet/content/repo-subject-manifest.yaml | New repo file mappings | When a new repo file is created |

**Subject Tree subsection** — document all 8 leaves under svg-sales:

| Subject ID | Name | What Lives Here | Where It Lives |
|-----------|------|----------------|----------------|
| svg-sales-frames | core-frames | Reframes, metaphors, positioning anchors | LBB records + repo (VOICE-LIBRARY, operating-model) |
| svg-sales-process-ed | process-education | How the machine works | LBB pointers + repo (10-85, TPA, CLAIMS-MANUAL, operating-model) |
| svg-sales-gates | sales-gates | Gate 1-4 funnel scripts | LBB (to be built) |
| svg-sales-voice | voice-assets | One-liners, qualifying language, DISC | LBB pointer + repo (VOICE-LIBRARY) |
| svg-sales-visual | visual-assets | Slide decks | R2 (226 slides) + LBB index records |
| svg-sales-domain | domain-education | Insurance industry context | LBB (to be built) |
| svg-sales-formats | output-formats | Message assembly templates | LBB (to be built) |
| svg-sales-proc | sales-processes | Existing sales process docs | LBB (pre-existing) |

Join Chain:
```
Topic query
  → lbb_subjects (find matching subject_ids)
    → lbb_records (find records under those subjects)
      → source_url (LBB / R2 path / repo path)
        → fetch content from the right backend
          → assembled bundle
```

Forbidden Paths:
- Do not duplicate content into this library document (it points, it does not store)
- Do not bypass the lbb_subjects taxonomy (no ad-hoc tagging)
- Do not classify R2 content without an LBB record (the LBB record is the index layer)
- Do not create new subject leaves without human approval

**Section 6 (DMJ):**
- Define: topic query, subject_id, record, source_url, bundle
- Map: topic → subject_ids → records → source_urls → bundle
- Join: shared lbb_subjects taxonomy links all three backends

**Section 7 (CONSTANTS AND VARIABLES):**
- Constants: the 7+1 subject leaves, the Dewey taxonomy (lbb_subjects), the query protocol, source_url as backend router
- Variables: the specific topic queried, records returned, bundle assembled, message produced

**Section 8 (STOP CONDITIONS):**
- Topic not found → fallback to full-text search on content field
- No records returned → log gap, ingest missing content
- Ambiguous query → escalate to Dave
- Strike 3 on missing topics → propose new subject leaf for human approval

**Section 9 (VERIFICATION):** Executable proof — 3-5 sample queries with expected counts:
```
1. SELECT COUNT(*) FROM lbb_records WHERE subject_id='svg-sales-visual' → expected ~226
2. SELECT COUNT(*) FROM lbb_records WHERE subject_id='svg-sales-frames' → expected 6
3. SELECT COUNT(*) FROM lbb_records WHERE subject_id='svg-sales-process-ed' → expected 4
4. SELECT COUNT(*) FROM lbb_subjects WHERE parent_id='svg-sales' → expected 8
```

Three Primitives check: Thing (does each subject leaf exist?), Flow (does query reach all three backends?), Change (does bundle assemble correctly?).

**Sections 10-14:** Fill per template. Mark analytics/sigma/trace/logbook/registry as "pending first use" where appropriate. Session log entry for today: `2026-04-12 — Initial build, 7 new leaves, 226 R2 retags, 6 frames, 4 process-ed pointers`.

**Document Control:** Created 2026-04-12, v1.0.0, template v1.0.0, medium=process, derived from VOICE-LIBRARY v1.1 + CLAIMS-PROCESS-MANUAL + svg-operating-model, US Validated=pending.

## Phase 8 — Verify

Run these queries and capture results:

```sql
SELECT subject_id, COUNT(*) FROM lbb_records WHERE subject_id LIKE 'svg-sales%' GROUP BY subject_id ORDER BY subject_id;
SELECT subject_id, name, ctb_level, parent_id FROM lbb_subjects WHERE parent_id='svg-sales' ORDER BY subject_id;
```

Expected:
- 8 leaves under svg-sales (7 new + svg-sales-proc)
- svg-sales-visual: ~226 records
- svg-sales-frames: 6 records
- svg-sales-process-ed: 4 records
- svg-sales-voice: 1 record

## Acceptance Criteria

- [ ] `fleet/content/SALES-CONTENT-LIBRARY.md` exists and follows UNIFIED_TEMPLATE exactly (14 sections, 3 clusters, full HEIR, correct top matter)
- [ ] 7 new subject leaves in `lbb_subjects`
- [ ] 226 R2 slides retagged to `svg-sales-visual`
- [ ] 6 core frame records in `svg-sales-frames` with content verbatim from VOICE-LIBRARY.md
- [ ] 4 process-ed pointers in `svg-sales-process-ed`
- [ ] 1 voice-assets pointer in `svg-sales-voice`
- [ ] `fleet/content/repo-subject-manifest.yaml` created and maps all listed repo files to subject IDs
- [ ] All verification queries return expected counts
- [ ] Return a summary table showing work done

## Constraints

- Do NOT modify any of the nine locked constants
- Do NOT invent content — pull verbatim from VOICE-LIBRARY.md and the process docs
- Do NOT delete any existing LBB records or subjects
- Do NOT duplicate R2 content into the library document (the doc points, LBB records are the index)
- Follow the UNIFIED_TEMPLATE exactly — this document will be audited against the template immediately after build
- Every new LBB record needs a fresh UUID, complete HEIR fields, datetime('now') timestamps
- Report P=1 (success) or P=0 (with specific blockers) at the end
- Return results as a concise summary table, not full SQL logs
