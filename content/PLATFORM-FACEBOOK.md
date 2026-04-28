# PLATFORM-FACEBOOK
## Facebook content strategy for SVG Agency — insurance informatics for local employers
### Status: BUILD
### Medium: process
### Business: svg-agency

---

# IDENTITY (Thing -- what this IS)

_Everything in this cluster answers: what exists? These are constants that don't change regardless of who reads this or when._

## 1. IDENTITY

| Field | Value |
|-------|-------|
| ID | PLATFORM-FB |
| Name | Facebook Platform Strategy |
| Medium | process |
| Business Silo | svg-agency |
| CTB Position | branch / fleet > content > platform-facebook |
| ORBT | BUILD |
| Strikes | 0 |
| Authority | inherited -- SVG Agency content strategy |
| Last Modified | 2026-04-12 |
| BAR Reference | none |

### HEIR (8 fields -- Aviation Model, Bedrock S8)

| Field | Value |
|-------|-------|
| sovereign_ref | imo-creator |
| hub_id | platform-facebook |
| ctb_placement | branch |
| imo_topology | output |
| cc_layer | CC-03 |
| services | Postiz (self-hosted), Facebook Business Page |
| secrets_provider | none |
| acceptance_criteria | Posts match voice spec, frequency maintained, booking link present on every CTA post |

---

## 2. PURPOSE

_What breaks without it. What business outcome it serves. If you can't answer this, it shouldn't exist._

Facebook is the community-facing arm of SVG Agency's content operation. Without it, the WV/PA local employer market never sees the insurance informatics message outside of cold outreach and referrals. Facebook builds the ambient authority that makes the phone ring before the email lands -- local business owners see Dave Barton explaining health insurance cost management in plain language, and when renewal season hits, they already know who to call.

---

## 3. RESOURCES

_Everything this depends on. A mechanic reads this and knows exactly what to set up before it can run._

### Dependencies

| Dependency | Type | What It Provides | Status |
|-----------|------|-----------------|--------|
| Postiz (self-hosted) | tool | Post scheduling, queue management | DONE |
| SVG Agency Facebook Page | platform | Distribution channel | DONE |
| Google Calendar booking | service | CTA destination | DONE |
| Gate content (video clips) | content | Raw material for video posts | PENDING |
| LCS pipeline output | process | Prospect intelligence for relevant content | DONE |

### Downstream Consumers

| Consumer | What It Needs |
|----------|--------------|
| Booking calendar | Inbound meeting requests from CTA |
| SVG Agency brand | Consistent voice and authority positioning |
| Outreach pipeline | Warm prospects who recognize the name |

### Tools & Integrations

| Item | Type | Cost Tier | Credentials | What It Does |
|------|------|-----------|-------------|-------------|
| Postiz | scheduler | Free (self-hosted) | Local instance | Schedules and publishes posts |
| Facebook Business Suite | platform | Free | SVG Agency page admin | Native analytics, engagement |
| Google Calendar | booking | Free | Google Workspace | Appointment scheduling via link |

### Secrets

None required. Postiz runs locally. Facebook auth is page-level admin.

---

# CONTRACT (Flow -- what flows through this)

_Everything in this cluster answers: what moves? How does data/work enter, get processed, and exit?_

## 4. IMO -- Input, Middle, Output

### Two-Question Intake (Bedrock S3)
1. **"What triggers this?"** -- Content calendar cadence (2-3x/week) plus gate events (new video clip, relevant local news, renewal season patterns)
2. **"How do we get it?"** -- Manual creation using voice spec + sample templates below, scheduled via Postiz

### Input
- Insurance informatics concepts (cost management, claims data, renewal strategy)
- Gate video clips (when available)
- Local business context (WV/PA market conditions, employer pain points)
- Prospect intelligence from LCS pipeline (what industries, what sizes, what problems)

### Middle

| Step | Input | What Happens | Output | Tool Used |
|------|-------|-------------|--------|-----------|
| 1 | Content idea / calendar slot | Draft post using voice spec and template | Raw post text | Manual / AI assist |
| 2 | Raw post text | Voice check -- does it sound like Dave? | Approved draft | Manual review |
| 3 | Approved draft | Schedule in Postiz with timing | Queued post | Postiz |
| 4 | Published post | Monitor engagement, respond to comments | Engagement data | Facebook Business Suite |

### Output
- Published Facebook posts (2-3x/week)
- Engagement metrics (reach, comments, shares, link clicks)
- Inbound booking requests via CTA link
- Brand awareness in local employer market

### Circle (Bedrock S5)
Post performance feeds back into content selection. Posts that generate comments and shares signal resonant topics -- double down. Posts that flatline signal either wrong topic or wrong format -- adjust. Booking link clicks are the ultimate signal: did the content move someone to act? Engagement data from Facebook Business Suite closes the loop back to content planning.

