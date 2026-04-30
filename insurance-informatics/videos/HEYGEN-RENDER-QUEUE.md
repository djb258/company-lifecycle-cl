# HeyGen Render Queue — Build Tomorrow

## Identity

| Field | Value |
|---|---|
| **Purpose** | Master list of every video needing a HeyGen render. Ordered by render priority. |
| **Status** | BUILD (scripts inventoried; renders queued) |
| **Vendor lock** | HeyGen (confirmed 2026-04-20) — kills Remotion personalization, replaces all C-* + E-* + V-* + T-* renders |
| **Rendering rule** | All videos are EVERGREEN (same render for all prospects). Per-prospect data lives on `/c/{slug}` CF Page, NOT in the video. |
| **ctb_node** | `barton-enterprises/svg-agency/content-engine/video-library` |
| **Authority** | Dave Barton (script approval per video before render) |

---

## TIER 1 — Render first (scripts voice-audited or close, highest leverage)

**These go to HeyGen first. They're the ones actively linked from the sequence runbook + CF Pages.**

| # | Video | Slot | Altitude | Duration | Script source | Script status |
|---|---|---|---|---|---|---|
| 1 | **Deconstructing the Duck — 50K Master** | E-06 | 50K→5K | 3-4 min | `fleet/content/videos/rendered/deconstructing-the-duck-50k-master.md` | ✅ LOCKED 2026-04-20 (voice-audited cut of original 6-min transcript; mechanics stripped; Dave-voice pass done) |
| 2 | **Self-Insured vs Fully-Insured** | E-01 | 50K/40K | ~75 sec | `workers/video-pipeline/gate-templates/invideo-scripts-explainers.md` §E-01 + `factory/content/video-scripts/EXPLAINER-VIDEOS-E01-E05.md` | ✅ READY — InVideo prompt exists, rewritten for HeyGen format |
| 3 | **The 90/15 + 10/85 — Where the Money Goes** | E-02 | 30K | ~75 sec | same source §E-02 | ✅ READY |
| 4 | **Hospital Bill Audit — Hospitals Overbill** | E-03 | 20K | ~75 sec | same source §E-03 | ✅ READY |
| 5 | **What Your Broker Can't See — Vendor Silos** | E-04 | 30K | ~75 sec | same source §E-04 | ✅ READY |
| 6 | **The Duck — Short Evergreen** | E-05 | 50K | ~75 sec | same source §E-05 | ✅ READY (short version; complements the 3-4 min E-06 master) |
| 7 | **50K Intro/Filter — "You need me, I don't need you"** | C-00 | 50K | ~2 min | `workers/video-pipeline/gate-templates/hook-the-10-percent-problem.md` | ✅ DONE per CTB §Video Production Table |

**Tier 1 total render budget:** 7 videos × avg 2 min = ~14 min of finished output. At HeyGen subscription tier, all 7 fit comfortably in one month's plan.

---

## TIER 2 — Gate videos (longer, need voice-audit before render)

**These are the 5-6 min sales-funnel videos. Scripts exist but were written for personalized rendering; per today's pivot they become evergreen. Voice-audit pass first (Duck 50K master is the reference — strip mechanics like RBP/501R/Medicare-baseline from Gate 2 if still present; those belong at Gate 2 LIVE meeting, not in the video).**

| # | Video | Slot | Altitude | Duration | Script source | Script status |
|---|---|---|---|---|---|---|
| 8 | **Gate 1 — Factfinder ("We Know You")** | C-01 | 50K/40K | 5-6 min | `gate-1-source.md` + `gate-1-we-know-you.md` | 🟡 DONE per CTB — needs voice-audit pass for evergreen (strip per-prospect personalization) |
| 9 | **Gate 2 — Education + Monte Carlo ("Your Numbers")** | C-02 | 30K/20K | 5-6 min | `gate-2-source.md` + `gate-2-your-numbers.md` | 🟡 DONE — needs voice-audit + decide if Monte Carlo visuals get HeyGen avatar narration or separate motion graphics |
| 10 | **Gate 3 — Service ("What to Expect")** | C-03 | 10K/5K | 5-6 min | `gate-3-source.md` | 🟡 DONE — voice-audit |
| 11 | **Gate 4 — Quote + Dare ("What We Found")** | C-04 | 5K | 3-5 min | `gate-4-source.md` | 🟡 DONE — voice-audit; shortest of the gates, sharp dare framing |

**Tier 2 render budget:** 4 videos × ~5 min = ~20 min. Higher per-video cost but highest sales-funnel impact.

---

## TIER 3 — Vendor-facing (mixed status)

| # | Video | Slot | Altitude | Duration | Script source | Script status |
|---|---|---|---|---|---|---|
| 12 | **The 10% with the Orchestrator — Vendor Operational Explainer** | V-02 | 20K | 3:50 | `fleet/content/vendor-video-the-10-operational-briefing.md` + `fleet/content/videos/rendered/the-10-percent-with-orchestrator.md` | ✅ ALREADY RENDERED (NotebookLM; Stream UID `f287ac78c267deecf55c653841800456`). **Question: re-render in HeyGen for voice/quality consistency, or keep the NotebookLM cut live?** |
| 13 | **Vendor Integration / Scale Marketing** | V-01 | 40K | 2-3 min | `fleet/content/vendor-video-scale-marketing.md` | 🔴 SCRIPT IS A STUB — headers exist, body empty. **Needs write before render.** |

