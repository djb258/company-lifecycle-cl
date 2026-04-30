# SVG Video Library

## Identity

| Field | Value |
|---|---|
| **Name** | SVG Video Library |
| **CTB Position** | fleet / content / videos |
| **Sovereign Ref** | imo-creator |
| **Hub ID** | svg-video-library |
| **CC Layer** | CC-03 |
| **Status** | BUILD |
| **Authority** | Dave Barton |
| **Pairs With** | `workers/content-pages/` (renderer), `law/VOICE-LIBRARY.md` v1.3.3, Cloudflare Stream |

---

## What this is

The canonical catalog of every rendered video asset in the SVG content system. One markdown file per video. Git-tracked, queryable, and the single source of truth for:

- Which videos exist
- Where each video's bits live (Cloudflare Stream UID)
- Which notebook/script the video was generated from
- Who the video is for (audience tag)
- What state the video is in (draft / rendered / public / archived)
- Which CF Pages route serves the video to external viewers

---

## The pipeline

Every video in this library follows the same production path:

```
1. SCRIPT        → fleet/content/vendor-video-*.md (locked script in doctrine)
2. GENERATION    → NotebookLM (paste script as source, generate Video Overview)
3. DOWNLOAD      → download MP4 from NotebookLM Studio > More options > Download
4. UPLOAD        → POST to Cloudflare Stream API, get uid back
5. CATALOG       → create fleet/content/videos/rendered/<slug>.md with metadata
6. MANIFEST      → add row to fleet/content/videos/MANIFEST.md
7. CONTENT PAGE  → add ContentConfig entry in workers/content-pages/src/configs/
8. DEPLOY        → ship the content-pages worker with the new route
9. DISTRIBUTE    → share the CF Pages URL with the target audience
```

Steps 1–6 live in git. Steps 7–9 live in the content-pages worker deployment.

---

## Directory structure

```
fleet/content/videos/
├── README.md                              — this file
├── MANIFEST.md                            — canonical index (one row per video)
├── _templates/
│   └── video-entry-template.md            — copy this when cataloging a new video
└── rendered/
    ├── insurance-informatics-explainer.md — the first live entry
    └── [additional entries...]
```

New videos get added as a new file under `rendered/` AND a new row in `MANIFEST.md`. Both updates in the same commit.

---

## Cloudflare Stream architecture

- **Account subdomain:** `customer-1prkz5571edaq9k9.cloudflarestream.com` (Dave Barton's CF Stream customer subdomain)
- **Upload endpoint:** `POST https://api.cloudflare.com/client/v4/accounts/{account_id}/stream`
- **Credentials in Doppler:** `GLOBAL_CLOUDFLARE_ACCOUNT_ID` + `CF_STREAM_API_TOKEN` under `imo-creator → dev`
- **Upload command pattern:**
  ```bash
  curl -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/stream" \
    -H "Authorization: Bearer $CF_STREAM_API_TOKEN" \
    -F "file=@/path/to/video.mp4" \
    -F 'meta={"name":"Human-readable title"}'
  ```
- **Stream lifecycle:** uploads land in `queued` state, transition to `ready` once CF finishes encoding the HLS + DASH manifests. Usually 1–5 minutes for a 30MB file. The `uid` is stable from upload — you can catalog the video before encoding finishes.

---

## The 9-slot ContentConfig

Each video lives inside a `ContentConfig` object in the content-pages worker. The config supports up to 9 content slots per topic:

| Slot | Purpose | Typical source |
|---|---|---|
| `video` | NotebookLM Video Overview | CF Stream uid |
| `audio` | NotebookLM Audio Overview (podcast) | static m4a in worker assets |
| `slides` | NotebookLM Slide Deck (PDF export) | static pdf |
| `report` | Google Docs long-form report | inline HTML |
| `infographic` | Visual summary | static PNG/SVG |
| `quiz` | Interactive comprehension check | JSON questions array |
| `flashcards` | Memorization aid | JSON cards array |
| `mindmap` | NotebookLM Mind Map export | static PNG or PDF |
| `datatable` | Structured reference data | JSON table |

Not every video uses every slot. Most vendor videos will only use `video` + maybe `slides` and `report`. The 9-slot template is maximal — fill what's useful, leave the rest empty.

See `workers/content-pages/src/types.ts` for the canonical interface.

---

## Naming conventions

Every video has THREE names and they are all different. Capture all three in the entry file:

| Name type | Example | Used for |
|---|---|---|
| **Video title** | `Insurance Informatics Explainer` | Display title on CF Pages, distribution |
| **Slug** | `insurance-informatics-explainer` | File name, CF Pages route, internal reference |
| **Notebook name** | `The Integration Multiplier: Proving Industrial Scale for Vendors` | Source-of-truth link to NotebookLM |

The notebook name is allowed to differ from the video title — NotebookLM generates a title based on the source content, which isn't always what you want the external audience to see. The video entry file captures both so the linkage is never lost.

---

## HEIR identity on every entry

Every video entry file includes HEIR fields at the top:

```yaml
sovereign_ref: imo-creator
hub_id: svg-video-library
cc_layer: CC-03
ctb_placement: leaf
```

This lets the entry plug into any future query system (LBB, SRF, Mission Control dashboard, etc.) without retrofitting.

---

## Status states

| State | Meaning |
|---|---|
| **SCRIPT_DRAFT** | Script exists in `fleet/content/vendor-video-*.md` but video has not been generated |
| **NOTEBOOKLM_QUEUED** | Source uploaded to NotebookLM, render requested, waiting |
| **MP4_DOWNLOADED** | Video render complete, MP4 in local Downloads folder, not yet uploaded to CF Stream |
| **STREAM_UPLOADED** | Video uploaded to CF Stream, `uid` captured, encoding in progress |
| **STREAM_READY** | CF Stream has finished encoding, HLS + DASH manifests are live |
| **CONTENT_PAGE_LIVE** | Wired into `workers/content-pages/src/configs/` and deployed to Cloudflare Pages |
| **DISTRIBUTED** | Shared with target audience |
| **ARCHIVED** | Superseded by a newer version or retired |

A video entry should track its state transitions with timestamps.

---

## Rules

1. **One file per video, one row per video in MANIFEST.md.** Both updates in the same commit.
2. **Never delete a video entry.** Use `ARCHIVED` status. The library is append-only doctrine.
3. **Stream UIDs are stable** once captured. Do not re-upload unless the source script changes — re-render in place.
4. **Every entry cites its script source.** The video should trace back to a locked script file in `fleet/content/` or `workers/content-pages/` — no orphan videos.
5. **Audience tags must match the voice library audience segmentation** (prospect / client / vendor-ops / vendor-bd / internal). No ad-hoc audiences.
6. **HEIR fields are mandatory.** No entry without identity.
7. **When a new video gets generated, update the MANIFEST.md row count in the Document Control section.**

---

## Document Control

| Field | Value |
|---|---|
| Created | 2026-04-15 |
| Last Modified | 2026-04-15 |
| Version | 0.1.0 |
| Status | BUILD (first entry live, library doctrine in place) |
| Authority | Dave Barton |
