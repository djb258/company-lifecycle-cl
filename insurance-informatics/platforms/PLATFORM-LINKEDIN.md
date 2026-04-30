# LinkedIn Platform Strategy — SVG Agency
## How Dave Barton shows up on LinkedIn. Voice, cadence, content types, anti-patterns, and the pipeline that feeds it.
### Status: BUILD
### Medium: process
### Business: svg-agency

---

# IDENTITY (Thing -- what this IS)

_Everything in this cluster answers: what exists? These are constants that don't change regardless of who reads this or when._

## 1. IDENTITY

| Field | Value |
|-------|-------|
| ID | PLAT-LINKEDIN |
| Name | LinkedIn Platform Strategy |
| Medium | process |
| Business Silo | svg-agency |
| CTB Position | branch -> fleet/content/PLATFORM-LINKEDIN.md (child of VOICE-LIBRARY.md, sibling of SALES-CONTENT-LIBRARY.md) |
| ORBT | BUILD |
| Strikes | 0 |
| Authority | inherited -- from law/VOICE-LIBRARY.md (voice constants) and law/doctrine/CONTENT-PIPELINE-PROCESS.md (pipeline) |
| Last Modified | 2026-04-12 |
| BAR Reference | none |

### HEIR (8 fields -- Aviation Model, Bedrock S8)

| Field | Value |
|-------|-------|
| sovereign_ref | imo-creator |
| hub_id | platform-linkedin |
| ctb_placement | branch |
| imo_topology | output |
| cc_layer | CC-03 context |
| services | LinkedIn (distribution), Postiz (scheduling), VOICE-LIBRARY (voice constants), SALES-CONTENT-LIBRARY (content index), Content Pipeline (upstream build) |
| secrets_provider | none |
| acceptance_criteria | Every LinkedIn post passes voice audit against VOICE-LIBRARY.md. 3-5 posts per week sustained. Zero banned phrases. Booking link or follow CTA on every post. |

---

## 2. PURPOSE

_What breaks without it. What business outcome it serves. If you can't answer this, it shouldn't exist._

Without this document, LinkedIn posts drift -- wrong tone, wrong cadence, wrong audience, wrong CTA. With it, every post is a voice-locked artifact that educates self-insured decision-makers, filters tire kickers, and drives bookings. LinkedIn is the public education channel where the 10% of companies who want to learn find Dave before outreach ever touches them.

---

## 3. RESOURCES

_Everything this depends on. A mechanic reads this and knows exactly what to set up before it can run._

### Dependencies

| Dependency | Type | What It Provides | Status |
|-----------|------|-----------------|--------|
| law/VOICE-LIBRARY.md | document | Voice constants, one-liners, banned phrases, core frames | DONE (v1.1) |
| fleet/content/SALES-CONTENT-LIBRARY.md | document | Cross-source Dewey index of content assets | DONE |
| law/doctrine/CONTENT-PIPELINE-PROCESS.md | process | Universal content pipeline (script to publish) | DONE |
| LinkedIn profile (linkedin.com/in/dbarton) | external | Distribution surface | DONE |
| Postiz (localhost:4200) | tool | Post scheduling and queue management | DONE |

### Downstream Consumers

| Consumer | What It Needs |
|----------|--------------|
| Inbound leads | Education content that pre-qualifies before first call |
| Gate 1 video follow-up | LinkedIn post reinforces what the personalized video showed |
| Brand authority | Consistent presence that positions Dave as the insurance informatics guy |
| Outreach pipeline | Warm prospects who already saw the LinkedIn content convert faster |

### Tools & Integrations

| Item | Type | Cost Tier | Credentials | What It Does |
|------|------|-----------|-------------|-------------|
| Postiz | Scheduling tool | Self-hosted (free) | localhost:4200 | Queues and publishes LinkedIn posts |
| LinkedIn | Distribution | Free | Dave's account | Publishing surface |
| VOICE-LIBRARY.md | Reference doc | N/A | Repo | Voice audit checklist |
| SALES-CONTENT-LIBRARY.md | Reference doc | N/A | Repo | Source material index |

### Secrets

| Secret | Doppler Project | Config | Used By |
|--------|----------------|--------|---------|
| N/A | N/A | N/A | No secrets required -- Postiz runs locally, LinkedIn is manual or local API |