---

## TIER 4 — Internal training (no scripts yet)

**Skip tomorrow. Write scripts over the next week, render after.**

| # | Video | Slot | Altitude | Duration | Script status |
|---|---|---|---|---|---|
| 14 | **Orchestrator Training — flags, intake, routing, babysitter mode, dashboards** | T-01 | 20K/10K | 5-8 min | 🔴 NEEDS WRITE — source material in CTB §10K Service Side |
| 15 | **Service Rep Training — tickets, orchestrator handoff, closing the loop** | T-02 | 10K/5K | 5-8 min | 🔴 NEEDS WRITE — source material in CTB §10K Service Side |

---

## Pre-lock legacy renders (DO NOT distribute — review against current doctrine)

Per `fleet/content/videos/MANIFEST.md` §Staged, Dave has 5 MP4s on local Downloads from before the 2026-04-20 architecture lock. **Do not upload to CF Stream as live.** Review + discard or re-render if still valuable.

| Filename | Likely topic | Size | Date |
|---|---|---|---|
| `The_10-85_Process__Engineering_the_Hub_and_Spoke.mp4` | Hub-and-spoke intro, pre-architecture-lock | 55 MB | 2026-04-12 |
| `Gate_4_—_The_Math_Will_Speak.mp4` | Gate 4 prospect video | 21 MB | 2026-04-07 |
| `Your_New_Operating_System.mp4` | Operating system explainer | 30 MB | 2026-04-07 |
| `Architecting_the_Bifurcated_Health_Plan.mp4` | Bifurcated plan architecture | 60 MB | 2026-04-07 |
| `Re-Architecting_the_Benefits_Machine.mp4` | Benefits machine re-architecture | 65 MB | 2026-04-06 |

**Recommendation:** Tier 1 HeyGen renders supersede all of these. Delete or archive once Tier 1 is live on Stream.

---

## Deconstructing the Duck — original 6-min version

| Asset | Status |
|---|---|
| Raw MP4 on Dave's Downloads (`Deconstructing_the_Duck__The_Architecture_of_Insurance_Informat.mp4`) | 67 MB, not yet uploaded to CF Stream |
| Transcript (full 840 words) | ✅ Saved: `fleet/content/videos/rendered/deconstructing-the-duck.md` |
| 50K voice-audited master (395 words, 3-4 min) | ✅ Saved: `fleet/content/videos/rendered/deconstructing-the-duck-50k-master.md` |
| CF Pages config (route `/deconstructing-the-duck`) | ✅ Wired: `workers/content-pages/src/configs/deconstructing-the-duck.ts` with `streamId: STREAM_ID_PENDING` |

**Decision tomorrow:** render E-06 Duck 50K Master fresh in HeyGen (voice-audited version) vs upload the existing 6-min source MP4 to Stream. My rec: **render fresh in HeyGen.** The 6-min original has voice drift that got stripped in the 50K master; HeyGen version will be higher quality + voice-compliant.

---

## Tomorrow's HeyGen session plan

**Install + first render (~2-3 hrs):**
1. `curl https://static.heygen.ai/cli/install.sh | sh` — install CLI (needs Dave authorization)
2. Clone `heygen-com/skills` → `factory/agents/skills/heygen-skills/`
3. Test auth with stored `HEYGEN_API_KEY` (Doppler: imo-creator/dev)
4. Pick/create avatar + voice clone (first-time setup with HeyGen account)
5. Render E-06 Duck 50K Master as first test — validate quality, voice, timing

**Batch 1 renders (~4-6 hrs same day):**
6. Render E-01 through E-05 (5× ~75-sec explainers)
7. Render C-00 (50K Intro)
8. Upload all 7 to CF Stream → collect UIDs
9. Update `workers/content-pages/src/configs/*.ts` with Stream UIDs → deploy content-pages → live

**End of day deliverables:**
- 7 evergreen videos live on CF Stream
- 7 content-pages routes live with videos embedded (duck, 5x explainers, c-00 intro)
- HeyGen CLI + skills installed, API auth verified
- Reference render workflow documented for Tier 2/3 next week

**Tier 2 gate videos (next session):** voice-audit pass → render. 4 videos × ~5 min each. Plan for ~1 day.

---

## API key rotation reminder

`HEYGEN_API_KEY` (stored in Doppler `imo-creator/dev`) was pasted in chat history on 2026-04-19. **After tomorrow's work, generate a new key at https://app.heygen.com/api, update Doppler, retire the old.**

---

## Cross-reference

- Video production table: `fleet/content/INSURANCE-INFORMATICS-CTB.md` §VIDEO PRODUCTION TABLE
- Voice library: `law/VOICE-LIBRARY.md`
- Duck 50K voice-audited master: `fleet/content/videos/rendered/deconstructing-the-duck-50k-master.md`
- Client CF Page pattern (where evergreen videos embed): `docs/processes/CLIENT-CF-PAGE-RUNBOOK.md`
- Sequence cadence (which video per touch): `docs/processes/SEQUENCE-CADENCE-RUNBOOK.md`
- HeyGen BAR (pending file if we want to track video pipeline separately): TBD
- Video library manifest: `fleet/content/videos/MANIFEST.md`
