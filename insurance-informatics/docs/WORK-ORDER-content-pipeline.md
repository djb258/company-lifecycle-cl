# Work Order — Content Pipeline Process (Doctrine Level)

## Role
MECHANIC

## Task
Build `law/doctrine/CONTENT-PIPELINE-PROCESS.md` on the UNIFIED_TEMPLATE exactly. This is a doctrine-level document that sits alongside VOICE-LIBRARY.md and HOW_TO_BUILD_ANYTHING.md. It documents the universal content pipeline: script → NotebookLM → video → CF hosting → LinkedIn. Applies to every content build across every sub-project (svg-sales, kiddo, future silos).

## MUST FOLLOW

- `law/UNIFIED_TEMPLATE.md` — 14 sections, 3 clusters (Identity / Contract / Governance), full HEIR block, correct top matter. This document will be audited against the template. NO DEVIATIONS.
- `law/doctrine/PROCESS_FILL_INSTRUCTIONS.md` — fill rules per section for medium=process.

## Read First

1. `AGENTS.md` — mechanic operating manual, work order format, role rules
2. `law/UNIFIED_TEMPLATE.md` — the template you MUST follow
3. `law/doctrine/PROCESS_FILL_INSTRUCTIONS.md` — section fill rules
4. `law/VOICE-LIBRARY.md` — the voice constants this pipeline enforces
5. `law/doctrine/HOW_TO_BUILD_ANYTHING.md` — trunk-level build manual (precedent for where this sits)
6. `workers/video-pipeline/VIDEO-BUILD-GUIDE.md` — existing video build instructions
7. `workers/video-pipeline/MANUAL.md` — video-pipeline worker manual
8. `workers/content-pages/MANUAL.md` — content-pages worker manual (CF hosting)
9. `fleet/content/SALES-CONTENT-LIBRARY.md` — the content library (input engine for scripts)
10. `AGENTS.md` — specifically the §1 IDENTITY and §4 IMO sections as precedent for correct UNIFIED_TEMPLATE fill

## Context

Dave is building a universal content pipeline. Every video, notebook, and hosted artifact follows the same flow. Right now that flow lives in multiple places (VIDEO-BUILD-GUIDE.md for instructions, workers/video-pipeline for the code side, workers/content-pages for hosting). This document consolidates the process as doctrine so it applies across every sub-project — not just svg-sales.

The pipeline:

```
1. SCRIPT (input)
   - Written in Dave's voice per VOICE-LIBRARY.md
   - Pulled from SALES-CONTENT-LIBRARY (cross-source Dewey index)
   - Stored as markdown in workers/video-pipeline/gate-templates/ or equivalent
   - Format: NotebookLM source-ready markdown

2. BUILD (middle — NotebookLM as rendering engine)
   - Create notebook in NotebookLM
   - Paste script as "copied text" source (Chrome MCP or manual)
   - Generate artifacts: Audio Overview, Video Overview (Cinematic/Explainer/Brief), Infographic, Mind Map, Slide Deck, Quiz, Flashcards, Report, Data Table
   - NotebookLM cannot deviate from the script — we wrote it, it renders it
   - Download MP4 + other artifacts

3. OUTPUT (delivery)
   - Save MP4 to workers/video-pipeline/output/
   - Host on Cloudflare Pages via workers/content-pages/ (9-slot template)
   - CF Stream for video playback
   - Branded URL ready for LinkedIn, sales meetings, client education
```

## Build the Document

Path: `law/doctrine/CONTENT-PIPELINE-PROCESS.md`

### Top Matter

```
# Content Pipeline Process
## The universal script → NotebookLM → download → CF Pages → LinkedIn flow. Every content build follows this process regardless of sub-project.
### Status: OPERATE
### Medium: process
### Business: imo-creator
```

### Section 1 — IDENTITY