---

# CONTRACT (Flow -- what flows through this)

_Everything in this cluster answers: what moves? How does data/work enter, get processed, and exit?_

## 4. IMO -- Input, Middle, Output

### Two-Question Intake (Bedrock S3)
1. **"What triggers this?"** -- A content idea, a data insight from DOL filings, a one-liner from VOICE-LIBRARY, an industry event, or a scheduled posting cadence (3-5x/week).
2. **"How do we get it?"** -- Pull from VOICE-LIBRARY one-liners, SALES-CONTENT-LIBRARY topics, DOL filing data, or real-time industry commentary. Write in Dave's voice. Schedule via Postiz.

### Input
Content source material: VOICE-LIBRARY one-liners, core frames (convenience store, pattern of twos, BUCA black box, Layer 1/Layer 2), DOL filing data insights, industry news, client anonymized results.

### Middle

| Step | Input | What Happens | Output | Tool Used |
|------|-------|-------------|--------|-----------|
| 1 | Content idea or scheduled slot | Select post type (educational, one-liner, data insight, industry commentary) | Post type declared | Manual |
| 2 | Post type + source material | Write post in Dave's voice per VOICE-LIBRARY constants | Draft post text | Manual or AI with voice audit |
| 3 | Draft post | Voice audit -- check against banned phrases, verify one-liners are verbatim, confirm tone is direct/confident/zero-desperation | Approved draft | VOICE-LIBRARY checklist |
| 4 | Approved draft | Add CTA (booking link or "follow for more") and hashtags (max 3-5) | Final post | Manual |
| 5 | Final post | Schedule in Postiz or publish directly | Published post | Postiz (localhost:4200) |
| 6 | Published post | Monitor engagement (views, comments, shares, booking clicks) | Engagement data | LinkedIn analytics |

### Output
Published LinkedIn post that educates self-insured decision-makers, reinforces Dave's authority as insurance informatics operator, and drives either a booking or a follow.

### Circle (Bedrock S5)
Engagement data feeds back as input. Posts that get high engagement reveal which frames resonate -- those patterns get promoted to recurring templates. Posts that flop get audited for voice drift or wrong audience targeting. Booking conversions from LinkedIn trace back to specific post types, closing the loop on what content actually drives pipeline.

---

## 5. DATA SCHEMA

_Where the data lives. What's read, written, joined. The plumbing._

### READ Access

| Source | What It Provides | Join Key |
|--------|-----------------|----------|
| law/VOICE-LIBRARY.md | Voice constants, one-liners, banned phrases | path |
| fleet/content/SALES-CONTENT-LIBRARY.md | Content topics and source material | subject_id |
| DOL filing data (Neon outreach DB) | Employer plan data for data insight posts | ein / company_name |
| LinkedIn analytics | Prior post performance | post URL |

### WRITE Access

| Target | What It Writes | When |
|--------|---------------|------|
| Postiz queue | Scheduled posts | Step 5 (schedule) |
| LinkedIn | Published posts | Step 5 (publish) |
| LBB records | Post performance and learnings | After engagement review |

### Join Chain

```
Content idea
  -> VOICE-LIBRARY (voice constants)
    -> SALES-CONTENT-LIBRARY (source material)
      -> Draft post (written in voice)
        -> Postiz queue
          -> LinkedIn (published)
            -> Engagement data
              -> LBB (learnings ingested)
```

### Forbidden Paths

| Action | Why |
|--------|-----|
| Post without voice audit | Voice drift kills brand authority. Every post must pass VOICE-LIBRARY check. |
| Use banned phrases ("reach out", "best-in-class", "I think...", etc.) | VOICE-LIBRARY Section "What He Never Says" -- hard stop. |
| Use emojis | Not Dave's voice. Period. |
| Use exclamation marks | Desperation signal. Dave doesn't exclaim. |
| Post without CTA | Every post earns a booking link or a follow. No orphan content. |
| Let AI write without voice audit | AI defaults to corporate speak. Must audit every word against VOICE-LIBRARY. |
| Post more than 5 hashtags | LinkedIn algorithm penalizes hashtag spam. Max 3-5, all relevant. |

---

