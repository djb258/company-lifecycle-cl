# Insurance Informatics Website — CTB (Content Tree Backbone)
## The governing architecture for insuranceinformatics.com. Every page, every diagram, every SEO target, every CTA traces to this backbone. The website is the top of the company lifecycle funnel.
### Status: BUILD
### Medium: CF Pages (static site)
### Business: svg-agency (insurance informatics)
### Authority: Dave Barton
### BAR: BAR-302
### Created: 2026-04-28

---

## Identity

| Field | Value |
|-------|-------|
| hub_id | insurance-informatics-website |
| ctb_node | barton-enterprises/svg-agency/insurance-informatics/website |
| Medium | CF Pages (static site) |
| Primary Domain | insuranceinformatics.com |
| Redirect Domain | svg.agency |
| Parent CTB | `fleet/content/INSURANCE-INFORMATICS-CTB.md` |
| Page Map | `fleet/content/BAR-302-WEBSITE-MAP.md` |
| Website Doc | `fleet/content/INSURANCE-INFORMATICS-WEBSITE.md` |

---

## Lifecycle Position

The website is the TOP of the company lifecycle funnel. Everything above the first human conversation.

```
COMPANY LIFECYCLE FUNNEL
│
├── WEBSITE (this CTB)
│   └── Every page moves someone toward booking a meeting
│   └── The booking CTA is the ONLY conversion action
│
├── GATE 1 — Fact Finder Meeting (15 min)
│   └── "We know you. Bring your bill."
│
├── GATE 2 — Education + Monte Carlo (15-20 min)
│   └── Self-insured explained. Your numbers run.
│
├── GATE 3 — Service Model (15-20 min)
│   └── Five dashboards. What life looks like.
│
├── GATE 4 — The Numbers (15 min)
│   └── Their quote. Their savings. "Compete it."
│
├── CLIENT ONBOARDING
│   └── Year 1 census enrollment → Year 2 full enrollment
│
└── CLIENT PORTAL
    └── Five dashboards + employee page + ticketing
```

**The website does NOT sell.** The website educates and books a meeting. The sales process is the four gates. The website is the front door to Gate 1.

---

## Page Tree (CTB Structure)

Nine pages. Each maps to a CTB altitude from the parent Insurance Informatics CTB. Each has one job. Each ends with one CTA: book a meeting.

```
WEBSITE (insuranceinformatics.com)
│
├── HOME (/) — 50K
│   SEO target: "insurance informatics"
│   Job: Name the category. One CTA.
│
├── WHAT IS II (/what-is-insurance-informatics) — 50K
│   SEO target: "what is insurance informatics"
│   Job: Define the discipline. Paradigm shift table.
│
├── HOW IT WORKS (/how-it-works) — 40K-30K
│   SEO target: "insurance informatics process"
│   Job: Two-layer architecture. Rule of Twos. Hub-spoke diagram.
│
├── FOR EXECUTIVES (/executives) — 40K
│   SEO target: "insurance informatics for CFOs", "self insured benefits consulting"
│   Job: Two bills. The Duck. Monte Carlo. Zero commission.
│
├── FOR HR (/hr) — 10K
│   SEO target: "insurance informatics HR", "self insured HR support"
│   Job: 90% autopilot. Ticketing. HR goes from router to auditor.
│
├── WHY PERMANENT (/permanent) — 5K
│   SEO target: "insurance informatics data moat"
│   Job: Structural dependency. Every month deepens the moat.
│
├── FOR VENDORS (/vendors) — 40K-20K
│   SEO target: "insurance informatics vendor integration"
│   Job: Many-to-one. Two contacts. Hub-spoke.
│
├── ABOUT DAVE (/about) — 50K
│   SEO target: "Dave Barton insurance informatics"
│   Job: 25+25 years. Genesis story. Not a broker.
│
└── BOOK (/book) — 5K
    SEO target: "insurance informatics consultation"
    Job: Four-step evaluation. Booking link. Video embed.
```

---

## Page Details — Content Sources, Diagrams, Videos

### Page 1: HOME (/)

| Field | Value |
|-------|-------|
| CTB Altitude | 50K — The Discipline |
| II CTB Section | 50K — THE DISCIPLINE |
| Route | `/` and `/insurance-informatics` |
| H1 | Insurance Informatics |
| SEO Target | "insurance informatics" |
| Job | Name the category. One CTA. |