---

## 5. DATA SCHEMA

_Where the data lives. What's read, written, joined. The plumbing._

### READ Access

| Source | What It Provides | Join Key |
|--------|-----------------|----------|
| Content templates (this doc) | Post structure and voice spec | template_id |
| LCS pipeline / D1 | Prospect intelligence, industry patterns | company_id |
| Facebook Business Suite | Post analytics | post_id |

### WRITE Access

| Target | What It Writes | When |
|--------|---------------|------|
| Facebook Page | Published posts | Per schedule (2-3x/week) |
| Postiz queue | Scheduled drafts | During content creation |

### Join Chain

```
SVG Agency Facebook Page
  -> Postiz queue (post_id)
    -> Content template (template_id)
    -> Booking calendar (link -- no join, outbound CTA)
```

### Forbidden Paths

| Action | Why |
|--------|-----|
| Political content of any kind | Alienates half the audience, violates brand neutrality |
| Generic motivational posts | Dilutes authority positioning, indistinguishable from noise |
| Memes | Undermines professional credibility with employer market |
| "Like and share" begging | Signals desperation, Facebook algorithm penalizes it |
| Emoji in post text | Voice spec prohibits -- Dave doesn't talk in emoji |
| Cross-posting LinkedIn verbatim | Facebook is more conversational; tone must be adapted |

---

## 6. DMJ -- Define, Map, Join (law/doctrine/DMJ.md)

_Three steps. In order. Can't skip._

### 6a. DEFINE (Build the Key)

| Element | ID | Format | Description | C or V |
|---------|-----|--------|-------------|--------|
| Voice | FB-VOICE | text spec | George Patton in a benefits office -- direct, confident, slightly more conversational than LinkedIn | C |
| Audience | FB-AUD | segment def | Local WV/PA employers, 25-500 employees, community-connected | C |
| Frequency | FB-FREQ | schedule | 2-3 posts per week | C |
| Core Message | FB-MSG | tagline | "You can't stop claims. You can only manage the cost." | C |
| CTA Set | FB-CTA | text options | Booking link / "message me" / "share if this makes sense" | C |
| Post Topic | FB-TOPIC | text | The specific subject of a given post | V |
| Post Body | FB-BODY | text (50-300 words) | The actual post content | V |
| Media Attachment | FB-MEDIA | image/video/link/none | Optional visual or link share | V |
| Publish Time | FB-TIME | datetime | When the post goes live | V |
| Engagement Result | FB-ENG | metrics object | Reach, comments, shares, clicks | V |

### 6b. MAP (Connect Key to Structure)

| Source | Target | Transform |
|--------|--------|-----------|
| FB-VOICE | Every post | Voice filter applied during drafting |
| FB-AUD | Topic selection | Only topics relevant to local employers |
| FB-FREQ | Postiz calendar | 2-3 slots per week, spread across Tue/Thu/Sat |
| FB-MSG | Post content | Core message woven into educational content |
| FB-CTA | Post closing | One CTA per post, matched to content type |
| FB-TOPIC | Post draft | Selected from content categories below |
| FB-BODY | Facebook post | Final published text |

### 6c. JOIN (Path to Spine)

| Join Path | Type | Description |
|-----------|------|-------------|
| FB post -> SVG Agency brand -> Dave Barton identity | direct | Every post traces to Dave's personal authority |
| FB engagement -> booking calendar -> sales pipeline | direct | CTA clicks feed the pipeline |
| FB content -> LCS intelligence -> prospect relevance | indirect | Pipeline data informs what topics resonate |

---

## 7. CONSTANTS & VARIABLES (Bedrock S2)