## 6. DMJ -- Define, Map, Join (law/doctrine/DMJ.md)

_Three steps. In order. Can't skip._

### 6a. DEFINE (Build the Key)

| Element | ID | Format | Description | C or V |
|---------|-----|--------|-------------|--------|
| Voice constants | LI-001 | VOICE-LIBRARY.md sections | Tone, sentence structure, banned phrases, one-liners | C |
| Post types | LI-002 | enum (educational, one-liner, data-insight, industry-commentary, qualifying) | Categories of LinkedIn content | C |
| Posting cadence | LI-003 | 3-5 posts per week | Frequency target | C |
| CTA options | LI-004 | enum (booking-link, follow-for-more) | Every post gets one | C |
| Hashtag set | LI-005 | max 5 from approved list | #insuranceinformatics #employeebenefits #selfinsured #healthinsurance | C |
| Booking link | LI-006 | URL: https://calendar.app.google/VT41mpEgTWDexFET8 | The conversion destination | C |
| LinkedIn profile | LI-007 | URL: linkedin.com/in/dbarton | The distribution surface | C |
| Target audience | LI-008 | CEOs, CFOs, HR directors at self-insured employers 50-5000 EE | Who reads this | C |
| Post content | LI-009 | text (variable per post) | The actual words | V |
| Topic selection | LI-010 | string | What this post is about | V |
| Publish date/time | LI-011 | datetime | When it goes live | V |
| Engagement metrics | LI-012 | views/comments/shares/clicks | Post performance | V |

### 6b. MAP (Connect Key to Structure)

| Source | Target | Transform |
|--------|--------|-----------|
| VOICE-LIBRARY one-liners | Post content seed | Direct -- use verbatim |
| SALES-CONTENT-LIBRARY topic | Post topic | Select and scope to one idea |
| DOL filing data | Data insight post | Extract one stat, add Dave's interpretation |
| Draft post | Voice audit result | Check against VOICE-LIBRARY constants |
| Approved post | Postiz queue | Schedule with CTA and hashtags |

### 6c. JOIN (Path to Spine)

| Join Path | Type | Description |
|-----------|------|-------------|
| Post topic -> SALES-CONTENT-LIBRARY subject_id | direct | Every post traces to a classified content subject |
| Post one-liners -> VOICE-LIBRARY constants | direct | Verbatim usage, traceable to source |
| Booking clicks -> outreach pipeline | indirect | LinkedIn engagement feeds into lead qualification |
| Post performance -> LBB records | direct | Engagement data ingested for future content planning |

_Back-propagate to 6a if join reveals a gap. The Circle closes._

---

## 7. CONSTANTS & VARIABLES (Bedrock S2)

### Constants (structure -- never changes)
- Dave's voice (VOICE-LIBRARY.md -- tone, sentence structure, banned phrases, one-liners)
- The core frame: "You can't stop claims. You can only manage the cost."
- The pattern of twos (every concept breaks into two at every altitude)
- The convenience store metaphor (fully insured = convenience store, self-insured = grocery store)
- The 10/90 prospect fractal (10% want to learn, 90% stay where they are)
- The BUCA black box frame (insurance informatics opens the box)
- Target audience: CEOs, CFOs, HR directors at self-insured employers (50-5000 EE)
- Posting cadence: 3-5x per week
- CTA on every post: booking link or "follow for more"
- Anti-patterns: no emojis, no exclamation marks, no buzzwords, no corporate speak, no "reach out"
- Booking link: https://calendar.app.google/VT41mpEgTWDexFET8
- Hashtag ceiling: max 3-5 per post

### Variables (fill -- changes every run/cycle)
- The specific topic per post
- The specific one-liner or frame selected
- The post copy (always in voice, but the words change)
- The data point cited (DOL filing, industry stat)
- The publish date and time
- The engagement metrics after publish
- Industry news being commented on

---

## 8. STOP CONDITIONS (Bedrock S6)

