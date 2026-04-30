# PLATFORM-X
## X (Twitter) strategy for SVG Agency — Dave Barton's insurance informatics voice, unfiltered.
### Status: BUILD
### Medium: process
### Business: svg-agency

---

# IDENTITY (Thing -- what this IS)

_Everything in this cluster answers: what exists? These are constants that don't change regardless of who reads this or when._

## 1. IDENTITY

| Field | Value |
|-------|-------|
| ID | CONTENT-X-001 |
| Name | Platform X (Twitter) Strategy |
| Medium | process |
| Business Silo | svg-agency |
| CTB Position | leaf -- fleet/content branch |
| ORBT | BUILD |
| Strikes | 0 |
| Authority | inherited -- CONTENT-LIB (SALES-CONTENT-LIBRARY) |
| Last Modified | 2026-04-12 |
| BAR Reference | none |

### HEIR (8 fields -- Aviation Model, Bedrock S8)

| Field | Value |
|-------|-------|
| sovereign_ref | imo-creator |
| hub_id | platform-x |
| ctb_placement | leaf |
| imo_topology | output |
| cc_layer | CC-04 process |
| services | Postiz (self-hosted), X API |
| secrets_provider | doppler |
| acceptance_criteria | Daily posting cadence achieved for 14 consecutive days with engagement baseline established |

---

## 2. PURPOSE

_What breaks without it. What business outcome it serves. If you can't answer this, it shouldn't exist._

Without a defined X strategy, Dave posts randomly or not at all. The insurance informatics positioning dies in silence. X is the only platform where Dave's natural voice -- short, declarative, confrontational -- maps 1:1 to the medium's native format. This document turns Dave's voice library into a repeatable posting engine that builds authority with benefits consultants, HR tech, and insurance operations professionals.

---

## 3. RESOURCES

_Everything this depends on. A mechanic reads this and knows exactly what to set up before it can run._

### Dependencies

| Dependency | Type | What It Provides | Status |
|-----------|------|-----------------|--------|
| Voice Library | content | One-liners, thread seeds, terminology | DONE |
| Postiz | tool | Scheduling, publishing, analytics | DONE |
| X Account (@davebartonsvg) | platform | Distribution channel | DONE |
| SALES-CONTENT-LIBRARY | process | Content strategy backbone, approved messaging | DONE |
| Booking Link | CTA | https://calendar.app.google/VT41mpEgTWDexFET8 | DONE |

### Downstream Consumers

| Consumer | What It Needs |
|----------|--------------|
| SVG Agency website | Social proof, embedded timeline |
| Email outreach | X presence validates sender credibility |
| Sales conversations | Prospect sees thought leadership before call |
| LinkedIn cross-post candidates | Thread content repurposed for long-form |

### Tools & Integrations

| Item | Type | Cost Tier | Credentials | What It Does |
|------|------|-----------|-------------|-------------|
| Postiz | Social scheduler | Free (self-hosted) | Doppler: POSTIZ_* | Schedules and publishes posts |
| X/Twitter | Platform | Free tier | Doppler: X_API_KEY | Distribution |

### Secrets (if applicable)

| Secret | Doppler Project | Config | Used By |
|--------|----------------|--------|---------|
| X_API_KEY | imo-creator | dev | Postiz integration |
| X_API_SECRET | imo-creator | dev | Postiz integration |

---

# CONTRACT (Flow -- what flows through this)

_Everything in this cluster answers: what moves? How does data/work enter, get processed, and exit?_

## 4. IMO -- Input, Middle, Output

### Two-Question Intake (Bedrock S3)
1. **"What triggers this?"** -- Daily cadence. Every day, a post goes out. Industry news triggers commentary. Voice library provides evergreen rotation.
2. **"How do we get it?"** -- Voice library (verbatim one-liners), industry news feeds (commentary), Dave's direct input (threads on specific concepts).

### Input

Three input streams, priority ordered:

1. **Voice Library (evergreen)** -- Pre-approved one-liners. Verbatim. No editing. These are Dave's locked constants. Rotate through them on a cycle.
2. **Industry News (reactive)** -- Insurance/benefits industry news that Dave can quote-tweet with a take. The news is the variable. Dave's framework is the constant.
3. **Concept Threads (planned)** -- Deeper breakdowns of Dave's intellectual property: 90/15 rule, Layer 1/Layer 2, operational cost management. These get scheduled weekly.

