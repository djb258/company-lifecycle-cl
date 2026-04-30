# Instagram Platform Strategy — SVG Agency
## Brand awareness channel for insurance informatics: visual proof that data-driven benefits management exists, aimed at younger HR professionals and business owners in WV/PA and beyond.
### Status: BUILD
### Medium: platform strategy
### Business: svg-agency

---

# IDENTITY (Thing — what this IS)

_Everything in this cluster answers: what exists? These are constants that don't change regardless of who reads this or when._

## 1. IDENTITY

| Field | Value |
|-------|-------|
| ID | PLAT-INSTAGRAM |
| Name | Instagram Platform Strategy — SVG Agency |
| Medium | platform strategy |
| Business Silo | svg-agency |
| CTB Position | branch / fleet / content / social-platforms |
| ORBT | BUILD |
| Strikes | 0 |
| Authority | Dave Barton |
| Last Modified | 2026-04-12 |
| BAR Reference | none |

### HEIR (8 fields — Aviation Model, Bedrock S8)

| Field | Value |
|-------|-------|
| sovereign_ref | svg-agency |
| hub_id | platform-instagram |
| ctb_placement | branch |
| imo_topology | output |
| cc_layer | CC-03 context |
| services | Postiz (self-hosted), Canva, Instagram Business API |
| secrets_provider | doppler |
| acceptance_criteria | Posts go out 2-3x/week on schedule, engagement rate exceeds 1.5% within 90 days, booking link clicks measurable via UTM, zero posts violate anti-pattern list |

---

## 2. PURPOSE

_What breaks without it. What business outcome it serves. If you can't answer this, it shouldn't exist._

Instagram is the visual proof layer for SVG Agency. LinkedIn carries the thought leadership and direct outreach. Instagram carries the brand signal to a broader, younger audience — HR coordinators, benefits analysts, and small business owners who scroll Instagram before they ever open LinkedIn. Without this channel, Dave's brand exists only in cold outreach and one-to-one conversations. With it, prospects who get an email or a LinkedIn message can find a living, professional presence that reinforces the core message: you can't stop claims, you can only manage the cost.

This is not a lead gen channel. This is air cover. It makes every other channel more credible.

---

## 3. RESOURCES

_Everything this depends on. A mechanic reads this and knows exactly what to set up before it can run._

### Dependencies

| Dependency | Type | What It Provides | Status |
|-----------|------|-----------------|--------|
| Postiz (self-hosted) | tool | Scheduling, publishing, analytics | DONE |
| Instagram Business Account | service | Publishing endpoint, insights API | DONE |
| Canva | tool | Branded template creation, infographic generation | DONE |
| Gate scripts (video clips) | content | Short-form video source material | PENDING |
| Branded template kit | design | Consistent visual identity across posts | PENDING |
| Google Calendar booking link | service | CTA destination: https://calendar.app.google/VT41mpEgTWDexFET8 | DONE |

### Downstream Consumers

| Consumer | What It Needs |
|----------|--------------|
| LinkedIn cross-posting | Repurposed carousel content, adapted for LinkedIn format |
| Email campaigns | Social proof — "follow us on Instagram" footer link |
| Sales conversations | Visual credibility when prospects Google the brand |
| LBB | Engagement metrics, post performance data for Circle feedback |

### Tools & Integrations

| Item | Type | Cost Tier | Credentials | What It Does |
|------|------|-----------|-------------|-------------|
| Postiz | Social scheduler | Self-hosted | Instance credentials | Schedules and publishes all Instagram posts |
| Canva | Design tool | Cheap | Composio OAuth | Creates branded templates and infographics |
| Instagram Business API | Platform API | Free | Meta Business Suite | Publishing, insights, audience data |

### Secrets (if applicable)

| Secret | Doppler Project | Config | Used By |
|--------|----------------|--------|---------|
| INSTAGRAM_ACCESS_TOKEN | imo-creator | dev | Postiz publishing |
| META_APP_SECRET | imo-creator | dev | Instagram API auth |

---

# CONTRACT (Flow — what flows through this)

_Everything in this cluster answers: what moves? How does data/work enter, get processed, and exit?_