| Condition | Action |
|-----------|--------|
| Can't answer two-question intake | HALT -- no post without a clear trigger and source |
| Draft fails voice audit (banned phrase detected) | REWRITE -- do not publish until clean |
| No CTA on post | ADD CTA -- every post earns a booking or follow |
| More than 5 hashtags | TRIM -- LinkedIn penalizes spam |
| Emoji detected in draft | REMOVE -- not Dave's voice |
| Exclamation mark detected in draft | REMOVE -- desperation signal |
| Post contains "I think" / "maybe" / "reach out" / "best-in-class" | REWRITE -- banned phrase |
| 3 consecutive posts with zero engagement | DIAGNOSE -- wrong topic, wrong time, or wrong audience |
| Strike 3 on same voice violation | Troubleshoot/Train -- update process or re-read VOICE-LIBRARY |

---

# GOVERNANCE (Change -- how this is controlled)

_Everything in this cluster answers: what transforms? How is quality measured, verified, certified?_

## 9. VERIFICATION

_Executable proof that it works. Run these._

```
1. Write a draft post using one-liner #3 ("Premiums do not equal cost") -> expected: short educational post, no banned phrases, CTA present, max 3-5 hashtags
2. Run voice audit on draft -> expected: passes all VOICE-LIBRARY checks (no "reach out", no emojis, no exclamation marks, no hedging language)
3. Schedule via Postiz (localhost:4200) -> expected: post queued with correct date/time
4. Publish to LinkedIn -> expected: post live on linkedin.com/in/dbarton
5. Check CTA -> expected: booking link (https://calendar.app.google/VT41mpEgTWDexFET8) or "follow for more" present
6. Review 7-day engagement -> expected: views, comments, shares tracked and ingested to LBB
```

**Three Primitives Check (Bedrock S1):**
1. **Thing:** Does the post exist on LinkedIn? Is the booking link live? Is the Postiz queue populated?
2. **Flow:** Does content flow from VOICE-LIBRARY -> draft -> voice audit -> Postiz -> LinkedIn -> engagement data -> LBB?
3. **Change:** Does each post correctly transform a voice constant or data insight into audience-appropriate educational content with CTA?

---

## 10. ANALYTICS

_The BUILD to OPERATE gate. Three sub-layers._

### 10a. Metrics

_Define BEFORE build starts._

| Metric | Unit | Baseline | Target | Tolerance |
|--------|------|----------|--------|-----------|
| Posts per week | count | BASELINE | 3-5 | min 3 |
| Voice audit pass rate | % | BASELINE | 100% | 0 failures |
| Avg views per post | count | BASELINE | rising trend | flat = investigate |
| Booking link clicks per week | count | BASELINE | rising trend | flat = investigate |
| Banned phrase violations | count | BASELINE | 0 | 0 |
| CTA present rate | % | BASELINE | 100% | 0 missing |

### 10b. Sigma Tracking (Bedrock S2)

| Metric | Run 1 | Run 2 | Run 3 | Trend | Action |
|--------|-------|-------|-------|-------|--------|
| Posts per week | -- | -- | -- | PENDING | Establish baseline |
| Voice audit pass rate | -- | -- | -- | PENDING | Establish baseline |
| Avg views per post | -- | -- | -- | PENDING | Establish baseline |
| Booking clicks | -- | -- | -- | PENDING | Establish baseline |

### 10c. ORBT Gate Rules

| From | To | Gate |
|------|-----|------|
| BUILD | OPERATE | 3 consecutive weeks at 3+ posts/week, 100% voice audit, booking link on every post |
| OPERATE | REPAIR | Voice audit failure or cadence drops below 3/week for 2 weeks |
| REPAIR | OPERATE | Fix + 1 clean week + auditor verification |
| Any (Strike 3) | TROUBLESHOOT/TRAIN | Recurring voice drift or cadence failure -> review VOICE-LIBRARY, retrain process |

---

## 11. EXECUTION TRACE

_Append-only. Every action logged. The auditor reads this._

| Field | Format | Required |
|-------|--------|----------|
| trace_id | UUID | Yes |
| post_date | ISO-8601 | Yes |
| post_type | enum (educational / one-liner / data-insight / industry-commentary / qualifying) | Yes |
| topic | string | Yes |
| source_oneliner | VOICE-LIBRARY number or "original" | Yes |
| voice_audit_pass | boolean | Yes |
| cta_type | enum (booking-link / follow-for-more) | Yes |
| hashtags | JSON array | Yes |
| postiz_scheduled | boolean | Yes |
| linkedin_url | URL | If published |
| views_7d | integer | After 7 days |
| comments_7d | integer | After 7 days |
| shares_7d | integer | After 7 days |
| booking_clicks | integer | If trackable |
| signed_by | agent or manual | Yes |