### Middle

| Step | Input | What Happens | Output | Tool Used |
|------|-------|-------------|--------|-----------|
| 1 | Voice library entry OR news item OR concept | Classify: one-liner, commentary, or thread | Content type identified | Manual / LLM assist |
| 2 | Classified content | Draft in Dave's voice (or use verbatim from library) | Draft post/thread | Manual / LLM assist |
| 3 | Draft | Voice check -- does this sound like Patton in a benefits office? | Approved draft | Manual gate |
| 4 | Approved draft | Schedule in Postiz | Scheduled post | Postiz |
| 5 | Published post | Monitor engagement (likes, replies, profile visits) | Engagement data | X Analytics |

### Output

- Published tweets/threads on X
- Engagement metrics feeding back into content selection
- Profile authority building over time (follower growth, reply quality)
- Booking link clicks from threads

### Circle (Bedrock S5)

Output feeds back as input through two loops:

1. **Engagement loop:** Which content types get traction? One-liners that hit get repeated. Threads that flop get reworked or retired. Engagement data selects for what resonates.
2. **Voice refinement loop:** Industry responses reveal which framings land. "You can't stop claims" might outperform "Premiums don't equal cost." The market tells you which constant to lead with.

Setpoint: Daily post published. Weekly thread published. Engagement trending upward over 30-day rolling window.

---

## 5. DATA SCHEMA

_Where the data lives. What's read, written, joined. The plumbing._

### READ Access

| Source | What It Provides | Join Key |
|--------|-----------------|----------|
| Voice Library (SALES-CONTENT-LIBRARY) | Approved one-liners, talking points | content_id |
| X Analytics | Engagement data per post | tweet_id |
| Industry news feeds | Raw news for commentary | URL |

### WRITE Access

| Target | What It Writes | When |
|--------|---------------|------|
| X (via Postiz) | Published tweets/threads | Step 4 (schedule) |
| Postiz analytics | Post performance data | Automatic |

### Join Chain

```
Voice Library (content_id)
  -> Postiz (scheduled_post_id)
    -> X (tweet_id)
      -> X Analytics (engagement per tweet_id)
```

### Forbidden Paths

| Action | Why |
|--------|-----|
| Editing voice library one-liners before posting | Dave's voice is a locked constant. Verbatim or don't post it. |
| Auto-posting without voice check | Step 3 is a human gate. No automation bypasses it. |
| Cross-posting identical content to LinkedIn | Different medium, different format. Repurpose, don't duplicate. |

---

## 6. DMJ -- Define, Map, Join (law/doctrine/DMJ.md)

_Three steps. In order. Can't skip._

### 6a. DEFINE (Build the Key)

| Element | ID | Format | Description | C or V |
|---------|-----|--------|-------------|--------|
| Voice | VOC-01 | text, max 280 chars | Dave's one-liners, verbatim from library | C |
| Commentary | COM-01 | quote tweet + text, max 280 chars | Dave's take on industry news | V (news changes, voice doesn't) |
| Thread | THR-01 | 2-7 tweets, sequential | Concept breakdown with CTA on final tweet | C (structure) / V (topic) |
| CTA | CTA-01 | URL | Booking link: https://calendar.app.google/VT41mpEgTWDexFET8 | C |
| Posting cadence | CAD-01 | 1-2 posts/day, 7 days/week | Minimum daily output | C |
| Hashtag | HSH-01 | #insuranceinformatics | Only hashtag used, and only when relevant | C |
| Anti-patterns | ANT-01 | list of prohibitions | Things that never appear in SVG X content | C |

### 6b. MAP (Connect Key to Structure)

| Source | Target | Transform |
|--------|--------|-----------|
| Voice Library one-liner | Tweet (VOC-01) | direct -- verbatim copy |
| Industry news URL | Quote tweet (COM-01) | commentary -- Dave's take prepended |
| Concept (90/15, L1/L2) | Thread (THR-01) | structure -- break into 3-7 sequential tweets |
| Thread final tweet | CTA (CTA-01) | append -- booking link added to closing tweet |

