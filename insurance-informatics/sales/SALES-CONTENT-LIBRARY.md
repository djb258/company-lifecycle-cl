# SVG Sales Content Library
## The cross-source Dewey index over LBB, R2, and repo - ask a topic, get every resource across all three sources.
### Status: OPERATE
### Medium: process
### Business: svg-agency

---

# IDENTITY (Thing - what this IS)

_Everything in this cluster answers: what exists? These are constants that don't change regardless of who reads this or when._

## 1. IDENTITY

| Field | Value |
|-------|-------|
| ID | PROC-SALES-LIB |
| Name | SVG Sales Content Library |
| Medium | process |
| Business Silo | svg-agency |
| CTB Position | branch -> fleet/content -> SALES-CONTENT-LIBRARY |
| ORBT | OPERATE |
| Strikes | 0 |
| Authority | inherited - Dave Barton + VOICE-LIBRARY.md |
| Last Modified | 2026-04-12 |
| BAR Reference | none |

### HEIR (8 fields - Aviation Model, Bedrock S8)

| Field | Value |
|-------|-------|
| sovereign_ref | svg-agency |
| hub_id | sales-content-library |
| ctb_placement | branch |
| imo_topology | middle |
| cc_layer | CC-02 hub |
| services | LBB worker, R2 bucket svg-files, repo filesystem |
| secrets_provider | doppler |
| acceptance_criteria | Cross-source query returns resources from all three backends using shared Dewey taxonomy |

---

## 2. PURPOSE

Without this library, every sales message build starts from scratch and misses half the available assets. Dave's message builds need one place to resolve the topic into every relevant frame, process pointer, voice asset, visual deck, and repo doc across LBB, R2, and the repo.

---

## 3. RESOURCES

_Everything this depends on. A mechanic reads this and knows exactly what to set up before it can run._

### Dependencies

| Dependency | Type | What It Provides | Status |
|-----------|------|-----------------|--------|
| LBB worker `/query` and `/records` | API | Query surface over indexed records | DONE |
| R2 bucket `svg-files` | storage | Visual slide assets and deck pages | DONE |
| Repo filesystem | repo | Source docs and manifest files | DONE |
| `lbb_subjects` table | database | Single source of truth for Dewey taxonomy | DONE |

### Downstream Consumers

| Consumer | What It Needs |
|----------|--------------|
| Dave's message builds | Topic-to-bundle lookup across all sources |
| LinkedIn drafts | Core frames, voice, and proof points |
| Email campaigns | Process pointers and qualifying language |
| Video scripts | Voice constants, reframes, and operating model |
| Meeting prep | Subject-specific source bundle |
| Gate 1-4 video builds | Sales positioning and process education |

### Tools & Integrations (if applicable)

| Item | Type | Cost Tier | Credentials | What It Does |
|------|------|-----------|-------------|-------------|
| LBB worker API (`/query`, `/records`) | API | Cheap | LBB_API_KEY from Doppler | Returns indexed records by subject_id and query |
| R2 access via sandbox | storage | Cheap | workspace auth | Resolves visual assets and page paths |
| git | repo tool | Free | none | Reads and updates repo files |

### Secrets (if applicable)

| Secret | Doppler Project | Config | Used By |
|--------|----------------|--------|---------|
| LBB_API_KEY | imo-creator | dev | LBB worker auth for query and record access |

---

# CONTRACT (Flow - what flows through this)

_Everything in this cluster answers: what moves? How does data/work enter, get processed, and exit?_

## 4. IMO - Input, Middle, Output

### Two-Question Intake (Bedrock S3)
1. **"What triggers this?"** - A message needs to be built (video, email, LinkedIn, meeting).
2. **"How do we get it?"** - Query the library by topic.

### Input
Topic string such as `self-insured`, `10-85`, `BUCA`, or `stop-loss`.

### Middle

| Step | Input | What Happens | Output | Tool Used |
|------|-------|-------------|--------|-----------|
| 1 | Topic string | Find matching `subject_id` values in `lbb_subjects` | Subject IDs | LBB query / subject lookup |
| 2 | Subject IDs | Query LBB for records under those subjects | LBB records | LBB worker `/query` |
| 3 | Query results | Collect records with `source_url` pointing to each backend | Source pointers | LBB records |
| 4 | Source pointers | Assemble LBB records, R2 paths, and repo paths into one bundle | Resource bundle | Library assembly |
| 5 | Resource bundle | Pass bundle to the message builder | Ready-to-use inputs | Downstream builder |

### Output
Resource bundle: cross-source list of everything on the topic, with the backend pointer for each item.

### Circle (Bedrock S5)
Ingested learnings from new sessions feed back as new LBB records under the right subject leaf so the next query is sharper than the last one.

---

## 5. DATA SCHEMA

_Where the data lives. What's read, written, joined. The plumbing._