---

## 12. LOGBOOK (After Certification Only)

_Created ONLY when the auditor certifies (BUILD to OPERATE). Append-only. The legal identity._

**No logbook during BUILD.**

### Birth Certificate

| Field | Value |
|-------|-------|
| heir_ref | Full HEIR record |
| orbt_entered | BUILD |
| orbt_exited | OPERATE |
| action | Certified -- LinkedIn platform strategy operational |
| gates_passed | { imo: true, ctb: true, circle: true } |
| signed_by | Auditor (different engine than builder) |
| signed_at | pending |

---

## 13. FLEET FAILURE REGISTRY

| Pattern ID | Location | Error Code | First Seen | Occurrences | Strike Count | Status |
|-----------|----------|-----------|-----------|-------------|-------------|--------|
| -- | -- | -- | -- | -- | -- | No failures registered yet |

**Strike 1:** Repair. **Strike 2:** Scrutiny. **Strike 3:** Troubleshoot/Train -> Airworthiness Directive.

---

## 14. SESSION LOG

| Date | What Was Done | LBB Record |
|------|---------------|-----------|
| 2026-04-12 | Initial build -- LinkedIn platform strategy on UNIFIED_TEMPLATE. Voice constants locked from VOICE-LIBRARY v1.1. 5 sample post templates included. | pending |

---

# APPENDIX A: POST TEMPLATES

These are ready-to-use templates. Fill the variable (the bracketed content). Everything else is constant.

---

### Template 1: THE EDUCATIONAL (core frame)

**Post type:** Educational
**Source:** VOICE-LIBRARY core frame + convenience store metaphor
**When to use:** 2-3x per week. The bread and butter.

```
Fully insured is the convenience store. Self-insured is the grocery store.

Nobody feeds a family out of a 7-Eleven. But employers sign up with BUCA
for their biggest operating expense after payroll and wonder why costs
keep going up.

Why? Because the carrier told them it was easier. And it is easier.
The problem is "easier" costs 30-50% more every year, forever, and the
carrier keeps every dollar you don't spend on claims.

Premiums don't equal cost.

[BOOKING CTA or FOLLOW CTA]

#insuranceinformatics #selfinsured #employeebenefits
```

**Voice audit checklist:**
- No emojis. No exclamation marks.
- "Premiums don't equal cost" is verbatim from VOICE-LIBRARY #3.
- "Convenience store / grocery store" is verbatim from VOICE-LIBRARY #15-16.
- CTA present. Hashtags at 3. Clean.

---

### Template 2: THE ONE-LINER (drop and walk away)

**Post type:** One-liner
**Source:** VOICE-LIBRARY one-liners (use verbatim)
**When to use:** 1x per week. Pattern interrupt. Short. Punchy.

```
You can't stop claims. Claims are going to happen no matter what.
The trick is to manage them, not overpay.

The math is simple.

https://calendar.app.google/VT41mpEgTWDexFET8

#insuranceinformatics #healthinsurance
```

**Voice audit checklist:**
- One-liner #1 used verbatim.
- "The math is simple" is verbatim from VOICE-LIBRARY #2 ("Here's how it works" / "The math is simple" pattern).
- Booking link is the CTA. No fluff around it. Just the link.
- Two hashtags. Under ceiling. Clean.

---

### Template 3: THE DATA INSIGHT (DOL filings / industry stats)

**Post type:** Data insight
**Source:** DOL filing data, industry research, VOICE-LIBRARY interpretation frame
**When to use:** 1x per week. Shows Dave has the data nobody else is looking at.

```
[COMPANY COUNT] self-insured employers in [STATE/REGION] changed brokers
last year.

Most of them will overpay in year one. The new broker doesn't know
their claims history yet. The carrier does. Guess who benefits from
that information gap.

I don't compete on product. Every broker sells the same carriers.
I compete on operations.

https://calendar.app.google/VT41mpEgTWDexFET8

#insuranceinformatics #selfinsured #employeebenefits
```

