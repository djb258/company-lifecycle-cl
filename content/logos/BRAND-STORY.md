# Insurance Informatics — Brand Story

## The one-sentence version

**Insurance Informatics is the merger of two presences — Dave Barton (25 years of insurance / broker discipline) + SVG Agency (IT / systems discipline, web presence at `weewee.me`) — consolidated into one named discipline at one domain: `insuranceinformatics.com`.**

## The two merging presences

| Presence | Web presence | Role | Discipline contributed |
|---|---|---|---|
| **Dave Barton** (personal insurance / broker practice) | (personal broker site) | Insurance / broker side | 25 years of benefits / insurance operator experience |
| **SVG Agency** (Shenandoah Valley Group — per Mailgun domains `shenandoahvalleygrp.com` / `shenvalleygroup.com`) | `weewee.me` | IT / tech / systems side | Systems thinking, data discipline, technology operator experience |
| **→ `insuranceinformatics.com`** | The one canonical destination | The synthesis | The named discipline that emerges when you combine the two |

## Why this matters for brand decisions

### The brand IS the merger
Two separate histories / practices become one thing at one place. The brand isn't "Dave Barton" and isn't "SVG Agency" — it's the synthesis. Insurance Informatics = what emerges when 25 years of insurance operator experience meets IT systems discipline.

### The .com ownership closes the loop
`insuranceinformatics.com` — plus `.agency`, `.net`, `.info`, `.shop`, `.xyz`, `.online`, `.club`, and hyphenated variants — means nobody else can credibly claim this as a named discipline. The domain ownership IS the IP position.

### "Insurance Informatics" fits an established naming pattern — it's the missing sibling, not a made-up term

"Insurance Informatics" is not a coined phrase. It's a natural extension of a 50+ year old naming convention in healthcare + data fields:

- **Medical Informatics** — runs hospitals
- **Clinical Informatics** — runs care delivery
- **Health Informatics** — runs health data systems
- **Bioinformatics** — biology + data
- **Nursing Informatics** — nursing practice + data
- **Public Health Informatics** — population health + data
- **Dental Informatics** — real field
- **Pharmacy Informatics** — real field
- **Consumer Health Informatics** — real field

Every adjacent healthcare-plus-data discipline has a named `-informatics` specialization. **Insurance — which touches every one of the above — didn't.** That's a structural anomaly, not a branding invention. Dave filled it.

The positioning is three layers deep:
1. **Pattern:** `-informatics` naming convention is 50+ years old, institutionally accepted
2. **Gap:** every adjacent field named itself; insurance never did
3. **Claim:** Dave named the discipline + owns the exact-match `.com` + operates the discipline at depth

Any challenge to "Insurance Informatics is a real thing" gets defeated by pointing at the list above. If Dental Informatics is a field, Insurance Informatics is a field. You can't concede the pattern and reject this one instance.

### The .com availability IS the market proof
Category-defining domains don't sit around. If anyone else in the country were actually running Insurance Informatics as a named operational discipline — at scale, at operational depth — the exact-match `.com` for a field that contains $1T+ of US healthcare spend would have been gone years ago. It wasn't. Dave claimed it because it was available. That's not self-promotion — it's falsifiable evidence: anyone can verify the domain record, anyone can search for competitors in the named category, and won't find them. **The empty namespace is the market telling you no one else is doing this.**

This is a voice-library-grade anchor:
- **Short form:** "I'm the only one in the country running this as a named discipline. If anyone else were, the .com would have been gone."
- **Dare form:** "Look it up. Check who owned `insuranceinformatics.com` before me. Nobody. Because nobody else was doing this."

## Decision implications

### Logo direction (ranked)
Pure wordmark. The name IS the brand. The merger story is told BY the name (two historically-separate words now standing side-by-side as one discipline). No decorative synthesis icon needed — it would over-signal what the wordmark already says.

1. **#04 lowercase domain-first** — `insuranceinformatics.com` IS the mark. Strongest expression of "the domain is the destination."
2. **#02 Swiss geometric** — most timeless + enterprise-credible. Works at any scale.
3. **#07 II monogram** — only concept with a standalone icon. The II reads as both initials AND as the "two pillars combined" Pattern-of-Twos motif.

See `fleet/content/logos/concepts/README.md` for all 7 concept variants with the full ranking.

### Site architecture
- **`insuranceinformatics.com`** = the one authoritative home
- **Dave Barton's personal broker web presence** → redirect or absorb
- **`weewee.me`** (SVG Agency's IT/tech site) → redirect or absorb
- Other owned TLDs (`.agency`, `.net`, `.info`, `.shop`, `.xyz`, `.online`, `.club`, hyphenated) → 301 redirect to the .com
- Prospect CF Pages → `insuranceinformatics.com/c/{slug}?t={token}` (already updated in `CLIENT-CF-PAGE-RUNBOOK.md`)

### Email
- **Human-facing email address stays short:** `dave@svg.agency` (17 chars — practical, memorable, already established). `dave@insuranceinformatics.com` is 29 chars — too long for business cards, dictation, typing. Standard pattern (Harvard Business Review uses `@hbr.org`, not `@harvardbusinessreview.org`).
- **Mailgun sending infrastructure** uses `mg.insuranceinformatics.*` domains — ALREADY aligned with the brand destination. Outbound campaigns FROM `@mg.insuranceinformatics.com` is correct for deliverability + brand reinforcement.
- **Signature reconciles both:**
  ```
  Dave Barton
  Insurance Informatics
  insuranceinformatics.com · dave@svg.agency
  ```
  Reads "Insurance Informatics" (brand), email is practical, website is authority.
- **Brand destination** = `insuranceinformatics.com` (where prospects LAND, not where they TYPE)

### Social
- LinkedIn, X, Instagram, Facebook — all profiles anchor `insuranceinformatics.com`
- Bio pivots to the named-discipline positioning
- "Insurance Informatics — 25 years insurance + IT systems discipline, unified"

### Taglines that fit the merger story (for use under the wordmark or in copy)

- **"25 years of insurance. Built on IT discipline."**
- **"Insurance + IT. One discipline."**
- **"The discipline of managing the 10%."**
- **"Where insurance meets IT."**
- **"A named discipline. One operator. One destination."**

### Voice-library connection

The merger story ties directly to existing VOICE-LIBRARY.md anchors:
- `insurance-informatics-def` — "Insurance informatics treats your health plan the same way hospitals treat patient data — as information to be managed, not a product to be sold."
- `dave-persona-intro` — "Dave Barton. I do something called insurance informatics — insurance + IT."

The brand story IS the discipline definition. Don't over-engineer.

## What's locked (do not drift)

1. Pure wordmark — no abstract icon (#7 II monogram is the exception and only if a standalone favicon mark is strictly needed)
2. `insuranceinformatics.com` as the one domain — other TLDs are redirects only
3. No personal name in the logo — the discipline is the brand, Dave is the operator
4. Monochrome capable — logo must work in black-on-white and white-on-black
5. Works at favicon size (16×16, 32×32) and billboard size

## Cross-reference

- Logo concepts: `fleet/content/logos/concepts/` (7 Pass-1 directions)
- Concepts ranking + notes: `fleet/content/logos/concepts/README.md`
- Main brand positioning: `fleet/content/INSURANCE-INFORMATICS-CTB.md` §50K
- Voice: `law/VOICE-LIBRARY.md`
- Site routing: `docs/processes/CLIENT-CF-PAGE-RUNBOOK.md`
- Email infra: `docs/processes/LCS-OUTREACH-RUNBOOK.md` §3 (14 Mailgun domains on mg.insuranceinformatics.*)