### 6c. JOIN (Path to Spine)

| Join Path | Type | Description |
|-----------|------|-------------|
| Voice Library -> X post | direct | One-liners copy verbatim |
| Industry news -> X commentary | indirect | News filtered through Dave's framework, then posted |
| Concept -> Thread -> CTA -> Booking | multi-hop | IP breakdown leads to conversion action |

_Back-propagate to 6a if join reveals a gap. The Circle closes._

---

## 7. CONSTANTS & VARIABLES (Bedrock S2)

### Constants (structure -- never changes)
- Dave's voice: George Patton in a benefits office. Declarative. No hedging.
- Core message: "You can't stop claims. You can only manage the cost."
- Posting cadence: 1-2 per day, every day
- Thread max length: 7 tweets
- CTA: booking link on threads, profile link on one-liners
- No emoji in posts
- No hashtag spam (only #insuranceinformatics, only when needed)
- No engagement bait ("thoughts?", "agree?", retweet giveaways)
- Voice library one-liners are verbatim -- never edited for X
- Different content for different platforms (no cross-post duplication)

### Variables (fill -- changes every run/cycle)
- Which one-liner to post today (rotation selection)
- Which news item to comment on (market-driven)
- Which concept to thread this week (editorial calendar)
- Engagement metrics per post (market feedback)
- Optimal posting time (learned from analytics)
- Follower count and growth rate

---

## 8. STOP CONDITIONS (Bedrock S6)

| Condition | Action |
|-----------|--------|
| Can't answer two-question intake | HALT |
| Voice library exhausted and no new entries approved | HALT -- replenish library |
| Post sounds like a different person than Dave | HALT -- voice check failed |
| Thread exceeds 7 tweets | HALT -- restructure or split |
| Engagement trending down for 30+ days | Troubleshoot -- diagnose content/timing/audience |
| Strike 3 on same content type flopping | Troubleshoot/Train -- retire that format |
| Dave says stop | HALT |

---

# GOVERNANCE (Change -- how this is controlled)

_Everything in this cluster answers: what transforms? How is quality measured, verified, certified?_

## 9. VERIFICATION

_Executable proof that it works. Run these._

```
1. Post a voice library one-liner -> expected: published on X within 5 min of scheduled time
2. Quote-tweet industry news with commentary -> expected: Dave's framework visible, not just agreement
3. Publish a 5-tweet thread with CTA -> expected: thread displays correctly, booking link clickable
4. Check Postiz scheduling -> expected: next 3 days have at least 1 post each
5. Review 7-day analytics -> expected: impressions > 0, at least 1 engagement action per post average
```

**Three Primitives Check (Bedrock S1):**
1. **Thing:** Does the X account exist? Is Postiz configured? Is the voice library populated?
2. **Flow:** Does content move from library -> Postiz -> X -> analytics -> back to content selection?
3. **Change:** Does the post actually publish? Does engagement data actually return? Does the Circle close?

---

## 10. ANALYTICS

_The BUILD->OPERATE gate. Three sub-layers._

### 10a. Metrics

_Define BEFORE build starts._

| Metric | Unit | Baseline | Target | Tolerance |
|--------|------|----------|--------|-----------|
| Posts per day | count | BASELINE | 1-2 | 0 days with 0 posts |
| Impressions per post | count | BASELINE | after 30 days | trending up |
| Engagement rate | % | BASELINE | after 30 days | not declining |
| Profile visits per week | count | BASELINE | after 30 days | trending up |
| Booking link clicks per month | count | BASELINE | after 60 days | > 0 |
| Thread completion rate | % | BASELINE | > 50% read to final tweet | after 30 days |

### 10b. Sigma Tracking (Bedrock S2)

| Metric | Run 1 | Run 2 | Run 3 | Trend | Action |
|--------|-------|-------|-------|-------|--------|
| Posts/day | - | - | - | BASELINE | Establish after week 1 |
| Engagement rate | - | - | - | BASELINE | Establish after week 2 |
| Booking clicks | - | - | - | BASELINE | Establish after month 1 |

### 10c. ORBT Gate Rules

| From | To | Gate |
|------|-----|------|
| BUILD | OPERATE | 14 consecutive days posted + engagement baseline established + voice approved by Dave |
| OPERATE | REPAIR | 3+ days missed OR engagement declining 30+ days OR voice drift detected |
| REPAIR | OPERATE | Cadence restored + engagement stabilized + Dave sign-off |
| Any (Strike 3) | TROUBLESHOOT/TRAIN | Same failure 3x -> rethink the format, not the volume |

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
| heir_ref | Full HEIR record |
| orbt_entered | BUILD |
| orbt_exited | OPERATE |
| action | Certified -- airworthiness confirmed |
| gates_passed | { imo: true, ctb: true, circle: true } |
| signed_by | Auditor (different engine than builder) |
| signed_at | timestamp |

---

## 13. FLEET FAILURE REGISTRY

| Pattern ID | Location | Error Code | First Seen | Occurrences | Strike Count | Status |
|-----------|----------|-----------|-----------|-------------|-------------|--------|
| -- | -- | -- | -- | -- | -- | -- |

**Strike 1:** Repair. **Strike 2:** Scrutiny. **Strike 3:** Troubleshoot/Train -> Airworthiness Directive.

---

## 14. SESSION LOG

| Date | What Was Done | LBB Record |
|------|---------------|-----------|
| 2026-04-12 | Initial PLATFORM-X strategy doc created in UNIFIED_TEMPLATE format | pending |

---

# APPENDIX A: SAMPLE CONTENT (5 Examples)

## Sample 1: Voice Library One-Liner

```
You can't stop claims. You can only manage the cost.
```

Type: VOC-01. Verbatim from library. No CTA. No hashtag. Let it stand alone.

## Sample 2: Voice Library One-Liner (Competitive)

```
Commission brokers are replaceable. Operations is not.
```

Type: VOC-01. Verbatim. This one gets engagement from brokers who disagree. Let them. The operations people will follow.

## Sample 3: Industry Commentary (Quote Tweet)

```
[Quote tweet of: "Blue Cross announces 12% premium increase for 2027"]

Premiums don't equal cost.

The premium went up because nobody managed the claims underneath it. The 12% is a symptom. The diagnosis is operational.
```

Type: COM-01. News is the variable. Dave's framework is the constant. Three sentences max on the commentary.

## Sample 4: Concept Thread (90/15 Rule)

```
Tweet 1/5:
The 90/15 rule is the only number you need to understand health insurance cost.

Tweet 2/5:
90% of your claims cost comes from 15% of your population. Every year. Every group. Every carrier. The ratio is a constant.

Tweet 3/5:
So why does your broker spend all their time on the renewal negotiation instead of the 15% driving the cost?

Because renewals are easy. Operations is hard.

Tweet 4/5:
Insurance informatics exists to manage that 15%. Not with wellness programs. Not with plan design gimmicks. With data, identification, and intervention.

Tweet 5/5:
If you want to see what managing the 15% actually looks like, book 15 minutes.

https://calendar.app.google/VT41mpEgTWDexFET8
```

Type: THR-01. 5 tweets. CTA on final tweet only. Each tweet stands alone but builds the argument. No hashtag needed -- the content IS the positioning.

## Sample 5: Concept One-Liner (Standalone)

```
The math is simple. Your broker just doesn't do it.
```

Type: VOC-01. Verbatim. Short enough to get shared. Confrontational enough to get quoted. The replies become the engagement.

---

# APPENDIX B: ANTI-PATTERNS (Hard No)

| Anti-Pattern | Why |
|-------------|-----|
| Threads longer than 7 tweets | Attention dies. If it takes more than 7, you don't understand it well enough. |
| Hashtag spam (#insurance #benefits #HR #healthtech) | Screams amateur. One hashtag max, and only #insuranceinformatics. |
| "Thoughts?" or "Agree?" at the end of posts | Engagement bait. Dave doesn't ask permission. He states position. |
| Retweet giveaways | This is a professional authority channel, not a consumer brand. |
| Emoji | Dave's voice doesn't use them. The words do the work. |
| "I'm excited to announce..." | Corporate filler. Say what happened. Skip the feelings. |
| Threads that start with "THREAD:" or "1/" | The platform shows it's a thread. Don't announce what's obvious. |
| Apologizing for being direct | Directness is the brand. Never soften it. |

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