Full identity table:
- ID: `DOC-CONTENT-PIPELINE`
- Name: `Content Pipeline Process`
- Medium: process
- Business Silo: imo-creator
- CTB Position: `trunk -> law/doctrine/CONTENT-PIPELINE-PROCESS.md` (doctrine-level, applies to all sub-projects)
- ORBT: OPERATE
- Strikes: 0
- Authority: sovereign — inherited from HOW_TO_BUILD_ANYTHING.md and VOICE-LIBRARY.md
- Last Modified: 2026-04-12
- BAR Reference: none

HEIR (8 fields):
- sovereign_ref: imo-creator
- hub_id: content-pipeline-doctrine
- ctb_placement: trunk
- imo_topology: middle
- cc_layer: CC-01 sovereign
- services: NotebookLM (rendering), Cloudflare Pages (hosting), CF Stream (video), LinkedIn (distribution), SALES-CONTENT-LIBRARY (input)
- secrets_provider: doppler
- acceptance_criteria: Every content build follows this pipeline. Scripts pull from voice library. NotebookLM is treated as a rendering engine, not a writer. Output hosted on CF Pages with 9-slot template. Published to LinkedIn via manual or automated post.

### Section 2 — PURPOSE

2-3 sentences only (template rule):

Without this doctrine, content builds are ad-hoc — each session reinvents the script format, the NotebookLM usage pattern, the hosting setup. With it, any sub-project (svg-sales, kiddo, future silos) produces content the same way: voice-locked script in, published branded asset out. The SID compiler, Gate video builds, and LinkedIn education pipeline all depend on this being the constant.

### Section 3 — RESOURCES

**Dependencies:**