## 4. IMO — Input, Middle, Output

### Two-Question Intake (Bedrock S3)
1. **"What triggers this?"** — Content calendar cadence (2-3x/week) plus real-time events (new data releases, DOL filing seasons, client wins, conference appearances)
2. **"How do we get it?"** — Content sourced from: gate scripts (video clips), data visualizations from the operating model, behind-the-scenes of the data operation, infographics from existing doctrine (two-layer model, 90/15 split, convenience store vs grocery store)

### Input
- Content calendar trigger (Monday/Wednesday/Friday rhythm recommended)
- Raw material: gate script excerpts, data snapshots, operating model visuals, behind-the-scenes photos/video of the data operation
- Seasonal triggers: DOL filing release, open enrollment season, renewal season
- Anti-pattern filter: reject anything that looks like motivational quotes, "happy Monday" filler, stock photos, or generic wellness content

### Middle

| Step | Input | What Happens | Output | Tool Used |
|------|-------|-------------|--------|-----------|
| 1 | Content calendar slot | Select content type (infographic / video clip / carousel / BTS) | Content brief | Manual |
| 2 | Content brief | Design or edit the visual asset using branded template | Visual asset (1080x1080 or 1080x1350 or 9:16 Reel) | Canva |
| 3 | Visual asset | Write caption using voice guide + add hashtags (max 10) | Complete post draft | Manual |
| 4 | Complete post draft | Schedule via Postiz for optimal time | Scheduled post | Postiz |
| 5 | Published post | Monitor engagement, respond to comments/DMs | Engagement data | Instagram Insights |
| 6 | Engagement data | Log performance, feed back to content calendar | Performance record | LBB |

### Output
- Published Instagram post (feed post, carousel, or Reel)
- Engagement metrics (reach, impressions, saves, shares, profile visits, link clicks)
- DM conversations routed to booking link
- Brand awareness signal reinforcing all other SVG channels

### Circle (Bedrock S5)
Post performance feeds back into content selection. High-performing content types get repeated. Low-performing types get analyzed (was it the visual? the caption? the timing?) and either adjusted or dropped. Engagement data logs to LBB monthly. The setpoint is 1.5% engagement rate — below that, diagnose. Above that, lock the content type as a repeatable format.

---

## 5. DATA SCHEMA

_Where the data lives. What's read, written, joined. The plumbing._

### READ Access

| Source | What It Provides | Join Key |
|--------|-----------------|----------|
| Content calendar (Google Sheets) | Post schedule, content type, status | post_date |
| Instagram Insights API | Engagement metrics per post | post_id |
| Gate scripts library | Video clip source material | script_id |
| Canva template library | Branded design templates | template_id |

### WRITE Access

| Target | What It Writes | When |
|--------|---------------|------|
| Instagram (via Postiz) | Published post | Step 4 — scheduled publish |
| Content calendar | Post status (scheduled/published/analyzed) | Steps 4, 6 |
| LBB | Monthly performance summary, content learnings | Step 6 — monthly |

### Join Chain

```
content_calendar (post_date)
  -> canva_template (template_id)
  -> instagram_post (post_id)
    -> instagram_insights (post_id)
      -> lbb_records (record_id — monthly rollup)
```

### Forbidden Paths

| Action | Why |
|--------|-----|
| Auto-posting without caption review | Voice integrity — every caption must pass the Patton-in-a-benefits-office test |
| Cross-posting LinkedIn text directly | Different medium, different format. Adapt or create native. |
| Using stock photos | Anti-pattern. Violates brand authenticity. |
| Posting generic wellness/motivational content | Dilutes the insurance informatics positioning |
| Exceeding 10 hashtags per post | Instagram algorithm penalty + looks desperate |

---

## 6. DMJ — Define, Map, Join (law/doctrine/DMJ.md)

_Three steps. In order. Can't skip._

### 6a. DEFINE (Build the Key)