**Content Sources:**
- Core positioning statement (LBB `06a8a2db` — LOCKED)
- Hero line from Structured Constant slide 11: "We don't sell an insurance product. We install a mechanical, closed-loop operational machine. Perfect inputs guarantee predictable outputs."
- Supporting stat: 84% of CIOs identify unifying data as their top priority
- Tagline: "Your data. Our infrastructure. One permanent operational layer."

**Above the Fold:**
- Hero line
- 84% stat
- Hub-spoke visual (intro version — Diagram 1)
- Video embed: C-00 (50K intro — "The 10% Problem")
- CTA: "15 minutes. Four videos. The math does the talking." → booking link

**Diagram Needed:** Diagram 1 — Hub-Spoke (intro version)
**Video Slot:** C-00 (50K intro)
**Voice Spec Phrases:** "We don't sell an insurance product." / "Perfect inputs guarantee predictable outputs."

---

### Page 2: WHAT IS INSURANCE INFORMATICS (/what-is-insurance-informatics)

| Field | Value |
|-------|-------|
| CTB Altitude | 50K — The Discipline |
| II CTB Section | 50K — THE DISCIPLINE + Genesis |
| Route | `/what-is-insurance-informatics` |
| H1 | What Is Insurance Informatics? |
| SEO Target | "what is insurance informatics" |
| Job | Define the discipline. Paradigm shift table. |

**Content Sources:**
- "Category of one" framing (LBB `0d7e2104`)
- 25 years IT + 25 years insurance = insurance informatics
- Named discipline parallel to medical informatics and clinical informatics
- NOT a brand. A discipline.

**Paradigm Shift Table (from Structured Constant slide 6):**

| | Traditional Brokerage | Insurance Informatics |
|---|---|---|
| Core Focus | Chasing Price | Engineering Process |
| Input | Messy Spreadsheets | Structured Data via API & EDI |
| Tech Engine | Legacy Batch | 38-Node Cloudflare Edge |
| Benefit Design | Endless HR Debates | Rule of Twos |
| Revenue | Hidden Commissions | Flat PEPM |

**Diagram Needed:** None (table IS the visual)
**Video Slot:** E-01 (self-insured vs fully insured)
**Voice Spec Phrases:** "Here's how it works." / "The math is simple."

---

### Page 3: HOW IT WORKS (/how-it-works)

| Field | Value |
|-------|-------|
| CTB Altitude | 40K-30K — The Two Sides + Vendor Aggregation |
| II CTB Section | 40K — THE TWO SIDES, 30K — FIXED SIDE, 30K — VARIABLE SIDE |
| Route | `/how-it-works` |
| H1 | How Insurance Informatics Works |
| SEO Target | "insurance informatics process" |
| Job | Two-layer architecture. Rule of Twos. Hub-spoke diagram. |

**Content Sources:**
- Two-Layer Architecture (LBB `6cd208a3`)
- Four Constants (LBB `75b40e85`)
- Fixed side: Dave aggregates PEPM vendors into one invoice
- Variable side: TPA aggregates claims into one bill
- Rule of Twos: 90/15 autopilot + 10/85 high-dollar
- Real-time interception: Path A vs Path B (Structured Constant slide 10)

**Diagrams Needed:**
- Diagram 2 — Rule of Twos (90/15 autopilot + 10/85 high-dollar)
- Diagram 8 — Two Aggregators (Fixed → Dave, Variable → TPA)
- Diagram 1 — Hub-Spoke (full version — Dave as hub, vendors as spokes, client as rim)

**Video Slot:** E-02 (90/15 and 10/85)
**Voice Spec Phrases:** "Premiums don't equal cost." / "You can't stop claims."

---

### Page 4: FOR EXECUTIVES (/executives)

| Field | Value |
|-------|-------|
| CTB Altitude | 40K — The Two Sides (CFO view) |
| II CTB Section | 40K — THE TWO SIDES, The Duck, Monte Carlo |
| Route | `/executives` |
| H1 | Insurance Informatics for Executives |
| SEO Target | "insurance informatics for CFOs", "self insured benefits consulting" |
| Job | Two bills. The Duck. Monte Carlo. Zero commission. |