### Constants (structure -- never changes)
- **Voice:** George Patton in a benefits office. Direct, confident, conversational. No hedging. No corporate speak. Accessible but never dumbed down.
- **Audience:** WV/PA local business owners, 25-500 employees. Community-oriented. They know Dave or know someone who knows Dave.
- **Core Message:** You cannot stop claims. You can only manage the cost. Insurance informatics is how.
- **Frequency:** 2-3x per week. Enough to stay visible, not enough to annoy.
- **CTA options:** Booking link (https://calendar.app.google/VT41mpEgTWDexFET8), "message me", "share if this makes sense"
- **Anti-patterns:** No memes, no politics, no generic motivation, no emoji, no engagement begging
- **Platform:** SVG Agency Facebook page, scheduled via Postiz

### Variables (fill -- changes every post)
- Topic selection
- Post body text
- Media attachment (video clip, shared article, image, or text-only)
- Publish timing
- Specific CTA chosen
- Engagement results

---

## 8. STOP CONDITIONS (Bedrock S6)

| Condition | Action |
|-----------|--------|
| Post doesn't match voice spec | HALT -- rewrite before publishing |
| Topic is political or divisive | HALT -- discard, pick new topic |
| No CTA on a CTA-type post | HALT -- add before publishing |
| Booking link is broken/outdated | HALT -- fix link before any posts go out |
| 3 consecutive posts with zero engagement | DIAGNOSE -- review topics, timing, and format |
| Strike 3 on same content failure pattern | Troubleshoot/Train |

---

# GOVERNANCE (Change -- how this is controlled)

_Everything in this cluster answers: what transforms? How is quality measured, verified, certified?_

## 9. VERIFICATION

_Executable proof that it works. Run these._

```
1. Read post aloud -- does it sound like Dave talking to a business owner at a chamber event? -> expected: yes, natural
2. Remove the author name -- could this post come from any insurance agent? -> expected: no, it's distinctly Dave's voice
3. Check CTA -- is the booking link present and functional? -> expected: link works, loads calendar
4. Check anti-patterns -- any emoji, memes, politics, engagement begging? -> expected: zero violations
5. Check length -- is it between 50-300 words? -> expected: within range
```

**Three Primitives Check (Bedrock S1):**
1. **Thing:** Does the post exist as a complete, publishable unit? (text + optional media + CTA)
2. **Flow:** Does the post reach the audience? (published via Postiz, visible on page)
3. **Change:** Does the post move someone toward booking? (CTA present, message clear)

---

## 10. ANALYTICS

_The BUILD->OPERATE gate. Three sub-layers._

### 10a. Metrics

_Define BEFORE build starts._

| Metric | Unit | Baseline | Target | Tolerance |
|--------|------|----------|--------|-----------|
| Post frequency | posts/week | BASELINE | 2-3 | min 2 |
| Avg reach per post | impressions | BASELINE | after 4 weeks | +10% month-over-month |
| Engagement rate | % (reactions+comments+shares / reach) | BASELINE | after 4 weeks | above 2% |
| Booking link clicks | clicks/month | BASELINE | after 4 weeks | upward trend |
| Voice compliance | % posts passing voice check | BASELINE | 100% | 0 tolerance for violation |

### 10b. Sigma Tracking (Bedrock S2)

| Metric | Run 1 | Run 2 | Run 3 | Trend | Action |
|--------|-------|-------|-------|-------|--------|
| Reach per post | TBD | TBD | TBD | TBD | Evaluate after 3 weeks |
| Engagement rate | TBD | TBD | TBD | TBD | Evaluate after 3 weeks |
| Booking clicks | TBD | TBD | TBD | TBD | Evaluate after 3 weeks |

### 10c. ORBT Gate Rules

| From | To | Gate |
|------|-----|------|
| BUILD | OPERATE | 3 weeks of consistent posting at frequency + voice compliance 100% + booking link functional |
| OPERATE | REPAIR | Frequency drops below 2/week OR voice violation OR broken CTA |
| REPAIR | OPERATE | Fix applied + 1 week clean |
| Any (Strike 3) | TROUBLESHOOT/TRAIN | Same failure pattern 3x -> AD |

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
| 2026-04-12 | Initial BUILD -- platform strategy created with voice spec, templates, DMJ | pending |

---

# APPENDIX A: VOICE SPECIFICATION

**Who Dave Barton is on Facebook:** George Patton in a benefits office. He talks like a guy who has seen the inside of the machine and is telling you how it actually works -- not how the insurance company says it works. More conversational than LinkedIn. Still direct, still confident, but the tone is like talking to someone at a local business association meeting, not presenting at a conference.

**Voice constants:**
- First person. "I" not "we" unless referring to a team action.
- Short sentences when making a point. Longer when explaining a concept.
- Analogies from everyday life -- the convenience store, the mechanic's shop, the gas station. Not from tech or finance.
- Swearing is acceptable sparingly and only when it lands. Not gratuitous.
- Questions are rhetorical and sharp: "When's the last time you actually read your claims data?" not "Have you considered reviewing your claims data?"
- No jargon without translation. If you say "stop-loss," you explain what it means in the same breath.
- No hedge language. Not "I think" or "it might be." It IS or it ISN'T.
- End with something actionable or something that sticks.

**What it sounds like:**
> "Your health insurance renewal went up 14%. Your broker said 'the market's hard.' That's not an explanation. That's a weather report. The market didn't make your claims go up. Your claims went up because nobody's managing the cost. That's what I do."

**What it does NOT sound like:**
> "At SVG Agency, we believe in leveraging data-driven insights to optimize your employee benefits strategy and drive meaningful cost reductions across your organization's healthcare portfolio."

---

# APPENDIX B: CONTENT CATEGORIES

| Category | Description | Frequency | Example Hook |
|----------|-------------|-----------|-------------|
| **Cost Education** | How health insurance cost actually works -- claims, stop-loss, renewals, the math | 1x/week | "Your broker showed you three quotes. None of them explain why your costs went up." |
| **Convenience Store Metaphor** | Extended analogy posts -- managing insurance like managing a store's inventory | 1-2x/month | "Imagine you own a convenience store and you never look at what's selling..." |
| **Gate Clips** | Short video clips from educational content, gate events, or Dave talking to camera | 1x/week when available | Video + 2-3 sentence setup |
| **Dave's Take** | Shared article (industry news, local business news) with Dave's commentary | 1-2x/month | "Saw this article about [topic]. Here's what they're not telling you." |
| **Local Business Callout** | Shoutout to a local business, tied back to the message when natural | 1x/month max | "Talked to a [industry] owner in [city] last week. Same story every renewal." |

---

# APPENDIX C: SAMPLE POST TEMPLATES

### Template 1: Cost Education Post

```
[HOOK -- one sharp sentence that names the pain]

Here's what actually happens:

[2-3 sentences explaining the mechanism. Use plain language. No jargon without immediate translation.]

[The pivot -- what this means for the reader]

[CTA]

---
EXAMPLE:

Your health insurance renewal went up 14% and your broker said "the market's hard."

Here's what actually happens: Your claims data tells the whole story. Every ER visit, every specialty referral, every prescription -- it's all in there. But nobody's reading it. Your broker isn't reading it. Your carrier definitely isn't reading it for your benefit.

When nobody reads the data, nobody manages the cost. And when nobody manages the cost, you get a 14% renewal and a shrug.

That's what I do differently. I read the data. I find the patterns. I manage the cost.

Want to see what your claims data actually says? Grab 20 minutes: https://calendar.app.google/VT41mpEgTWDexFET8
```

### Template 2: Convenience Store Metaphor

```
[Setup the analogy -- "Imagine you own a convenience store..."]

[Draw the parallel -- how the store situation maps to health insurance]

[The punchline -- what happens when you don't manage it]

[Tie it back -- "That's what's happening with your health plan."]

[CTA]

---
EXAMPLE:

Imagine you own a convenience store and you never check what's on the shelves. You just let the distributor send whatever they want, at whatever price, and you pay the invoice every month.

How long before you're stocking $40 protein bars nobody buys?

That's your health plan. Your carrier is the distributor. Your claims are the inventory. And nobody's checking the shelves.

Insurance informatics is the inventory system. It tells you what's moving, what's overpriced, and where the money's going. You can't run a store blind. You can't run a health plan blind either.

If your renewal is coming up and nobody's shown you the data, message me. That conversation is free.
```

### Template 3: Gate Clip / Video Post

```
[2-3 sentence setup -- what the viewer is about to see and why it matters]

[VIDEO ATTACHMENT]

[1 sentence takeaway]

[CTA]

---
EXAMPLE:

Spent 10 minutes last week explaining to a room full of business owners why their stop-loss (that's the insurance on your insurance -- yes, that's a real thing) is costing them more than it should.

[VIDEO CLIP]

Short version: if you don't know what your stop-loss specific is set at, you're leaving money on the table.

Share if you know a business owner who needs to hear this.
```

### Template 4: Dave's Take (Shared Article)

```
[Share the article link]

[Dave's take -- 3-5 sentences. What the article gets right, what it misses, and what it means for local employers.]

[Tie back to core message]

[CTA]

---
EXAMPLE:

[SHARED ARTICLE: "Health Insurance Costs Expected to Rise 8% in 2027"]

Every year this headline comes out and every year employers act surprised. Here's what this article won't tell you: that 8% is an average. Some of you are at 3%. Some of you are at 20%. The difference isn't luck. It's whether anyone is managing your claims.

You can't stop claims from happening. People get sick. But you can manage the cost -- and the gap between 3% and 20% is millions of dollars across a workforce.

If you want to know where you actually land, let's talk: https://calendar.app.google/VT41mpEgTWDexFET8
```

### Template 5: Local Business Callout

```
[Name the interaction -- keep it general enough to protect privacy but specific enough to be real]

[The lesson or pattern it illustrates]

[Core message tie-back]

[CTA]

---
EXAMPLE:

Had coffee with a manufacturing shop owner in the valley last week. 85 employees. Good company. Does everything right on the operations side -- lean, efficient, tracks every dollar.

Then I asked about their health plan. "We just take whatever the broker brings us."

85 employees and nobody's looked at the claims data in three years. That's like running a factory and never checking the machines.

You can't stop claims. You can only manage the cost. And you can't manage what you don't measure.

If that sounds familiar, grab 20 minutes and let's look at your numbers: https://calendar.app.google/VT41mpEgTWDexFET8
```

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