| Dependency | Type | What It Provides | Status |
|-----------|------|-----------------|--------|
| law/VOICE-LIBRARY.md | document | The voice constants every script must follow | DONE (v1.1) |
| fleet/content/SALES-CONTENT-LIBRARY.md | document | Cross-source Dewey index of content assets | DONE |
| workers/video-pipeline/VIDEO-BUILD-GUIDE.md | document | Step-by-step notebook build instructions | DONE |
| workers/video-pipeline/gate-templates/ | directory | Script source templates | DONE |
| workers/content-pages | CF worker | 9-slot CF Pages template for hosting | DONE |
| workers/content-pages CF Stream integration | service | Video hosting and playback | DONE |
| NotebookLM (https://notebooklm.google.com) | external service | Rendering engine for audio/video/infographic/etc | External — dbarton@svg.agency account |
| Chrome DevTools MCP | tool | Automated NotebookLM interaction | DONE |

**Downstream Consumers:**

| Consumer | What It Needs |
|----------|--------------|
| Gate 1-4 sales funnel videos | Script format, build flow, CF hosting |
| 10-85 vendor/sales videos | Same |
| TPA evaluation content | Same |
| LinkedIn education pipeline | Published CF Pages URLs |
| Client meetings | Personalized branded content from the same pipeline |
| Future sub-projects (kiddo, etc.) | Same universal flow |

**Tools & Integrations:**

| Item | Type | Cost Tier | Credentials | What It Does |
|------|------|-----------|-------------|-------------|
| NotebookLM | Rendering service | Free (Google account) | Google OAuth | Generates audio, video, infographic, mind map, slides, quiz, flashcards, report, data table from source scripts |
| Chrome DevTools MCP | Automation | Free | Local Chrome session | Interacts with NotebookLM without leaving Claude Code |
| Cloudflare Pages | Hosting | Free tier | wrangler | Hosts branded content pages |
| CF Stream | Video hosting | Usage-based | Doppler | Hosts and plays video artifacts |
| LinkedIn | Distribution | Free | Manual or automated | Final publishing destination |

**Secrets:**

| Secret | Doppler Project | Config | Used By |
|--------|----------------|--------|---------|
| CF_STREAM_API_KEY | imo-creator | dev | workers/content-pages for Stream integration |

### Section 4 — IMO

**Two-Question Intake (Bedrock §3):**
1. **"What triggers this?"** — A new content build is needed (video, audio, infographic, LinkedIn post)
2. **"How do we get it?"** — The library query returns a resource bundle; we write the script from the bundle

**Input:** Resource bundle from SALES-CONTENT-LIBRARY query (topic → subject → records → content from LBB/R2/repo) plus a target output type (video, audio, infographic, slide deck).

**Middle:**

| Step | Input | What Happens | Output | Tool Used |
|------|-------|-------------|--------|-----------|
| 1 | Topic + output type | Query SALES-CONTENT-LIBRARY for relevant resources | Resource bundle | LBB query |
| 2 | Resource bundle | Write script in Dave's voice (VOICE-LIBRARY constants) | Markdown script | Foreman (Opus) or manual |
| 3 | Markdown script | Save to workers/video-pipeline/gate-templates/ or equivalent | Script file committed to repo | git |
| 4 | Script file | Create new NotebookLM notebook | Notebook ID | NotebookLM via Chrome MCP |
| 5 | Notebook + script | Paste script as "Copied text" source | Ingested source | NotebookLM UI |
| 6 | Notebook with source | Generate artifacts (audio/video/infographic/etc) with custom prompts | Generated artifacts | NotebookLM Studio |
| 7 | Artifacts | Download MP4 + related files | Files on disk | NotebookLM Download |
| 8 | Downloaded files | Move to workers/video-pipeline/output/ | Repo-tracked output | git |
| 9 | Output files | Wire into workers/content-pages config (9 slots) | Updated config | Code edit |
| 10 | Updated config | Deploy to CF Pages | Live branded URL | wrangler pages deploy |
| 11 | Live URL | Publish to LinkedIn | LinkedIn post | Manual or automated |

**Output:** Live branded CF Pages URL with the content artifact embedded, posted to LinkedIn.

**Circle (Bedrock §5):** Engagement data from LinkedIn feeds back as new LBB records tagged to the source subject. If a piece performs, its script pattern gets promoted to a reference template. If it flops, the script is reviewed for voice drift against VOICE-LIBRARY.md.

### Section 5 — DATA SCHEMA

**READ Access:**

| Source | Backend | What It Provides | Join Key |
|--------|---------|-----------------|----------|
| law/VOICE-LIBRARY.md | Repo | Voice constants, core frames, one-liners | path |
| fleet/content/SALES-CONTENT-LIBRARY.md | Repo | Cross-source Dewey index | path |
| lbb_subjects | LBB D1 | Dewey taxonomy (single source of truth) | subject_id |
| lbb_records | LBB D1 | Content records (LBB + R2 pointers + repo pointers) | subject_id |
| workers/video-pipeline/gate-templates/ | Repo | Script source templates | file path |
| r2://svg-files/sales-materials | R2 | Slide deck visual assets | source_url |
| workers/content-pages config files | Repo | 9-slot page configs | path |
| NotebookLM notebooks | External | Previously generated notebooks | notebook URL |

**WRITE Access:**

| Target | What It Writes | When |
|--------|---------------|------|
| workers/video-pipeline/gate-templates/*.md | New script sources | Step 3 (save script) |
| workers/video-pipeline/output/ | Downloaded artifacts | Step 8 (download) |
| workers/content-pages/public/content/ | Hosted content configs | Step 9 (wire into page) |
| CF Pages deployment | Live branded URLs | Step 10 (deploy) |
| LBB records (session ingest) | Pipeline run metadata | After each successful publish |
| LinkedIn | Published posts | Step 11 (publish) |

**Join Chain:**

```
Topic query
  → SALES-CONTENT-LIBRARY
    → LBB records (subject_id)
      → source_url per record (LBB/R2/repo)
        → fetched content
          → script (written by foreman in Dave's voice)
            → NotebookLM source
              → generated artifact
                → workers/video-pipeline/output/
                  → workers/content-pages CF deployment
                    → LinkedIn post
```

**Forbidden Paths:**

| Action | Why |
|--------|-----|
| Let NotebookLM write the script | NotebookLM is a renderer, not a writer. Script must come from foreman or human in Dave's voice. |
| Skip the script step | No voice-locked script = voice drift. The script is the artifact that gets audited against VOICE-LIBRARY. |
| Publish without CF Pages hosting | CF Pages is the canonical delivery surface. LinkedIn links to CF Pages, not raw MP4. |
| Store content outside the library | Every artifact must be traceable back to a subject_id. No floating files. |
| Bypass VOICE-LIBRARY | Every script must pull from the voice constants. No improvised tone. |

### Section 6 — DMJ

**6a. DEFINE (Build the Key):**

| Element | ID | Format | Description | C or V |
|---------|-----|--------|-------------|--------|
| Topic query | CP-001 | string | What the content is about | V |
| Output type | CP-002 | enum (video/audio/infographic/slides/etc) | Target artifact | V |
| Resource bundle | CP-003 | list of LBB records | Query result | V |
| Script | CP-004 | markdown file | Voice-locked source for NotebookLM | V |
| Notebook | CP-005 | NotebookLM notebook ID + URL | Rendering container | V |
| Artifact | CP-006 | file (mp4/mp3/png/etc) | Generated output | V |
| Page config | CP-007 | workers/content-pages config entry | Hosted layout | V |
| Published URL | CP-008 | https:// URL | Live branded page | V |
| Voice constants | CP-009 | VOICE-LIBRARY.md sections | The rules every script follows | C |
| Pipeline stages | CP-010 | 11 ordered steps | The process itself | C |
| Library taxonomy | CP-011 | lbb_subjects | Dewey classification | C |
| UNIFIED_TEMPLATE | CP-012 | law/UNIFIED_TEMPLATE.md | Document format | C |

**6b. MAP (Connect Key to Structure):**

| Source | Target | Transform |
|--------|--------|-----------|
| Topic + output type | SALES-CONTENT-LIBRARY query | Dewey lookup |
| Resource bundle | Script markdown | Foreman writes in Dave's voice |
| Script markdown | NotebookLM source | Paste as "Copied text" |
| NotebookLM notebook + source | Artifact | Generate + custom prompt |
| Artifact | Repo-tracked output file | Download + save |
| Output file | CF Pages config | Wire into 9-slot template |
| CF Pages config | Live URL | wrangler pages deploy |
| Live URL | LinkedIn post | Publish + share |

**6c. JOIN (Path to Spine):**

| Join Path | Type | Description |
|-----------|------|-------------|
| Script → LBB record (script ingested as content) | direct | Every script gets indexed so future builds can find it |
| Notebook → LBB record (notebook inventory) | direct | Every notebook gets a pointer record so we know what exists |
| Artifact → workers/video-pipeline/output/ | direct | File-system backed, git-tracked |
| Published URL → LBB record | direct | Live URL gets a pointer record for audit and re-use |

### Section 7 — CONSTANTS AND VARIABLES (Bedrock §2)

**Constants:**
- The 11 pipeline stages (Input → Script → NotebookLM → Download → CF Pages → LinkedIn)
- The script must be voice-locked against VOICE-LIBRARY.md
- NotebookLM is a renderer, never a writer
- Every artifact traces back to a subject_id in the Dewey taxonomy
- CF Pages is the canonical delivery surface
- The 9-slot content-pages template
- The UNIFIED_TEMPLATE format for this doc and every process doc
- LinkedIn is the education distribution channel (public audience)

**Variables:**
- The specific topic queried
- The resource bundle returned
- The script content (always in voice, but the words change)
- The output type (video, audio, infographic, etc)
- The NotebookLM generation prompt (tuned per artifact)
- The CF Pages config entry (slot order, content per slot)
- The published URL
- The LinkedIn post copy (built from the script's key lines)

### Section 8 — STOP CONDITIONS (Bedrock §6)

| Condition | Action |
|-----------|--------|
| Library query returns no resources | HALT — ingest missing content first |
| Script drifts from VOICE-LIBRARY | Rewrite before NotebookLM upload |
| NotebookLM generation fails | Retry once with tuned prompt; if fails again, escalate |
| Generated artifact does not match checklist | Rewrite script, do not regenerate from the same source |
| CF Pages deploy fails | Fix config, redeploy — do not publish a broken page |
| LinkedIn post requires edits from Dave before publish | Do not auto-publish — human approval gate |
| Strike 3 on same failure across pipeline | Troubleshoot/Train — review voice or process |

### Section 9 — VERIFICATION

**Executable proof:**

```
1. Query SALES-CONTENT-LIBRARY for "self-insured" → expected: resource bundle with LBB records, R2 slides, repo docs
2. Write script in Dave voice from bundle → expected: markdown file passes VOICE-LIBRARY audit (no banned phrases, pulls verified one-liners)
3. Upload script to NotebookLM → expected: source accepted, generation starts
4. Generate audio overview → expected: mp3/mp4 downloads cleanly
5. Generate video overview → expected: mp4 downloads cleanly
6. Wire artifacts into workers/content-pages config → expected: config validates, build succeeds
7. Deploy to CF Pages → expected: live URL responds 200, video plays
8. Publish to LinkedIn → expected: post live with working link
```

**Three Primitives Check (Bedrock §1):**
1. **Thing:** Does every stage have a target artifact (script, notebook, mp4, config, URL, post)?
2. **Flow:** Does content move from library → script → notebook → download → host → publish without gaps?
3. **Change:** Does each stage transform correctly (topic becomes bundle, bundle becomes script, script becomes video, video becomes page, page becomes post)?

### Section 10 — ANALYTICS

**10a. Metrics:**

| Metric | Unit | Baseline | Target | Tolerance |
|--------|------|----------|--------|-----------|
| Script voice compliance | % match to VOICE-LIBRARY | BASELINE | 100% | 0 |
| NotebookLM generation success | % first-try | BASELINE | 95%+ | 1 retry max |
| CF Pages deploy success | % | BASELINE | 100% | 0 |
| Time from topic to published URL | minutes | BASELINE | < 60 | < 120 |
| LinkedIn engagement per post | views/comments/shares | BASELINE | rising | — |

**10b. Sigma Tracking:**

| Metric | Run 1 | Run 2 | Run 3 | Trend | Action |
|--------|-------|-------|-------|-------|--------|
| Script voice compliance | — | — | — | PENDING | Establish baseline |
| Generation success | — | — | — | PENDING | Establish baseline |
| Time to publish | — | — | — | PENDING | Establish baseline |
| LinkedIn engagement | — | — | — | PENDING | Establish baseline |

**10c. ORBT Gate Rules:**

| From | To | Gate |
|------|-----|------|
| BUILD | OPERATE | Full pipeline run end-to-end for 3 different topics with P=1 |
| OPERATE | REPAIR | Any metric drops below tolerance |
| REPAIR | OPERATE | Fix + re-run + metrics recover |
| Any (Strike 3) | TROUBLESHOOT/TRAIN | Voice drift pattern or generation pattern identified → update VOICE-LIBRARY or prompts |

### Section 11 — EXECUTION TRACE

| Field | Format | Required |
|-------|--------|----------|
| trace_id | UUID | Yes |
| run_id | UUID | Yes |
| topic | string | Yes |
| output_type | enum | Yes |
| script_path | repo path | Yes |
| notebook_id | NotebookLM ID | Yes |
| notebook_url | URL | Yes |
| artifact_path | repo path | Yes |
| cf_pages_url | URL | Yes |
| linkedin_post_url | URL | If published |
| status | done / failed / in-progress | Yes |
| duration_ms | integer | Yes |
| timestamp | ISO-8601 | Yes |
| signed_by | agent or manual | Yes |

### Section 12 — LOGBOOK (After Certification Only)

Placeholder. No logbook during BUILD. Will be created when the pipeline is certified by auditor and moves to OPERATE.

Birth certificate fields to populate at certification:
- heir_ref: full HEIR record
- orbt_entered: BUILD
- orbt_exited: OPERATE
- action: Certified — content pipeline operational
- gates_passed: { imo: true, ctb: true, circle: true }
- signed_by: Auditor (different role than builder)
- signed_at: [pending]

### Section 13 — FLEET FAILURE REGISTRY

| Pattern ID | Location | Error Code | First Seen | Occurrences | Strike Count | Status |
|-----------|----------|-----------|-----------|-------------|-------------|--------|
| — | — | — | — | — | — | No failures registered yet |

Strike 1: Repair. Strike 2: Scrutiny. Strike 3: Troubleshoot/Train → Airworthiness Directive (update VOICE-LIBRARY, prompts, or process).

### Section 14 — SESSION LOG

| Date | What Was Done | LBB Record |
|------|---------------|-----------|
| 2026-04-12 | Initial build — doctrine-level content pipeline process documented on UNIFIED_TEMPLATE. Derived from workers/video-pipeline/VIDEO-BUILD-GUIDE.md + workers/content-pages/MANUAL.md + SALES-CONTENT-LIBRARY.md + VOICE-LIBRARY.md. | pending |

### Document Control

| Field | Value |
|-------|-------|
| Created | 2026-04-12 |
| Last Modified | 2026-04-12 |
| Version | 1.0.0 |
| Template Version | 1.0.0 |
| Medium | process |
| Derived From | workers/video-pipeline/VIDEO-BUILD-GUIDE.md, workers/content-pages/MANUAL.md, fleet/content/SALES-CONTENT-LIBRARY.md, law/VOICE-LIBRARY.md v1.1 |
| US Validated | pending |
| Governing Engine | law/doctrine/FOUNDATIONAL_BEDROCK.md + law/doctrine/DMJ.md |

## Acceptance Criteria

- [ ] `law/doctrine/CONTENT-PIPELINE-PROCESS.md` exists at the correct path (under `law/doctrine/`, NOT `fleet/content/`)
- [ ] Follows UNIFIED_TEMPLATE exactly — 14 sections, 3 clusters, all headings present and numbered correctly
- [ ] Top matter correct: Status/Medium/Business lines filled
- [ ] Section 1: full identity table + 8-field HEIR
- [ ] Section 2: 2-3 sentences only (template rule)
- [ ] Section 3: Dependencies, Downstream Consumers, Tools, Secrets tables
- [ ] Section 4: Two-question intake + Input + Middle (step table) + Output + Circle
- [ ] Section 5: READ/WRITE tables + Join Chain + Forbidden Paths
- [ ] Section 6: DEFINE/MAP/JOIN tables
- [ ] Section 7: Constants and Variables lists
- [ ] Section 8: Stop Conditions table
- [ ] Section 9: Verification script + Three Primitives check
- [ ] Section 10: Metrics + Sigma + ORBT gate rules
- [ ] Section 11: Execution Trace field table
- [ ] Section 12: Logbook placeholder
- [ ] Section 13: Fleet Failure Registry placeholder
- [ ] Section 14: Session Log with today's entry
- [ ] Document Control table
- [ ] Return P=1 or P=0 with specific blockers if any

## Constraints

- Do NOT modify any of the nine locked constants (UNIFIED_TEMPLATE, FOUNDATIONAL_BEDROCK, DMJ, FCE, SKILL, STRUCTURE_MANIFEST, us.py, up.py, HOW_TO_BUILD_ANYTHING)
- Do NOT invent content — pull from the source files listed (VIDEO-BUILD-GUIDE, content-pages MANUAL, SALES-CONTENT-LIBRARY, VOICE-LIBRARY)
- Do NOT put this under `fleet/content/` — it belongs in `law/doctrine/` as doctrine
- Follow UNIFIED_TEMPLATE exactly — this document WILL be audited next
- Use the precedent set by `AGENTS.md` (which was repo-certified) for structural fidelity
- Report P=1 (success with all acceptance criteria) or P=0 (with specific blockers)
