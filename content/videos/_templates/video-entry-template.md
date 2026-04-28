# {Video Title}

## Identity

| Field | Value |
|---|---|
| **Title** | {human-readable display title} |
| **Slug** | {kebab-case-slug-for-filename-and-route} |
| **Notebook Name** | {original NotebookLM notebook name, may differ from title} |
| **CTB Position** | fleet / content / videos / rendered |
| **Status** | {SCRIPT_DRAFT \| NOTEBOOKLM_QUEUED \| MP4_DOWNLOADED \| STREAM_UPLOADED \| STREAM_READY \| CONTENT_PAGE_LIVE \| DISTRIBUTED \| ARCHIVED} |
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
| **Stream UID** | {CF Stream uid from upload} |
| **Customer Subdomain** | customer-1prkz5571edaq9k9.cloudflarestream.com |
| **Thumbnail** | https://customer-1prkz5571edaq9k9.cloudflarestream.com/{uid}/thumbnails/thumbnail.jpg |
| **HLS Manifest** | https://customer-1prkz5571edaq9k9.cloudflarestream.com/{uid}/manifest/video.m3u8 |
| **DASH Manifest** | https://customer-1prkz5571edaq9k9.cloudflarestream.com/{uid}/manifest/video.mpd |
| **Duration** | {seconds, once encoded} |
| **Size** | {MB} |
| **Uploaded** | {ISO timestamp} |
| **Encoding State** | {queued \| processing \| ready \| error} |

---

## Source

| Field | Value |
|---|---|
| **Script Source** | {path to locked script file or inline text} |
| **NotebookLM URL** | {https://notebooklm.google.com/notebook/{id}} |
| **Generation Method** | NotebookLM Video Overview (2-host or explainer format) |
| **Generated** | {date} |
| **Source Count** | {how many NotebookLM sources the notebook used} |

---

## Audience and Purpose

| Field | Value |
|---|---|
| **Audience** | {prospect-cfo \| prospect-ceo \| prospect-hr \| client-post-sale \| vendor-ops \| vendor-bd \| internal-team} |
| **Purpose** | {one-sentence description of what the video is supposed to accomplish} |
| **Key Messages** | {bulleted list of what the video must land} |
| **Runtime Target** | {seconds} |
| **Actual Runtime** | {seconds once rendered} |

---

## Distribution

| Field | Value |
|---|---|
| **CF Pages Route** | {e.g., /insurance-informatics on the content-pages worker} |
| **Content Config File** | {workers/content-pages/src/configs/{slug}.ts} |
| **Deployed** | {ISO timestamp when the content page went live} |
| **Distributed To** | {list of contacts or "pending"} |

---

## State Log

Append-only record of state transitions. Timestamps in ISO 8601.

| Timestamp | From State | To State | Notes |
|---|---|---|---|
| {ISO} | (none) | SCRIPT_DRAFT | Video entry created |

---

## Voice Library References

List which voice library frames this video leans on:

- {e.g., The Fracture (Credibility and Moat section)}
- {e.g., The 10/90 Prospect Fractal}
- {e.g., The Teacher Frame}

---

## Notes

{Free text — production notes, issues, things to remember for v2}

---

## Document Control

| Field | Value |
|---|---|
| Created | {ISO} |
| Last Modified | {ISO} |
| Version | 0.1.0 |
| Status | {matches Status above} |
| Authority | Dave Barton |