| Element | ID | Format | Description | C or V |
|---------|-----|--------|-------------|--------|
| Platform | PLAT-IG | string | Instagram Business Account | C |
| Voice | VOICE-PATTON | text guide | George Patton in a benefits office — direct, confident, zero desperation. Slightly more visual/approachable than LinkedIn but same spine. | C |
| Core message | MSG-CORE | string | "You can't stop claims. You can only manage the cost." | C |
| Posting frequency | FREQ-IG | range | 2-3 posts per week | C |
| Visual style | STYLE-IG | design spec | Clean, professional, data-forward. No stock photos. Branded templates with Insurance Informatics identity. | C |
| CTA primary | CTA-BIO | string | "Link in bio" pointing to https://calendar.app.google/VT41mpEgTWDexFET8 | C |
| CTA secondary | CTA-DM | string | "DM for details" | C |
| Hashtag set | HASH-IG | array (max 10) | #insuranceinformatics #employeebenefits #selfinsured #healthinsurance #benefitsmanagement + up to 5 contextual | C |
| Content type | TYPE-IG | enum | infographic / video-clip / carousel / behind-the-scenes / reel | C |
| Caption text | CAP-IG | text (max 2200 chars) | Post-specific caption following voice guide | V |
| Visual asset | ASSET-IG | image/video file | Post-specific visual content | V |
| Publish datetime | PUBDT-IG | ISO-8601 | Scheduled publish time per content calendar | V |
| Engagement metrics | ENGAGE-IG | JSON object | reach, impressions, saves, shares, comments, profile_visits | V |

### 6b. MAP (Connect Key to Structure)

| Source | Target | Transform |
|--------|--------|-----------|
| Gate script excerpt | Video clip / Reel (TYPE-IG) | Trim to 15-60 seconds, add captions overlay |
| Operating model data | Infographic (TYPE-IG) | Canva template, branded color palette |
| Doctrine concept | Carousel post (TYPE-IG) | Break into 3-7 slides, one idea per slide |
| Data operation footage | Behind-the-scenes (TYPE-IG) | Raw/minimal edit, authentic feel |
| Voice guide (VOICE-PATTON) | Caption (CAP-IG) | Apply tone: confident, direct, data-backed, no fluff |
| Hashtag set (HASH-IG) | Caption footer | Append to caption, max 10 total |

### 6c. JOIN (Path to Spine)

| Join Path | Type | Description |
|-----------|------|-------------|
| PLAT-IG -> SVG Agency brand | direct | Instagram is a brand-owned channel |
| CAP-IG -> VOICE-PATTON | direct | Every caption validated against voice constants |
| ENGAGE-IG -> LBB monthly rollup | indirect | Metrics aggregated monthly, ingested as LBB record |
| TYPE-IG -> Content calendar | direct | Every post maps to a calendar slot |

_Back-propagate to 6a if join reveals a gap. The Circle closes._

---

## 7. CONSTANTS & VARIABLES (Bedrock S2)

### Constants (structure — never changes)
- **Voice:** George Patton in a benefits office. Direct, confident, authoritative. Slightly warmer/more visual for Instagram but never soft, never desperate, never generic.
- **Core message:** "You can't stop claims. You can only manage the cost."
- **Visual identity:** Clean, data-forward, branded templates. Insurance Informatics branding. No stock photos.
- **Frequency:** 2-3x per week.
- **CTA:** "Link in bio" (booking link) or "DM for details." Never "follow for more" or engagement bait.
- **Anti-patterns:** No motivational quotes. No "happy Monday." No stock photos of handshakes. No generic wellness content. No engagement bait. No apologies for not posting.
- **Hashtag ceiling:** 10 per post.
- **Audience:** HR professionals (skewing younger), business owners, WV/PA local market + national self-insured employers.
- **Booking link:** https://calendar.app.google/VT41mpEgTWDexFET8

### Variables (fill — changes every run/cycle)
- Specific caption text per post
- Specific visual asset per post
- Publish date and time
- Contextual hashtags (beyond the core 5)
- Engagement metrics per post
- Content type selection per calendar slot

---

## 8. STOP CONDITIONS (Bedrock S6)