**Voice audit checklist:**
- "I don't compete on product. I compete on operations." is verbatim from VOICE-LIBRARY #19 / qualifying language.
- Data point is specific and concrete (not vague -- VOICE-LIBRARY sentence structure rule).
- No hedging ("I think", "maybe"). Declarative.
- Booking link CTA. Three hashtags. Clean.

---

### Template 4: THE QUALIFYING POST (tire kicker filter)

**Post type:** Qualifying
**Source:** VOICE-LIBRARY qualifying language + 10/90 prospect fractal
**When to use:** 1x every 2 weeks. Self-selection mechanism.

```
I want the top 10% of companies -- the ones who actually want to learn
how to save money. The other 90% can stay fully insured or stick with
whatever they're doing. No hard feelings.

10% of your employees cause 85% of your cost. That's what I manage.
10% of companies actually want to learn how to save that money.
That's who I market to. Same fractal, one altitude up.

I encourage you to compete it. Take my numbers to every broker.
Get their best deal. Their quote has commission baked in. Mine doesn't.

Follow for more. Or book a call:
https://calendar.app.google/VT41mpEgTWDexFET8

#insuranceinformatics #selfinsured #healthinsurance
```

**Voice audit checklist:**
- One-liners #35, #36, #8 used verbatim.
- "I encourage you to compete it" is the dare -- verbatim from VOICE-LIBRARY #8.
- Self-qualifying language per VOICE-LIBRARY qualifying section.
- Both CTAs (follow + booking link). Three hashtags. Clean.

---

### Template 5: THE INDUSTRY COMMENTARY (current events + reframe)

**Post type:** Industry commentary
**Source:** Industry news + VOICE-LIBRARY BUCA black box frame
**When to use:** When something happens in the industry worth commenting on. Opportunistic.

```
[INDUSTRY EVENT -- e.g., "United just posted $X billion in profit"
or "Another carrier raised rates 12%"]

AI is a black box. Fully insured is a black box. You can't see what's
going on inside either one. Insurance informatics is the discipline
that opens the box.

Everything breaks into two. Fixed and variable. Hospital and drugs.
90% routine, 10% catastrophic. Same pattern at every altitude.
That's the whole operating model.

You shop for everything else. Why not this.

https://calendar.app.google/VT41mpEgTWDexFET8

#insuranceinformatics #employeebenefits #healthinsurance
```

**Voice audit checklist:**
- One-liner #21 (AI/black box) used verbatim.
- One-liner #17 (pattern of twos) adapted but faithful.
- "You shop for everything else" is in Dave's voice -- rhetorical, pointed.
- No hedging. No corporate speak. No emojis. No exclamation marks.
- Booking link CTA. Three hashtags. Clean.

---

## APPENDIX B: VOICE AUDIT CHECKLIST (run on every post before publish)

| Check | Pass/Fail |
|-------|-----------|
| No emojis anywhere in post | |
| No exclamation marks | |
| No "I think" / "maybe" / "if you're interested" | |
| No "reach out" / "touch base" / "circle back" | |
| No "best-in-class" / "world-class" / "cutting-edge" | |
| No "honestly" / "to be transparent" | |
| No "we'd love the opportunity" | |
| No "let me know if you have questions" | |
| One-liners used verbatim (not paraphrased) | |
| CTA present (booking link or follow) | |
| Hashtags present (3-5 max, from approved list) | |
| Sentences are short and declarative | |
| One idea per sentence | |
| Tone is direct, confident, zero desperation | |
| Numbers are concrete, not vague | |

**Approved hashtag list:**
- #insuranceinformatics
- #employeebenefits
- #selfinsured
- #healthinsurance
- #benefitsmanagement

Pick 3-5 per post. Do not invent new ones without updating this list.

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-04-12 |
| Last Modified | 2026-04-12 |
| Version | 1.0.0 |
| Template Version | 1.0.0 |
| Medium | process |
| Derived From | law/VOICE-LIBRARY.md v1.1, fleet/content/SALES-CONTENT-LIBRARY.md, law/doctrine/CONTENT-PIPELINE-PROCESS.md |
| US Validated | pending |
| Governing Engine | law/doctrine/FOUNDATIONAL_BEDROCK.md + law/doctrine/DMJ.md |