### READ Access

| Source | Backend | What It Provides | Join Key |
|--------|---------|-----------------|----------|
| LBB D1 `lbb_records` | LBB | All indexed content metadata + text records | `subject_id` |
| LBB D1 `lbb_subjects` | LBB | Dewey taxonomy (single source of truth) | `subject_id` |
| R2 `svg-files/sales-materials/pages` | R2 | 226 slide PNGs across 16 decks | `source_url` |
| Repo `fleet/content/*` | Repo | Sales content docs (10-85, TPA eval, operating model) | file path |
| Repo `factory/agents/up/dyno-runs/claims-process/*` | Repo | Claims process manual | file path |
| Repo `law/VOICE-LIBRARY.md` | Repo | Voice constants and one-liners | file path |
| Repo `fleet/content/repo-subject-manifest.yaml` | Repo | Repo-to-subject mapping | path |

### WRITE Access

| Target | What It Writes | When |
|--------|---------------|------|
| `lbb_records` | New content ingests, session learnings | On message completion or new content creation |
| `lbb_subjects` | New leaves when a new topic emerges | On topic expansion (human approval) |
| `fleet/content/repo-subject-manifest.yaml` | New repo file mappings | When a new repo file is created |

### Subject Tree

| Subject ID | Name | What Lives Here | Where It Lives |
|-----------|------|----------------|----------------|
| `svg-sales-frames` | core-frames | Reframes, metaphors, positioning anchors | LBB records + repo (`VOICE-LIBRARY`, `operating-model`) |
| `svg-sales-process-ed` | process-education | How the machine works | LBB pointers + repo (`10-85`, `TPA`, `CLAIMS-MANUAL`, `operating-model`) |
| `svg-sales-gates` | sales-gates | Gate 1-4 funnel scripts | LBB (to be built) |
| `svg-sales-voice` | voice-assets | One-liners, qualifying language, DISC | LBB pointer + repo (`VOICE-LIBRARY`) |
| `svg-sales-visual` | visual-assets | Slide decks | R2 (226 slides) + LBB index records |
| `svg-sales-domain` | domain-education | Insurance industry context | LBB (to be built) |
| `svg-sales-formats` | output-formats | Message assembly templates | LBB (to be built) |
| `svg-sales-proc` | sales-processes | Existing sales process docs | LBB (pre-existing) |

### Join Chain

```
Topic query
  -> lbb_subjects (find matching subject_ids)
    -> lbb_records (find records under those subjects)
      -> source_url (LBB / R2 path / repo path)
        -> fetch content from the right backend
          -> assembled bundle
```

### Forbidden Paths

| Action | Why |
|--------|-----|
| Duplicate content into this library document | The library points, it does not store |
| Bypass the `lbb_subjects` taxonomy | No ad-hoc tagging |
| Classify R2 content without an LBB record | The LBB record is the index layer |
| Create new subject leaves without human approval | Subject tree governance stays manual |

---

## 6. DMJ - Define, Map, Join (law/doctrine/DMJ.md)

_Three steps. In order. Can't skip._

### 6a. DEFINE (Build the Key)

| Element | ID | Format | Description | C or V |
|---------|-----|--------|-------------|--------|
| Topic query | `TOPIC-01` | string | User topic that starts the lookup | V |
| Subject ID | `SUBJECT-01` | slug | Dewey node from `lbb_subjects` | C |
| Record | `RECORD-01` | row | Indexed LBB knowledge entry | C |
| Source URL | `SOURCE-01` | path | Backend router for the record | C |
| Bundle | `BUNDLE-01` | list | Cross-source set of results for one topic | V |

### 6b. MAP (Connect Key to Structure)

| Source | Target | Transform |
|--------|--------|-----------|
| Topic query | `lbb_subjects.subject_id` | direct lookup and classification |
| `subject_id` | `lbb_records` rows | direct query by subject |
| `lbb_records.source_url` | backend pointer | direct routing to LBB, R2, or repo |
| record set | bundle | assemble |

### 6c. JOIN (Path to Spine)

| Join Path | Type | Description |
|-----------|------|-------------|
| Topic -> `lbb_subjects` | direct | Find the subject leaf first |
| `lbb_subjects` -> `lbb_records` | direct | Pull the records for that topic |
| `lbb_records` -> `source_url` | direct | Route to the correct backend |
| source bundle -> message builder | direct | Hand off the cross-source package |

---

## 7. CONSTANTS & VARIABLES (Bedrock S2)

### Constants (structure - never changes)
- The 7+1 subject leaves under `svg-sales`
- The Dewey taxonomy in `lbb_subjects`
- The query protocol: topic -> subject_ids -> records -> source_url -> bundle
- `source_url` as the backend router

### Variables (fill - changes every run/cycle)
- The specific topic queried
- The records returned
- The bundle assembled
- The message produced