| Condition | Action |
|-----------|--------|
| Can't answer two-question intake | HALT |
| Post violates anti-pattern list | REJECT — do not publish |
| Caption fails voice test (reads like generic social media manager) | REWRITE before publish |
| No visual asset ready for scheduled slot | SKIP slot, do not post placeholder content |
| Engagement rate below 0.5% for 4 consecutive weeks | HALT — run Troubleshooting Loop |
| 3 consecutive posts with zero engagement growth | Diagnose — is it content, timing, or audience? |
| Strike 3 on same content failure pattern | Troubleshoot/Train — issue Airworthiness Directive |

---

# GOVERNANCE (Change — how this is controlled)

_Everything in this cluster answers: what transforms? How is quality measured, verified, certified?_

## 9. VERIFICATION

_Executable proof that it works. Run these._

```
1. Open Postiz queue → expected: 2-3 posts scheduled for current week
2. Open latest published post → expected: branded visual, voice-compliant caption, <= 10 hashtags, CTA present
3. Check Instagram Insights for last 7 days → expected: engagement rate >= 1.5%
4. Verify bio link → expected: redirects to https://calendar.app.google/VT41mpEgTWDexFET8
5. Review last 10 posts against anti-pattern list → expected: zero violations
```

**Three Primitives Check (Bedrock S1):**
1. **Thing:** Does the Instagram Business Account exist and is it properly connected to Postiz? Are branded templates created in Canva?
2. **Flow:** Does content flow from calendar -> creation -> scheduling -> publishing -> engagement tracking -> LBB?
3. **Change:** Does each post transform raw data/concepts into visual, Instagram-native content that reinforces the brand?

---

## 10. ANALYTICS

_The BUILD->OPERATE gate. Three sub-layers._

### 10a. Metrics

_Define BEFORE build starts._

| Metric | Unit | Baseline | Target | Tolerance |
|--------|------|----------|--------|-----------|
| Posts per week | count | 0 | 2-3 | Min 2, max 4 |
| Engagement rate | % | BASELINE | 1.5% | >= 1.0% |
| Profile visits per week | count | BASELINE | After first 30 days | Tightening trend |
| Link in bio clicks per week | count | BASELINE | After first 30 days | Tightening trend |
| Follower growth per month | count | BASELINE | After first 60 days | Positive |
| Saves per post (avg) | count | BASELINE | After first 30 days | Tightening trend |
| DM conversations per week | count | BASELINE | After first 30 days | Any > 0 |

### 10b. Sigma Tracking (Bedrock S2)

| Metric | Run 1 | Run 2 | Run 3 | Trend | Action |
|--------|-------|-------|-------|-------|--------|
| Engagement rate | BASELINE | -- | -- | -- | Set after first 30 days of posting |
| Post consistency | BASELINE | -- | -- | -- | Measure weekly adherence to 2-3 cadence |
| Save rate | BASELINE | -- | -- | -- | Saves indicate content people want to reference |

### 10c. ORBT Gate Rules

| From | To | Gate |
|------|-----|------|
| BUILD | OPERATE | 30 days of consistent posting (2-3x/week), engagement rate measurable, all branded templates created, content calendar populated 2 weeks ahead |
| OPERATE | REPAIR | Engagement rate below 1.0% for 2 consecutive weeks, or 2+ anti-pattern violations |
| REPAIR | OPERATE | Root cause identified, fix applied, metrics back within tolerance for 2 weeks |
| Any (Strike 3) | TROUBLESHOOT/TRAIN | Content strategy teardown, voice recalibration, possible platform pivot |

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
| heir_ref | PLAT-INSTAGRAM full HEIR record |
| orbt_entered | BUILD |
| orbt_exited | OPERATE |
| action | Certified — 30-day posting cadence achieved, engagement measurable |
| gates_passed | { imo: true, ctb: true, circle: true } |
| signed_by | Auditor (different engine than builder) |
| signed_at | [pending certification] |

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
| 2026-04-12 | Initial platform strategy document created | pending |

---

# APPENDIX A: VOICE GUIDE — Instagram Adaptation

**The constant:** George Patton in a benefits office. Direct. Confident. Data-backed. Zero desperation. Zero fluff.