**Content Sources:**
- The Duck: smooth on top (what CFO sees), paddling underneath (what's running)
- Two bills: fixed (Dave's consolidated invoice) + variable (TPA's claims bill)
- Monte Carlo: two paths diverge over 5 years — compounding off a lower base vs higher base
- Zero commission: flat PEPM, same side of the table
- $27M data failure frame (Structured Constant slide 4)
- Hospital bill audit: 30% cut before waterfall even starts

**Diagrams Needed:**
- Diagram 3 — The Duck (above water / below water split)
- Diagram 6 — Monte Carlo Divergence (two paths over 5 years)
- Diagram 8 — Two Aggregators (repeat from Page 3)

**Video Slots:** E-03 (bill audit), E-05 (Deconstructing the Duck)
**Voice Spec Phrases:** "I encourage you to compete it." / "Their number has commission baked in. Ours doesn't."

---

### Page 5: FOR HR (/hr)

| Field | Value |
|-------|-------|
| CTB Altitude | 10K — Service Model |
| II CTB Section | 10K — SERVICE SIDE (90% self-serve + 10% orchestrated) |
| Route | `/hr` |
| H1 | Insurance Informatics for HR |
| SEO Target | "insurance informatics HR", "self insured HR support" |
| Job | 90% autopilot. Ticketing. HR goes from router to auditor. |

**Content Sources:**
- The 90%: copay card, done. "Here's your card, go live your life."
- Ticketing system: questions route directly to vendor, not through Dave
- The 10%: HR-branded comms (employee thinks it's from HR, it's from Dave)
- HR goes from router to auditor — no more chasing vendors
- Employee page: self-serve benefits + ticketing

**Diagrams Needed:**
- Diagram 9 — Five Dashboards (HR dashboard highlighted)
- Diagram 2 — Rule of Twos (HR perspective — what HR touches vs what runs itself)

**Video Slot:** E-04 (what your broker can't see)
**Voice Spec Phrases:** "Here's your card, go live your life." / "HR goes from router to auditor."

---

### Page 6: WHY PERMANENT (/permanent)

| Field | Value |
|-------|-------|
| CTB Altitude | 5K — Data Warehouse + Structural Dependency |
| II CTB Section | 5K — DASHBOARDS, 10K — DATA AGGREGATION LAYER |
| Route | `/permanent` |
| H1 | Why Insurance Informatics Is Permanent |
| SEO Target | "insurance informatics data moat" |
| Job | Structural dependency. Every month deepens the moat. |

**Content Sources:**
- Structured Constant slide 12 — the IT moat sandwich
- "We don't retain clients with contracts. We retain them through structural dependency."
- "To fire SVG, a client would have to rebuild every vendor API connection, compliance tracker, and data feed from scratch."
- Every month of data makes the moat deeper
- Data warehouse per client: all feeds, all vendors, all history

**Diagrams Needed:**
- Diagram 7 — Data Moat (structural dependency — layers accumulate over time)

**Video Slot:** None (text + diagram carries this page)
**Voice Spec Phrases:** "We don't retain clients with contracts." / "Every month of data makes the moat deeper."

---

### Page 7: FOR VENDORS (/vendors)

| Field | Value |
|-------|-------|
| CTB Altitude | 40K-20K — Hub-Spoke + Vendor Integration |
| II CTB Section | 5K — VENDOR CONTACTS, 5K — VENDOR ECOSYSTEM |
| Route | `/vendors` |
| H1 | Insurance Informatics for Vendors |
| SEO Target | "insurance informatics vendor integration" |
| Job | Many-to-one. Two contacts. Hub-spoke. |

**Content Sources:**
- Many-to-one: integrate once, get all clients
- Two contacts per vendor (account manager + customer service) — the Twos pattern
- The 10/85 process: where the vendor fits in the waterfall
- "We're not replacing your process. We're putting structure in front."
- Hub-spoke: Dave is the hub, vendors are spokes, client is the rim

**Diagrams Needed:**
- Diagram 1 — Hub-Spoke (vendor perspective — vendor as one spoke among many)

**Video Slot:** V-01 (vendor pitch)
**Voice Spec Phrases:** "Integrate once, get all clients." / "We're not replacing your process."

---

### Page 8: ABOUT DAVE (/about)

| Field | Value |
|-------|-------|
| CTB Altitude | 50K — Genesis |
| II CTB Section | 50K — THE DISCIPLINE (genesis narrative) |
| Route | `/about` |
| H1 | Dave Barton — Insurance Informatics |
| SEO Target | "Dave Barton insurance informatics" |
| Job | 25+25 years. Genesis story. Not a broker. |

**Content Sources:**
- 25 years IT data architecture + 25 years insurance
- The genesis of insurance informatics as a named discipline
- MDM for healthcare framing (LBB `af2726d9` — CIO bridge language)
- "Bloomberg for healthcare" positioning
- Not a broker — an operational layer
- Zero commission model: flat PEPM, why that matters

**Diagrams Needed:** None (portrait photo + narrative)
**Video Slot:** None
**Voice Spec Phrases:** "I'm not a broker." / "Insurance plus IT equals insurance informatics."

---

### Page 9: BOOK (/book)

| Field | Value |
|-------|-------|
| CTB Altitude | 5K — Execution |
| II CTB Section | THE FOUR GATES — Sales Video Mapping |
| Route | `/book` |
| H1 | Start Your Evaluation |
| SEO Target | "insurance informatics consultation" |
| Job | Four-step evaluation. Booking link. Video embed. |

**Content Sources:**
- Four-step closed-loop evaluation (Structured Constant slide 14)
- "Zero friction. Four short video briefings. Four 15-minute meetings."
- Booking link: `https://calendar.app.google/VT41mpEgTWDexFET8`
- Preview of what each meeting covers (from CTB gate mapping)

**Four Steps Preview:**

| Gate | What Happens | Duration |
|------|-------------|----------|
| Gate 1 | Fact Finder — "We know you. Bring your bill." | 15 min |
| Gate 2 | Education + Monte Carlo — your numbers | 15-20 min |
| Gate 3 | Service Model — what life looks like | 15-20 min |
| Gate 4 | The Numbers — your quote, your savings | 15 min |

**Diagrams Needed:** None (table + video + booking widget)
**Video Slot:** C-00 embedded (same as homepage — the hook)
**Voice Spec Phrases:** "I encourage you to compete it." / "Zero friction."

---

## SEO Strategy

### The Core Advantage

"Insurance Informatics" is a term Dave coined. ZERO competition. Every page title and H1 anchors the term. The goal is to OWN the definition in Google's index before anyone else uses the phrase.

### Page-Level SEO Targets

| Page | Primary Keyword | Secondary Keywords |
|------|----------------|-------------------|
| Home | insurance informatics | insurance data architecture, self insured consulting |
| What Is II | what is insurance informatics | insurance informatics definition, medical informatics vs insurance informatics |
| How It Works | insurance informatics process | self insured benefits management, hub spoke insurance |
| For Executives | insurance informatics for CFOs | self insured benefits consulting, insurance cost engineering |
| For HR | insurance informatics HR | self insured HR support, benefits ticketing system |
| Why Permanent | insurance informatics data moat | structural dependency insurance, insurance data warehouse |
| For Vendors | insurance informatics vendor integration | vendor hub spoke insurance, insurance vendor management |
| About Dave | Dave Barton insurance informatics | insurance informatics founder, 25 years insurance IT |
| Book | insurance informatics consultation | insurance informatics evaluation, self insured benefits meeting |

### Technical SEO

| Element | Implementation |
|---------|---------------|
| Schema.org | Organization + ProfessionalService + Person (Dave) |
| JSON-LD | On every page — type-appropriate structured data |
| Sitemap | `sitemap.xml` with all 9 pages, lastmod dates |
| Robots | `robots.txt` allowing all crawlers |
| Canonical | Each page self-canonicalizes |
| Meta Descriptions | Define the term in every description — target featured snippets |
| Open Graph | og:title, og:description, og:image on every page for social shares |
| H1 Rule | Every page H1 contains "Insurance Informatics" |
| Internal Linking | Every page links to Book page. Related pages cross-link. |
| Page Speed | CF Pages edge-cached. No JS frameworks. Static HTML + CSS. |

### Featured Snippet Strategy

Google will surface definitions for "what is insurance informatics" since no other source defines it. Every page's meta description should read like a dictionary entry:

- Home: "Insurance Informatics is the named discipline that combines 25 years of IT data architecture with 25 years of insurance operations into one permanent operational layer for self-insured employers."
- What Is II: "Insurance Informatics sits parallel to medical informatics and clinical informatics as a named discipline — not a brand. It engineers process instead of chasing price."

---

## Diagrams Required

Nine diagrams. Each has a specific purpose and appears on specific pages.

| # | Diagram | Description | Pages Used |
|---|---------|-------------|------------|
| 1 | **Hub-Spoke** | Dave as hub, vendors as spokes (account manager + customer service per vendor), client as rim. Shows the many-to-one aggregation. Intro version on Home, full version on How It Works, vendor perspective on For Vendors. | Home, How It Works, For Vendors |
| 2 | **Rule of Twos** | Split: 90% employees / 15% cost (autopilot, copay card, done) vs 10% employees / 85% cost (orchestrated, waterfall, team). Visual shows the asymmetry. | How It Works, For HR |
| 3 | **The Duck** | Above water: two bills, one dashboard, one phone number, happy employees. Below water: 10+ vendors, two claim pipes, two waterfalls, enrollment feeds, orchestrator, service reps, drug flags, pre-certs, bill audits, dashboards, data warehouse. | For Executives |
| 4 | **Hospital Waterfall** | Two steps: Step 1 — Bill Audit (line items vs Medicare rates, ~30% cut). Step 2 — Waterfall on remainder (PPO network → RBP reference-based pricing → 501R nonprofit financial assistance = $0). Shows $100K → $70K → $0 path. | For Executives (inline), How It Works (reference) |
| 5 | **Drug Waterfall** | Three steps in order: MAP/PAP (manufacturer assistance) → International pharmacy → 340B (federal discount). Shows cost reduction cascade. | For Executives (inline), How It Works (reference) |
| 6 | **Monte Carlo Divergence** | Two paths over 5 years. Traditional broker path: compounding off a higher base (premiums increase). Insurance Informatics path: compounding off a lower base (engineered cost). Lines diverge. Gap widens every year. | For Executives |
| 7 | **Data Moat** | Structural dependency accumulating over time. Layers: vendor API connections + compliance trackers + data feeds + enrollment history + claims history + dashboard infrastructure. Each month adds a layer. To leave = rebuild all of it from scratch. | Why Permanent |
| 8 | **Two Aggregators** | Side by side: Dave aggregates fixed costs (PEPM vendors: stop loss, TPA admin, life, STD, LTD, dental, vision, EAP, FSA/HRA, COBRA) into one invoice. TPA aggregates variable costs (all claims: routine + high-dollar results) into one bill. CFO sees two numbers. | How It Works, For Executives |
| 9 | **Five Dashboards** | Five views from one data warehouse: HR (enrollment, census, compliance), CFO (two bills, spend, savings), Underwriting (claims data, loss ratios, risk), Renewal (spent, saved, money back), Service Advisor (open cases, babysitter status, satisfaction). Plus employee page (benefits summary + ticketing). | For HR, Why Permanent (reference) |

### Diagram Delivery Format

- SVG preferred (scalable, CF Pages native, no JS dependency)
- Dark-on-light color scheme (print-friendly, accessible)
- Each diagram is a standalone asset in `/content/insurance-informatics/diagrams/`
- Naming convention: `diagram-{number}-{slug}.svg` (e.g., `diagram-01-hub-spoke.svg`)

---

## Video Slots

| Video ID | Title | CTB Altitude | Pages |
|----------|-------|-------------|-------|
| C-00 | 50K Intro — "The 10% Problem" | 50K | Home, Book |
| E-01 | Self-Insured vs Fully Insured | 50K | What Is II |
| E-02 | 90/15 and 10/85 | 40K-20K | How It Works |
| E-03 | Bill Audit | 30K-10K | For Executives |
| E-04 | What Your Broker Can't See | 10K | For HR |
| E-05 | Deconstructing the Duck | 40K | For Executives |
| V-01 | Vendor Pitch | 40K-20K | For Vendors |

**Video pipeline:** HeyGen render queue → R2 storage → CF Pages embed
**Fallback:** Video slot empty on page = page still works (video is enhancement, not dependency)

---

## Content Source Cross-Reference

Every page traces to three sources: the II CTB altitude, LBB records, and the Structured Constant slide deck.

| Page | II CTB Section | LBB Records | Structured Constant Slides |
|------|---------------|-------------|---------------------------|
| Home | 50K — The Discipline | `06a8a2db` (positioning) | Slide 1 (title), Slide 11 (hero) |
| What Is II | 50K — The Discipline | `0d7e2104` (different race) | Slide 2 (audience filter), Slide 5 (genesis), Slide 6 (paradigm shift) |
| How It Works | 40K + 30K | `6cd208a3` (two-layer arch), `75b40e85` (four constants) | Slide 8 (38-node hub), Slide 9 (Rule of Twos), Slide 10 (interception) |
| For Executives | 40K + Duck + Monte Carlo | Monte Carlo, two aggregators, two bills | Slide 4 ($27M failure), Slide 12 (IT moat) |
| For HR | 10K — Service Side | Service model, ticketing, "router to auditor" | Slide 9 (Rule of Twos — 90% autopilot) |
| Why Permanent | 5K — Data Warehouse | Data warehouse per client, moat | Slide 12 (IT moat sandwich) |
| For Vendors | 5K — Vendor Contacts + Ecosystem | Vendor integration pitch | Slide 8 (hub-spoke) |
| About Dave | 50K — Genesis | `af2726d9` (MDM framing), Bloomberg analogy | Slide 5 (genesis — 25+25) |
| Book | Four Gates | Booking link, four meetings preview | Slide 14 (4-step evaluation) |

---

## Tracking

All page events flow to `https://lcs-hub.svg-outreach.workers.dev/page-event`.

### Events Tracked

| Event | Trigger | Purpose |
|-------|---------|---------|
| `page_loaded` | Page renders | Attribution — which pages get traffic, from where |
| `cta_clicked` | Any booking CTA clicked | Conversion — the only action that matters |

### Event Payload

| Key | Description |
|-----|-------------|
| `sovereign_company_id` | If visitor identified (from outreach link), their company ID |
| `communication_id` | If from an email/outreach, the specific communication that sent them |
| `event_type` | `page_loaded` or `cta_clicked` |
| `lifecycle_phase` | Always `website` for this CTB |
| `page_step` | Which page (1-9) |
| `signal_set_hash` | Fingerprint of the visit context |
| `payload` | Additional context (UTM params, referrer, etc.) |

### Attribution Chain

```
Outreach email (communication_id) →
  Page load (page_loaded, page_step, lifecycle_phase=website) →
    CTA click (cta_clicked) →
      Booking (Gate 1 scheduled) →
        LCS Hub links company to lifecycle position
```

---

## Technical Architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| Hosting | CF Pages | Static site, edge-cached globally |
| Domain | insuranceinformatics.com | Primary. svg.agency redirects here. |
| Video | HeyGen → R2 → embed | Lazy-loaded, poster frame on initial render |
| Diagrams | SVG inline or `<img>` | No JS dependency for visuals |
| Tracking | LCS Hub `/page-event` | Fetch API, fire-and-forget |
| Booking | Google Calendar embed | `calendar.app.google/VT41mpEgTWDexFET8` |
| SEO | JSON-LD + meta + OG | Server-rendered in static HTML |
| CSS | Minimal, no framework | Performance over aesthetics |
| JS | Minimal — tracking + video player only | No SPA, no React, no build step |

---

## Build Sequence

| Phase | What | Status |
|-------|------|--------|
| 1 | Content locked per page (this doc + BAR-302-WEBSITE-MAP.md) | DONE |
| 2 | Diagrams designed (9 SVGs) | TODO |
| 3 | Videos rendered (C-00, E-01 through E-05, V-01) | TODO |
| 4 | Wireframes per page | TODO |
| 5 | Static HTML/CSS build on CF Pages | TODO |
| 6 | SEO structure (JSON-LD, meta, sitemap, robots) | TODO |
| 7 | Tracking wired to LCS Hub | TODO |
| 8 | Domain DNS pointed | TODO |
| 9 | QA — all 9 pages, all CTAs, all events firing | TODO |

---

## Acceptance Criteria

- [ ] All 9 pages live at their routes
- [ ] Every page H1 contains "Insurance Informatics"
- [ ] Every page ends with booking CTA
- [ ] JSON-LD on every page (Organization, ProfessionalService, Person)
- [ ] sitemap.xml lists all 9 pages
- [ ] page_loaded event fires on every page load
- [ ] cta_clicked event fires on every CTA click
- [ ] All 9 diagrams rendered as SVG
- [ ] Video embeds load on pages that have video slots
- [ ] Page speed: < 1s first contentful paint (CF Pages edge cache)
- [ ] Mobile responsive (all pages)
- [ ] Open Graph tags on every page (social sharing)
- [ ] Meta descriptions define "insurance informatics" (featured snippet targeting)

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-04-28 |
| Last Modified | 2026-04-28 |
| BAR | BAR-302 |
| Version | 1.0.0 |
| Status | BUILD |
| Parent CTB | `fleet/content/INSURANCE-INFORMATICS-CTB.md` |
| Source | II CTB + BAR-302-WEBSITE-MAP + LBB records + Structured Constant deck + FCE-007 |
| Authority | Dave Barton |