---

## 8. STOP CONDITIONS (Bedrock S6)

| Condition | Action |
|-----------|--------|
| Topic not found | Fallback to full-text search on the content field |
| No records returned | Log the gap, ingest missing content |
| Ambiguous query | Escalate to Dave |
| Strike 3 on missing topics | Propose a new subject leaf for human approval |

---

# GOVERNANCE (Change - how this is controlled)

_Everything in this cluster answers: what transforms? How is quality measured, verified, certified?_

## 9. VERIFICATION

_Executable proof that it works. Run these._

```sql
1. SELECT COUNT(*) FROM lbb_records WHERE subject_id='svg-sales-visual' -> expected ~226
2. SELECT COUNT(*) FROM lbb_records WHERE subject_id='svg-sales-frames' -> expected 6
3. SELECT COUNT(*) FROM lbb_records WHERE subject_id='svg-sales-process-ed' -> expected 4
4. SELECT COUNT(*) FROM lbb_subjects WHERE parent_id='svg-sales' -> expected 8
```

**Three Primitives Check (Bedrock S1):**
1. **Thing:** Does each subject leaf exist?
2. **Flow:** Does the query reach all three backends?
3. **Change:** Does the bundle assemble correctly?

---

## 10. ANALYTICS

_The BUILD->OPERATE gate. Three sub-layers._

### 10a. Metrics

| Metric | Unit | Baseline | Target | Tolerance |
|--------|------|----------|--------|-----------|
| Subject leaves under `svg-sales` | count/8 | pending first use | 8 | = 8 |
| Visual slide records indexed | count | pending first use | ~226 | +/- 10 |
| Core frame records indexed | count | pending first use | 6 | = 6 |
| Process-ed pointers indexed | count | pending first use | 4 | = 4 |
| Voice pointer records indexed | count | pending first use | 1 | = 1 |

### 10b. Sigma Tracking (Bedrock S2)

| Metric | Run 1 | Run 2 | Run 3 | Trend | Action |
|--------|-------|-------|-------|-------|--------|
| Cross-source coverage | pending | pending | pending | PENDING | establish first-use baseline |
| Subject resolution accuracy | pending | pending | pending | PENDING | validate against sample queries |
| Bundle completeness | pending | pending | pending | PENDING | tighten mapping if any source is missing |

### 10c. ORBT Gate Rules

| From | To | Gate |
|------|-----|------|
| BUILD | OPERATE | All metrics within tolerance for 3 runs + auditor sign-off |
| OPERATE | REPAIR | Any metric outside tolerance |
| REPAIR | OPERATE | Fix + metric back + auditor verification |
| Any (Strike 3) | TROUBLESHOOT/TRAIN | Fleet-wide fix -> AD |

---

## 11. EXECUTION TRACE

_Append-only. Every action logged. The auditor reads this._

| Field | Format | Required |
|-------|--------|----------|
| trace_id | UUID | Yes |
| run_id | UUID | Yes |
| step | action name | Yes |
| target | measurable | Yes |
| actual | measurable | Yes |
| delta | the gap | Yes |
| status | done / failed / skipped | Yes |
| error_code | text or null | If failed |
| error_message | text or null | If failed |
| tools_used | JSON array | Yes |
| duration_ms | integer | Yes |
| cost_cents | integer | Yes |
| timestamp | ISO-8601 | Yes |
| signed_by | agent or manual | Yes |

---

## 12. LOGBOOK (After Certification Only)

_Created ONLY when the auditor certifies (BUILD -> OPERATE). Append-only. The legal identity._

**No logbook during BUILD.**

### Birth Certificate

| Field | Value |
|-------|-------|
| heir_ref | pending certification |
| orbt_entered | BUILD |
| orbt_exited | pending |
| action | pending auditor certification |
| gates_passed | pending |
| signed_by | pending |
| signed_at | pending |

---

## 13. FLEET FAILURE REGISTRY

| Pattern ID | Location | Error Code | First Seen | Occurrences | Strike Count | Status |
|-----------|----------|-----------|-----------|-------------|-------------|--------|
| (none) | -- | -- | -- | -- | -- | -- |

No failures registered yet. First use will populate this section.

---

## 14. SESSION LOG

| Date | What Was Done | LBB Record |
|------|---------------|-----------|
| 2026-04-12 | Initial build. Cross-source library scaffolded, 7 leaves specified, R2 retag target defined, 6 frames, 4 process-ed pointers, 1 voice pointer, and repo manifest mapped. | pending |

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-04-12 |
| Last Modified | 2026-04-12 |
| Version | 1.0.0 |
| Template Version | 1.0.0 |
| Medium | process |
| US Validated | pending |
| Governing Engine | law/doctrine/FOUNDATIONAL_BEDROCK.md + law/doctrine/DMJ.md |