**The Instagram adaptation (variable — how the constant expresses on this medium):**
- Shorter sentences than LinkedIn. Punchier.
- Lead with the visual. The image does 80% of the work. The caption reinforces.
- First line of caption must hook — Instagram truncates after ~125 characters. Front-load the value.
- Okay to be slightly more conversational than LinkedIn. Still authoritative, but accessible.
- Numbers are visual candy on Instagram. Use them. "$1.2M in claims. 90% were manageable. Nobody was managing them."
- Never explain yourself. Never apologize for posting cadence. Never use "just" or "honestly" or "in my humble opinion."
- End with a CTA or a provocative statement. Never end with a question that begs for engagement ("What do you think?").

**Voice test:** Read the caption aloud. Does it sound like a sharp operator who knows exactly what the numbers mean? Or does it sound like a social media manager filling a content calendar? If the latter, rewrite.

---

# APPENDIX B: CONTENT TYPES & SAMPLE POSTS

## Content Type 1: Data Infographic (Static Image)

**What it is:** Single-image post visualizing a key data point from the insurance informatics model.

**Template structure:**
- Bold stat or number as headline (large font, top of image)
- 1-2 supporting data points below
- Insurance Informatics branding (bottom corner)
- Clean background, branded color palette
- No decorative elements. Data IS the design.

### Sample Post 1: The 90/15 Split

**Visual:** Infographic showing "90% of your claims come from 15% of your people" with a simple visual split — large block vs. small block.

**Caption:**
```
90% of your health insurance spend comes from 15% of your population.

The other 85%? They cost almost nothing relative to the damage.

So why is your broker spending all their time on the 85%?

Because managing the 15% requires data. Real data. Claims-level, 
diagnosis-level, trend-level data that most brokers don't have 
and wouldn't know what to do with if they did.

That's what insurance informatics solves.

Link in bio if you want to see what your 15% actually looks like.

#insuranceinformatics #employeebenefits #selfinsured 
#healthinsurance #benefitsmanagement #claimsdata 
#HRstrategy #employerbenefits
```

---

### Sample Post 2: Convenience Store vs. Grocery Store

**Visual:** Side-by-side infographic. Left: convenience store icon with "$8.00 / gallon of milk." Right: grocery store icon with "$3.50 / gallon of milk." Headline: "This is your health plan."

**Caption:**
```
Your employees are buying milk at the convenience store.
And your health plan is paying for it.

Same milk. Same outcome. Double the price. Because nobody 
built the system to route them to the grocery store.

Insurance informatics builds that system.

Not by restricting access. By making the smart choice the 
easy choice — and making sure the data shows you where 
every dollar is going.

DM for details.

#insuranceinformatics #healthinsurance #selfinsured 
#employeebenefits #benefitsmanagement #costcontainment 
#HRleaders #WVbusiness
```

---

## Content Type 2: Carousel (Multi-Slide Educational)

**What it is:** 3-7 slide carousel breaking down a concept. One idea per slide. Designed to be saved and shared.

### Sample Post 3: The Two-Layer Model

**Visual:** 5-slide carousel.
- Slide 1: "Your health plan has two layers. Most brokers only manage one." (hook)
- Slide 2: "Layer 1: The Plan Design" — deductibles, copays, network. What your broker talks about.
- Slide 3: "Layer 2: The Claims Engine" — who's driving cost, where the money actually goes, what's preventable.
- Slide 4: "Layer 2 is where 80% of your money disappears. And nobody is watching."
- Slide 5: "Insurance Informatics manages both layers. Link in bio." (CTA)

**Caption:**
```
Most brokers manage Layer 1 — the plan design. 
Deductibles, copays, networks.

That's the part you can see.

Layer 2 is the claims engine. The actual cost drivers. 
The 15% of your population eating 90% of your spend.

Nobody manages Layer 2 because it requires data 
infrastructure that most brokers don't have.

We built it. Swipe to see how the two-layer model works.

#insuranceinformatics #employeebenefits #selfinsured 
#healthinsurance #benefitsmanagement #twolayermodel
```

---

## Content Type 3: Short Video Clip / Reel (from Gate Scripts)

**What it is:** 15-60 second video clip pulled from gate script recordings or direct-to-camera. Captions burned in. Vertical (9:16).

### Sample Post 4: "You Can't Stop Claims"

**Visual:** Direct-to-camera or pulled from a gate script delivery. 20-30 seconds. Text overlay of the key line.

**Script excerpt:**
```
"Everybody in this industry is trying to sell you 
a way to stop claims. Wellness programs. Preventive 
care incentives. Telehealth platforms.

Here's the truth: you can't stop claims. People get 
sick. People get hurt. That's reality.

What you CAN do is manage the cost of those claims. 
Route them intelligently. Catch the outliers before 
they become catastrophic. Build a system that knows 
where every dollar is going.

That's insurance informatics."
```

**Caption:**
```
You can't stop claims. You can only manage the cost.

Every vendor in this industry is selling prevention. 
We're building the management system that works 
regardless of what happens.

Full breakdown — link in bio.

#insuranceinformatics #healthinsurance #selfinsured 
#claimsmanagement #employeebenefits #benefitsmanagement
```

---

## Content Type 4: Behind-the-Scenes (Authenticity)

**What it is:** Raw/lightly edited photo or short video of the actual data operation. Screens, dashboards, the work being done. No polish — authenticity IS the point.

### Sample Post 5: The Data Operation

**Visual:** Photo or short video of the dashboard / data pipeline in action. Multiple monitors. Real data (anonymized). The machine running.

**Caption:**
```
This is what managing 30,000 employers' data looks 
like on a Tuesday afternoon.

Every company in our pipeline has been enriched — 
DOL filings parsed, claims patterns identified, 
cost drivers mapped.

No guesswork. No gut feelings. Just data.

This is what your broker's back office should look 
like. For most of them, it doesn't.

DM if you want to see what your company's data says.

#insuranceinformatics #employeebenefits #selfinsured 
#datadriven #healthinsurance #benefitsmanagement 
#behindthescenes #WVbusiness
```

---

# APPENDIX C: HASHTAG STRATEGY

### Core Set (use on every post — 5 tags)
1. `#insuranceinformatics`
2. `#employeebenefits`
3. `#selfinsured`
4. `#healthinsurance`
5. `#benefitsmanagement`

### Contextual Tags (rotate based on content — pick up to 5 per post)
- `#claimsdata` — data-heavy posts
- `#costcontainment` — cost management posts
- `#HRstrategy` / `#HRleaders` — HR-audience posts
- `#employerbenefits` — employer-facing posts
- `#WVbusiness` / `#PAbusiness` — local market posts
- `#datadriven` — behind-the-scenes posts
- `#openenrollment` — seasonal (Oct-Dec)
- `#renewalseason` — seasonal (varies)
- `#twolayermodel` — concept-specific posts
- `#claimsmanagement` — claims-focused posts
- `#behindthescenes` — BTS content

### Hashtag Rules
- Maximum 10 per post. Period.
- Core 5 on every post. Contextual 5 rotated.
- No trending/viral hashtag chasing.
- No hashtags in the visual. Caption only.

---

# APPENDIX D: ANTI-PATTERN REGISTRY

These are hard NOs. If a post concept matches any of these, kill it before it reaches Postiz.

| Anti-Pattern | Why It's Banned |
|-------------|----------------|
| Motivational quotes | We sell data infrastructure, not inspiration |
| "Happy Monday" / day-of-week filler | Zero information content. Brand dilution. |
| Stock photos (especially handshakes) | Destroys authenticity. We have real data and real operations to show. |
| Generic wellness content | Every broker posts this. It's noise. We are signal. |
| Engagement bait ("Tag someone who...") | Desperate. Patton doesn't beg for attention. |
| Apologizing for not posting | Nobody noticed. Drawing attention to inconsistency. |
| Trending audio with no relevance | Chasing virality signals amateur hour. |
| Infographics with no data | If there's no number on it, it's decoration. |
| "Follow for more" CTAs | The work sells itself. Link in bio or DM. |
| Reposting other accounts without adding value | We create. We don't curate. |

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-04-12 |
| Last Modified | 2026-04-12 |
| Version | 1.0.0 |
| Template Version | 1.0.0 |
| Medium | platform strategy |
| US Validated | pending |
| Governing Engine | law/doctrine/FOUNDATIONAL_BEDROCK.md + law/doctrine/DMJ.md |
