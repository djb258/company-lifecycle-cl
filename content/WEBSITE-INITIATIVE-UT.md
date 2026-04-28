# Website Initiative — Insurance Informatics
## The master document governing the entire website build: 18 domains, 9 pages, 4 FCE columns, one canonical destination. Everything that touches the website traces to this UT.
### Status: BUILD
### Medium: domain
### Business: svg-agency

---

## UT Checklist (Pre-Flight)

_Every UT doc MUST carry this block at the top. Check a box when the referenced section is filled. A pilot does not take off without documentation in the cockpit, a flight plan filed, and a pre-flight walkaround logged. A doc does not ship (ORBT=OPERATE) without all 12 items checked. Unchecked = grounded._

| # | Check | Status | Location |
|---|-------|--------|----------|
| 1 | PRD — what / why / who / scope / out-of-scope / success metric | ☑ | §2 |
| 2 | OSAM — READ / WRITE / Join Chain / Forbidden Paths / Query Routing filled | ☑ | §5 |
| 3 | Component Status — every dependency has status with 1-line state | ☑ | §3 |
| 4 | Owner — human who fixes this at 2 AM | ☑ | §1 |
| 5 | Live Dashboard — URL or explicit "N/A" | ☑ | §3 |
| 6 | Kill Switch — exact command to stop the process | ☑ | §8 |
| 7 | Logbook — last audit verdict + date (after certification only) | ☐ | §12 |
| 8 | FCEs Attached — which FCE runs structurally back this doc | ☑ | §3c |
| 9 | BARs Referenced — every BAR this doc touches, with status | ☑ | §3d |
| 10 | LBB Subjects Fed — which LBB subject(s) this doc's session logs go to | ☑ | §3e |
| 11 | Geometry — CTB position + Hub-Spoke role + Altitude | ☑ | §1b |
| 12 | Live Verification — every numeric count, cron, URL, command, BAR status grounded against the actual system | ☐ | §9b |
| 13 | ctb_node — declared path on Barton Enterprises CTB trunk | ☑ | §1 Identity |

---

# IDENTITY (Thing -- what this IS)

## 1. IDENTITY

| Field | Value |
|-------|-------|
| ID | website-initiative |
| Name | Insurance Informatics Website Initiative |
| Medium | Domain (website + domain portfolio) |
| Business Silo | SVG Agency — Insurance Informatics |
| CTB Position | Branch — `barton-enterprises/svg-agency/insurance-informatics/website` |
| ORBT | BUILD |
| Strikes | 0 |
| Authority | Sovereign (Dave Barton) |
| Last Modified | 2026-04-28 |
| BAR Reference | BAR-302 (website build), BAR-347 (domain consolidation) |
| Owner | Dave Barton |
| ctb_node | `barton-enterprises/svg-agency/insurance-informatics/website` |

### 1b. Geometry (Checklist item 11)

**CTB Position:** Branch — `barton-enterprises → svg-agency → insurance-informatics → website`

This doc sits on the Insurance Informatics branch of the Barton Enterprises CTB. Insurance Informatics is itself a branch of SVG Agency. The website is a child of Insurance Informatics — it's the public-facing expression of the discipline documented in the II CTB.

**Hub-Spoke Role:** Hub (all logic)

This UT is the hub for the entire website initiative. Every child document (Website CTB, FCE-007, Domain Architecture, BAR-302 page map) is a spoke. Content decisions, SEO strategy, domain routing, tracking architecture — all logic lives here or in documents governed by this UT.

**Altitude:** 50K-5K (spans full range)

The initiative spans from 50K strategic (which domains, what canonical, what discipline positioning) through 30K tactical (which pages, what SEO targets, which FCE columns) down to 5K execution (JSON-LD markup, page speed targets, CTA placement, event payloads).

```
Barton Enterprises (TRUNK)
  └── SVG Agency (BRANCH)
        └── Insurance Informatics (BRANCH)
              └── Website Initiative (THIS DOC — HUB)
                    ├── Website CTB (SPOKE — page architecture)
                    ├── FCE-007 (SPOKE — performance mastery)
                    ├── Domain Architecture (SPOKE — 18 domains)
                    ├── BAR-302 Page Map (SPOKE — content mapping)
                    └── CF Pages Build (SPOKE — the code)
```

### HEIR (8 fields)

| Field | Value |
|-------|-------|
| sovereign_ref | imo-creator |
| hub_id | website-initiative |
| ctb_placement | branch |
| imo_topology | middle |
| cc_layer | CC-03 (context — governs the website domain within SVG Agency) |
| services | CF Pages, Cloudflare DNS (18 zones), Mailgun, LCS Hub, Google Search Console, Google Calendar |
| secrets_provider | doppler (imo-creator/dev) |
| acceptance_criteria | All 9 pages live, all 18 domains resolve correctly, all 4 FCE columns classifiable (not UNCLASSIFIABLE), booking CTA functional on every page |

---

## 2. PURPOSE (PRD)

### WHAT

Establish insuranceinformatics.com as THE authority on insurance informatics by building a 9-page static website on Cloudflare Pages, consolidating 18 owned domains into one canonical destination, and mastering the four FCE-007 performance columns (Valuation, Concentration, Trend, Liquidity). The website is the top of the company lifecycle funnel — everything above the first human conversation.

### WHY

Without a website, the Insurance Informatics discipline has no public home. Dave coined the term. Zero competition exists in Google's index. The window to own the definition — to be THE featured snippet, THE #1 result, THE authority — is open right now and closes the moment anyone else publishes. Every day without the site is a day the canonical definition of "insurance informatics" doesn't exist in search. Meanwhile, 14 sending domains are actively used for outreach email, and those emails have nowhere to send prospects except a booking link with no context.

### WHO

| Audience | What They Need From The Site |
|----------|------------------------------|
| CEOs / CFOs | Two bills, Monte Carlo, zero commission — the executive case for insurance informatics |
| HR Leaders | 90% autopilot, ticketing, "router to auditor" — the operational relief story |
| Vendors | Many-to-one integration, two contacts, hub-spoke — the vendor pitch |
| CIOs / CTOs | Technology infrastructure credibility (weewee.me fork) |
| Regulators | Insurance license, E&O coverage (svg.agency fork) |
| Dave Barton | A front door that educates prospects before Gate 1 |

### SCOPE (in)

- insuranceinformatics.com: 9-page static site (CF Pages)
- Domain consolidation: 15 domains 301-redirecting to the canonical
- svg.agency: minimal compliance page with authority link to II
- weewee.me: tech credibility page with authority link to II
- SEO: JSON-LD structured data, sitemap, robots.txt, Open Graph, meta descriptions
- Tracking: LCS Hub page events (page_loaded, cta_clicked)
- CTA: single booking link on every page (Google Calendar)
- FCE-007: four-column mastery framework applied to website performance
- 9 inline SVG diagrams (hub-spoke, rule of twos, the duck, hospital waterfall, drug waterfall, monte carlo, data moat, two aggregators, five dashboards)
- 7 video slots (HeyGen renders, YouTube upload, page embed)
- Domain architecture documentation (18 zones, redirect rules, Mailgun integration)

### OUT-OF-SCOPE

- Client portal (separate initiative — post-onboarding)
- Sales process (four gates — documented in II CTB, not governed by this UT)
- Outreach email content (governed by outreach processes, not the website)
- Blog / articles section (future consideration — not in initial build)
- E-commerce / payment processing (no transactions on the site)
- briarvalleyproperties.com (separate business, separate CTB branch)
- A/B testing, heat mapping, retargeting (domesticated — revisit after baseline traffic)

### SUCCESS METRIC

**"insurance informatics" ranks #1 on Google.** That is the single metric. Everything else (traffic, clicks, bookings) flows from owning the definition. If we're #1, the rest follows. If we're not #1, nothing else matters.

Secondary metric: at least 1 CTA click per week within 90 days of launch (proves the plumbing works).

---

## 3. RESOURCES

### Component Status Grid (Checklist item 3)

| Component | HEIR (`hub_id . ctb . cc_layer`) | ORBT | Light | State |
|-----------|----------------------------------|------|-------|-------|
| CF Pages (content-pages) | `content-pages . leaf . CC-04` | BUILD | 🟡 | Project exists, no pages deployed |
| Cloudflare DNS (18 zones) | `cf-dns . branch . CC-03` | OPERATE | 🟢 | All 18 zones active on CF nameservers |
| LCS Hub | `lcs-hub . branch . CC-03` | OPERATE | 🟢 | `/page-event` endpoint live |
| Mailgun (14 domains) | `mailgun . branch . CC-03` | OPERATE | 🟢 | 14 sending domains verified and warming |
| Google Search Console | `gsc . leaf . CC-04` | BUILD | 🔴 | Not yet set up for insuranceinformatics.com |
| Google Calendar (booking) | `gcal-booking . leaf . CC-04` | OPERATE | 🟢 | Booking link active: `calendar.app.google/VT41mpEgTWDexFET8` |
| Insurance Informatics CTB | `ii-ctb . branch . CC-03` | BUILD | 🟢 | Content locked at all altitudes |
| Website CTB | `website-ctb . leaf . CC-03` | BUILD | 🟢 | 9 pages defined, content sources mapped |
| FCE-007 | `fce-007 . branch . CC-03` | BUILD | 🟢 | Four columns defined, mastery checklists written |
| Domain Architecture | `domain-arch . leaf . CC-03` | BUILD | 🟢 | 18 domains documented, redirect plan defined |
| Voice Spec | `voice-spec . leaf . CC-03` | OPERATE | 🟢 | Dave's voice locked in YAML |
| HeyGen (video renders) | `heygen . leaf . CC-04` | BUILD | 🔴 | No videos rendered yet |
| Diagrams (9 SVGs) | `diagrams . leaf . CC-04` | BUILD | 🔴 | No diagrams built yet |

### Live Dashboard (Checklist item 5)

| Resource | URL | What it shows |
|----------|-----|---------------|
| CF Pages Dashboard | `https://dash.cloudflare.com` → Pages → content-pages | Deploy status, build logs |
| LCS Hub Health | `https://lcs-hub.svg-outreach.workers.dev/health` | Endpoint availability |
| Google Search Console | N/A (not yet configured) | Impressions, clicks, position, indexed pages |
| Google PageSpeed Insights | `https://pagespeed.web.dev` (on-demand) | Core Web Vitals, speed scores |

### Dependencies

| Dependency | Type | What It Provides | Status |
|-----------|------|-----------------|--------|
| Insurance Informatics CTB | Content source | All page content at every CTB altitude | DONE |
| BAR-302 Website Map | Architecture | Page-to-content mapping, build sequence | DONE |
| FCE-007 Website Mastery | Performance framework | Four columns, mastery checklists, measurement | DONE |
| Domain Architecture | Domain plan | 18 zones, redirect rules, Mailgun status | DONE |
| Voice Spec | Tone/style | Dave's voice for all page copy | DONE |
| Structured Constant Deck | Visual content | Slides referenced by page content sources | DONE |
| LBB Records | Content fragments | Locked positioning statements, framing content | DONE |
| HeyGen | Video rendering | 7 video scripts need rendering | PENDING |
| SVG Diagram Design | Visual assets | 9 diagrams need design and build | PENDING |

### Downstream Consumers

| Consumer | What It Needs |
|----------|--------------|
| Outreach emails | Landing page URLs for CTAs in HAMMER campaigns |
| LinkedIn posts | Page URLs for each post's linked destination |
| Google Search | sitemap.xml, robots.txt, JSON-LD structured data |
| LCS Hub | page_loaded and cta_clicked events from tracking script |
| Sales process (Gate 1) | Prospect educated by website before first meeting |

### Tools & Integrations

| Item | Type | Cost Tier | Credentials | What It Does |
|------|------|-----------|-------------|-------------|
| Cloudflare Pages | Hosting | Free | CF account | Serves static site from edge |
| Cloudflare DNS | Infrastructure | Free | CF account | Manages 18 zones, redirects |
| Mailgun | Email | Paid | Doppler (MAILGUN_API_KEY) | 14 sending domains for outreach |
| Google Search Console | SEO | Free | Google account | Search performance tracking |
| Google Calendar | Booking | Free | Google account | Meeting scheduling (booking link) |
| LCS Hub | Tracking | Free (internal) | Doppler (LCS keys) | Page event tracking |
| HeyGen | Video | Paid | HeyGen account | AI video rendering |

### Secrets

| Secret | Doppler Project | Config | Used By |
|--------|----------------|--------|---------|
| MAILGUN_API_KEY | imo-creator | dev | Mailgun sending domains |
| LCS_HUB_AUTH | imo-creator | dev | LCS Hub event tracking |
| GLOBAL_CLOUDFLARE_API_TOKEN | imo-creator | dev | DNS management, Page Rules |

### 3c. FCEs Attached (Checklist item 8)

| FCE Name | HEIR (`hub_id . ctb . cc_layer`) | ORBT | Run Directory | Latest P=1 | Status |
|----------|----------------------------------|------|--------------|------------|--------|
| FCE-007 Website Performance Mastery | `fce-007 . branch . CC-03` | BUILD | `fleet/content/FCE-007-WEBSITE-MASTERY.md` | pending | 🟡 |

### 3d. BARs Referenced (Checklist item 9)

| BAR | Title | HEIR (`bar-id . ctb . cc_layer`) | ORBT | Status | Relation |
|-----|-------|----------------------------------|------|--------|----------|
| BAR-302 | Website Build | `bar-302 . branch . CC-03` | BUILD | In Progress | implements (9-page site, content mapping) |
| BAR-347 | Domain Consolidation | `bar-347 . branch . CC-03` | BUILD | In Progress | implements (18 domains, 301 redirects) |

### 3e. LBB Subjects Fed (Checklist item 10)

| LBB Subject | HEIR (`subject-id . ctb . cc_layer`) | ORBT | What This Doc Writes | Frequency |
|-------------|--------------------------------------|------|---------------------|-----------|
| system | `system . trunk . CC-01` | OPERATE | Architecture decisions, domain strategy | per-session |
| svg-outreach | `svg-outreach . branch . CC-02` | OPERATE | SEO findings, traffic data, content updates | on-change |

---

# CONTRACT (Flow -- what flows through this)

## 4. IMO -- Input, Middle, Output

### Two-Question Intake

1. **"What triggers this?"** — Dave's decision to build the Insurance Informatics web presence. Triggered by: 14 sending domains active with nowhere to send prospects, zero competition for "insurance informatics" in Google, II CTB content locked and ready.
2. **"How do we get it?"** — Content from II CTB (all altitudes), page map from BAR-302, domain inventory from Cloudflare, voice from Voice Spec YAML, diagrams and videos to be created.

### Input

| Input | Source | Format |
|-------|--------|--------|
| Page content (all 9 pages) | II CTB + LBB records + Structured Constant deck | Markdown + LBB JSON |
| Domain portfolio (18 zones) | Cloudflare DNS | Zone IDs, DNS records |
| Voice and tone | `fleet/content/VOICE-SPEC.yaml` | YAML |
| SEO targets (per page) | Website CTB SEO Strategy section | Keyword table |
| Diagram specifications (9) | Website CTB Diagrams section | SVG specs |
| Video scripts (7) | II CTB gate mapping + page content | Script text |
| Booking link | Google Calendar | URL |
| FCE-007 column definitions | FCE-007 Website Mastery | Performance framework |

### Middle

The Middle is where all processing happens. The transformation from locked content + domain portfolio into a live, indexed, converting website.

| Step | Input | What Happens | Output | Tool Used |
|------|-------|-------------|--------|-----------|
| 1 | II CTB content per page | Write HTML/CSS for each of 9 pages | Static HTML files | Manual build |
| 2 | Diagram specs (9) | Design and build inline SVG diagrams | 9 SVG files | Design tool |
| 3 | Video scripts (7) | Render AI videos | 7 video files (R2) | HeyGen |
| 4 | HTML + SVG + Video | Assemble pages with diagrams and video embeds | Complete static site | CF Pages |
| 5 | SEO targets per page | Add JSON-LD, meta descriptions, OG tags, sitemap | SEO-ready site | Manual |
| 6 | Tracking requirements | Add LCS Hub event script to every page | Tracked site | JS snippet |
| 7 | 18 zone configurations | Configure 301 redirects for 15 domains | All domains resolving | CF Page Rules |
| 8 | Complete site | Deploy to CF Pages, point domain DNS | Live site | CF Pages + DNS |
| 9 | Live site | Submit sitemap to Google Search Console | Indexed site | GSC |
| 10 | Indexed site | Monitor FCE-007 four columns monthly | Performance data | GSC + LCS Hub |

### Output

| Output | Destination | Format |
|--------|-------------|--------|
| 9-page static website | insuranceinformatics.com (CF Pages edge) | HTML/CSS/SVG |
| 301 redirects (15 domains) | Cloudflare Page Rules | DNS + redirect rules |
| sitemap.xml | insuranceinformatics.com/sitemap.xml | XML |
| JSON-LD structured data | Every page `<script type="application/ld+json">` | JSON-LD |
| Page events | LCS Hub `/page-event` | JSON payload |
| Booking conversions | Google Calendar | Meeting scheduled |
| Monthly FCE scorecard | Manual review (Dave) | GO / MONITOR / NO-GO per column |

### Circle

The output feeds back as input through multiple loops:

1. **Search Console loop:** Google indexes pages → impressions/clicks data → identifies underperforming pages → content updated → re-indexed
2. **LCS Hub loop:** Page events tracked → CTA click data → identifies low-converting pages → CTA/content optimized → re-tracked
3. **FCE-007 loop:** Monthly scorecard → column rated GO/MONITOR/NO-GO → NO-GO triggers investigation → fix applied → re-scored
4. **Content freshness loop:** Quarterly review → stats updated, examples refreshed → sitemap lastmod updated → Google re-crawls

---

## 5. OSAM -- DATA SCHEMA

### READ Access

| Source | What It Provides | Join Key |
|--------|-----------------|----------|
| `fleet/content/INSURANCE-INFORMATICS-CTB.md` | All page content at every altitude | CTB altitude → page number |
| `fleet/content/WEBSITE-CTB.md` | Page architecture, SEO targets, diagram specs, video slots | Page number |
| `fleet/content/FCE-007-WEBSITE-MASTERY.md` | Performance framework, mastery checklists | Column name |
| `fleet/content/DOMAIN-ARCHITECTURE.md` | 18 domains, zone IDs, redirect plan | Domain name / zone ID |
| `fleet/content/BAR-302-WEBSITE-MAP.md` | Content source mapping per page | Page number |
| `fleet/content/VOICE-SPEC.yaml` | Dave's voice and tone rules | N/A (style guide) |
| LBB records | Locked positioning statements | record_id |
| Google Search Console | Impressions, clicks, position, index status | Domain |
| LCS Hub events | page_loaded, cta_clicked | event_type + page_step |
| Cloudflare Analytics | Traffic, geography, performance | Zone ID |

### WRITE Access

| Target | What It Writes | When |
|--------|---------------|------|
| CF Pages (content-pages) | Static HTML/CSS/SVG files | Build + deploy |
| Cloudflare DNS (18 zones) | A records, CNAME records, Page Rules | Domain setup |
| Google Search Console | Sitemap submission, property verification | Post-deploy |
| LCS Hub | page_loaded, cta_clicked events | Every page load / CTA click |
| R2 (svg-files bucket) | Video files from HeyGen renders | Video pipeline |

### Process Composition

```
BAR-302 (Website Build)
  ├── Content locked (II CTB + LBB) ───────────────────┐
  ├── Diagrams designed (9 SVGs) ──────────────────────┤
  ├── Videos rendered (7 HeyGen) ──────────────────────┤
  │                                                     ▼
  │                                              CF Pages Build
  │                                                     │
  └── SEO structure (JSON-LD, meta, sitemap) ──────────┤
                                                        ▼
BAR-347 (Domain Consolidation)                    Deploy + DNS
  ├── 15 domains → 301 redirect ───────────────────────┤
  ├── svg.agency → minimal page ───────────────────────┤
  └── weewee.me → tech page ───────────────────────────┘
                                                        │
                                                        ▼
                                                  LIVE SITE
                                                        │
                                                        ▼
                                              FCE-007 Monitoring
                                         (monthly 4-column scorecard)
```

| Process ID | Name | Role in Composition | Status |
|-----------|------|---------------------|--------|
| BAR-302 | Website Build | Core build — 9 pages, content, diagrams, SEO | 🟡 In Progress |
| BAR-347 | Domain Consolidation | Domain routing — 18 zones, redirects | 🟡 In Progress |
| FCE-007 | Website Performance Mastery | Performance framework — ongoing monitoring | 🟡 BUILD |

### Join Chain

```
insuranceinformatics.com (canonical domain)
  → CF Pages (content-pages project — serves the HTML)
    → 9 pages (each with H1 containing "Insurance Informatics")
      → Booking CTA on every page (Google Calendar link)
        → LCS Hub event tracking (page_loaded, cta_clicked)
          → Attribution: communication_id → sovereign_company_id → lifecycle position

15 redirect domains (II Family + SVG Brand + medsavings)
  → Cloudflare Page Rules (301 permanent)
    → insuranceinformatics.com (canonical)

svg.agency + weewee.me (Y-fork)
  → Own content pages (not blind redirects)
    → Authority links to insuranceinformatics.com
```

### Forbidden Paths

| Action | Why |
|--------|-----|
| Modify svg.agency DNS without Dave's approval | PROTECTED domain — compliance, email, regulatory |
| Modify weewee.me DNS without Dave's approval | PROTECTED domain — existing infrastructure |
| Redirect briarvalleyproperties.com to II | Different business, different CTB branch |
| Add JavaScript frameworks (React, Vue, etc.) | Performance degradation — static HTML only |
| Add contact forms or email capture | Single CTA only — book a meeting. No friction. |
| Add chatbots or interstitials | Intercepts and delays conversion |
| Deploy without JSON-LD on every page | SEO structure is non-negotiable |
| Skip LCS Hub tracking integration | Attribution chain breaks without events |

### Query Routing

| Question | Source | Where to Look |
|----------|--------|---------------|
| Which pages get the most traffic? | Google Search Console | Performance → Pages |
| Which keywords are we ranking for? | Google Search Console | Performance → Queries |
| Are CTAs being clicked? | LCS Hub | `SELECT * FROM page_events WHERE event_type = 'cta_clicked'` |
| Which outreach emails drive page visits? | LCS Hub | `page_events` joined on `communication_id` |
| Is the site fast enough? | Google PageSpeed Insights | Run per-page test |
| Are all domains redirecting? | curl / browser | `curl -I https://{domain}` check for 301 |
| Is structured data valid? | Google Rich Results Test | Test each page URL |
| What's the FCE column status? | Manual monthly review | FCE-007 scorecard |

---

## 6. DMJ -- Define, Map, Join

### 6a. DEFINE (Build the Key)

| Element | ID | Format | Description | C or V |
|---------|-----|--------|-------------|--------|
| Canonical domain | DOM-01 | `insuranceinformatics.com` | The single destination domain. All authority consolidates here. | C |
| Insurance fork | DOM-02 | `svg.agency` | Licensed entity identity. PROTECTED. | C |
| IT fork | DOM-03 | `weewee.me` | Technology infrastructure credibility. PROTECTED. | C |
| II domain family | DOM-04-13 | 10 TLD variants | Mailgun sending + brand protection. All redirect to DOM-01. | C |
| SVG brand domains | DOM-14-16 | 3 company name variants | Brand protection. All redirect to DOM-01. | C |
| Healthcare domain | DOM-17 | `medsavings.org` | Healthcare related. Redirects to DOM-01. | C |
| Real estate domain | DOM-18 | `briarvalleyproperties.com` | SEPARATE business. Does NOT redirect. | C |
| Page structure | PG-01-09 | 9 HTML pages with defined routes | Static pages on CF Pages. Routes locked. | C |
| Booking link | CTA-01 | Google Calendar URL | `calendar.app.google/VT41mpEgTWDexFET8` | C |
| FCE columns | FCE-01-04 | Valuation, Concentration, Trend, Liquidity | Four performance measurement dimensions | C |
| II CTB content | CTB-ALL | Markdown at 5 altitudes | Content source for all 9 pages | C |
| Tracking endpoint | TRK-01 | LCS Hub `/page-event` URL | Event receiver for page_loaded, cta_clicked | C |
| Keyword rankings | KW-* | Google Search position | Per-keyword ranking position | V |
| Traffic volume | TRAF-01 | Impressions + clicks per period | Changes monthly | V |
| Conversion rate | CONV-01 | CTA clicks / page loads | Changes with traffic and content | V |
| Content freshness | FRESH-01 | Last update date per page | Quarterly refresh cycle | V |
| Backlink count | BL-01 | Referring domains count | Grows over time | V |
| PageSpeed score | SPEED-01 | 0-100 per page | Should be stable but can drift | V |

### 6b. MAP (Connect Key to Structure)

| Source | Target | Transform |
|--------|--------|-----------|
| II CTB 50K altitude | Page 1 (Home), Page 2 (What Is II), Page 8 (About Dave) | Extract → HTML content |
| II CTB 40K altitude | Page 3 (How It Works), Page 4 (Executives), Page 7 (Vendors) | Extract → HTML content |
| II CTB 10K altitude | Page 5 (For HR) | Extract → HTML content |
| II CTB 5K altitude | Page 6 (Why Permanent), Page 9 (Book) | Extract → HTML content |
| DOM-04 through DOM-17 (15 domains) | CF Page Rules | Configure → 301 redirect to DOM-01 |
| DOM-02 (svg.agency) | CF Pages or minimal HTML | Build → compliance page with link to DOM-01 |
| DOM-03 (weewee.me) | CF Pages or minimal HTML | Build → tech page with link to DOM-01 |
| CTA-01 (booking link) | Every page hero + footer | Insert → `<a>` element |
| TRK-01 (LCS Hub) | Every page `<script>` | Insert → fetch() event script |
| FCE-01-04 (columns) | Monthly scorecard | Measure → GO / MONITOR / NO-GO |
| Diagram specs (9) | Page-specific SVG embeds | Design → inline SVG |
| Video scripts (7) | Page-specific video embeds | Render → HeyGen → embed |

### 6c. JOIN (Path to Spine)

| Join Path | Type | Description |
|-----------|------|-------------|
| Domain → CF Pages → HTML → booking CTA → Google Calendar | Direct | The conversion path: visitor arrives at any domain, reaches the site, clicks CTA, books meeting |
| Outreach email → communication_id → page_loaded event → LCS Hub | Direct | Attribution: which email drove which page visit |
| Page event → sovereign_company_id → LCS lifecycle position | Direct | Identity: which company visited which page |
| 15 redirect domains → 301 → canonical domain | Direct | Authority consolidation: all link equity flows to one domain |
| II CTB altitude → page content → page route | Direct | Content mapping: what fills each page |
| FCE column → metric → data source → scorecard | Direct | Performance: how each column is measured and rated |

---

## 7. CONSTANTS & VARIABLES

### Constants (structure -- never changes)

- **Domain portfolio:** 18 domains owned, all on Cloudflare, all active
- **Canonical domain:** insuranceinformatics.com — THE destination
- **Y-fork architecture:** svg.agency (insurance) + weewee.me (IT) → insuranceinformatics.com (merge)
- **9-page structure:** Home, What Is II, How It Works, Executives, HR, Permanent, Vendors, About, Book
- **Page routes:** `/`, `/what-is-insurance-informatics`, `/how-it-works`, `/executives`, `/hr`, `/permanent`, `/vendors`, `/about`, `/book`
- **Single CTA:** Book 15 minutes → Google Calendar booking link
- **Booking link:** `https://calendar.app.google/VT41mpEgTWDexFET8`
- **FCE-007 four columns:** Valuation (Thing), Concentration (Flow), Trend (Change), Liquidity (Connection)
- **Hosting:** Cloudflare Pages (static, edge-cached, no JS frameworks)
- **Tracking:** LCS Hub `/page-event` endpoint (page_loaded, cta_clicked)
- **II CTB content:** Locked at all altitudes
- **H1 rule:** Every page H1 contains "Insurance Informatics"
- **Redirect method:** 301 permanent (Cloudflare Page Rules)
- **briarvalleyproperties.com:** SEPARATE — never redirects to II

### Variables (fill -- changes every run/cycle)

- **Keyword rankings:** Position for "insurance informatics" and per-page targets (changes as Google indexes)
- **Traffic volume:** Impressions, clicks, page views (changes monthly)
- **Conversion rate:** CTA clicks / page loads (changes with traffic)
- **Backlink count:** Number of referring domains (grows over time)
- **Content freshness:** Date of last content update per page (quarterly refresh)
- **PageSpeed score:** Core Web Vitals per page (should be stable, can drift)
- **FCE column ratings:** GO / MONITOR / NO-GO per column (monthly assessment)
- **Video availability:** Which HeyGen renders are complete (0/7 currently)
- **Diagram availability:** Which SVGs are designed (0/9 currently)
- **Google index status:** Which pages are indexed (0/9 currently)

---

## 8. STOP CONDITIONS

| Condition | Action |
|-----------|--------|
| Content not locked for a page | HALT — do not build the page without locked content |
| Booking link broken / calendar not configured | HALT — the single CTA must work before launch |
| LCS Hub `/page-event` endpoint down | HALT — launch without tracking breaks attribution chain |
| svg.agency or weewee.me DNS change requested without Dave | HALT — PROTECTED domains |
| JavaScript framework proposed | HALT — static HTML/CSS only, no SPA |
| Contact form or email capture proposed | HALT — single CTA only |
| briarvalleyproperties.com redirect to II proposed | HALT — separate business |
| PageSpeed < 50 on any page at build time | HALT — fix performance before deploy |
| JSON-LD fails Google Rich Results Test | HALT — fix structured data before launch |
| Strike 3 on same build failure | Troubleshoot/Train → Airworthiness Directive |

### Kill Switch (Checklist item 6)

```
# Take the site offline (CF Pages):
# Option 1: Delete the custom domain binding
wrangler pages project remove-domain content-pages insuranceinformatics.com

# Option 2: Pause the Cloudflare zone (stops all traffic)
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/5178b290420b9279430dc584b77c29c6" \
  -H "Authorization: Bearer $GLOBAL_CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paused": true}'

# Disable tracking (stop events to LCS Hub):
# Remove or comment out the tracking script in the page HTML
```

---

# GOVERNANCE (Change -- how this is controlled)

## 9. VERIFICATION

```
1. Visit insuranceinformatics.com → expected: 9 pages load, each with H1 containing "Insurance Informatics"
2. Click booking CTA on each page → expected: Google Calendar booking page opens
3. Check LCS Hub events → expected: page_loaded fires on every page load, cta_clicked fires on CTA click
4. curl -I insuranceinformatics.net → expected: HTTP 301 Location: https://insuranceinformatics.com/
5. curl -I insurance-informatics.com → expected: HTTP 301 Location: https://insuranceinformatics.com/
6. curl -I svgwv.com → expected: HTTP 301 Location: https://insuranceinformatics.com/
7. curl -I briarvalleyproperties.com → expected: HTTP 200 (own site, NOT a redirect to II)
8. Google Rich Results Test on each page → expected: valid structured data, no errors
9. Google PageSpeed Insights on each page → expected: score > 90 (mobile + desktop)
10. GET insuranceinformatics.com/sitemap.xml → expected: XML with all 9 page URLs
11. GET insuranceinformatics.com/robots.txt → expected: Allow all, Sitemap URL present
12. View page source on each page → expected: JSON-LD, OG tags, canonical URL present
```

**Three Primitives Check:**
1. **Thing:** Do all 9 pages exist at their routes? Do all 18 domains have active DNS? Does the booking link resolve?
2. **Flow:** Do 301 redirects work? Do page events reach LCS Hub? Does the sitemap reach Google?
3. **Change:** Does Google index the pages? Do rankings appear in Search Console? Do CTA clicks register?

---

## 9b. Live Verification Log (Checklist item 12)

| Claim / Field | Section | Source of Truth | Verification Command / Query | Verified? | Last Check | Value at Check |
|---------------|---------|-----------------|------------------------------|-----------|-----------|----------------|
| 18 CF zones active | §3 | Cloudflare API | `curl CF API /zones` | ☐ | — | — |
| LCS Hub endpoint live | §3 | LCS Hub | `curl https://lcs-hub.svg-outreach.workers.dev/health` | ☐ | — | — |
| Booking link works | §7 | Google Calendar | Visit `calendar.app.google/VT41mpEgTWDexFET8` | ☐ | — | — |
| 14 Mailgun domains verified | §3 | Mailgun API | `curl Mailgun API /domains` | ☐ | — | — |
| CF Pages project exists | §3 | Cloudflare Dashboard | Check Pages → content-pages | ☐ | — | — |
| BAR-302 status | §3d | Linear | Check Linear BAR-302 | ☐ | — | — |
| BAR-347 status | §3d | Linear | Check Linear BAR-347 | ☐ | — | — |
| Kill switch command works | §8 | CF API | Test zone pause/unpause | ☐ | — | — |

**Rule:** All rows must be checked before ORBT can move to OPERATE.

---

## 10. ANALYTICS

### 10a. Metrics

| Metric | Unit | Baseline | Target | Tolerance |
|--------|------|----------|--------|-----------|
| "insurance informatics" Google rank | Position (1-100) | UNRANKED | #1 | Position 1-3 |
| PageSpeed score (mobile) | 0-100 | N/A | > 90 | 85-100 |
| Weekly CTA clicks | Count | 0 | > 1/week by day 90 | > 0 |
| Monthly impressions | Count | 0 | Growing MoM | No 2-month decline |
| Indexed pages | Count | 0 | 9 | 9 (exact) |
| 301 redirect success | Count of working redirects | 0 | 15/15 | 15/15 (exact) |
| JSON-LD validation | Pass/Fail per page | N/A | 9/9 pass | 9/9 (exact) |

### 10b. Sigma Tracking

| Metric | Launch | Day 30 | Day 60 | Day 90 | Trend | Action |
|--------|--------|--------|--------|--------|-------|--------|
| Google rank | — | — | — | — | — | Populate after launch |
| CTA clicks/week | — | — | — | — | — | Populate after launch |
| Monthly impressions | — | — | — | — | — | Populate after launch |

### 10c. ORBT Gate Rules

| From | To | Gate |
|------|-----|------|
| BUILD | OPERATE | All 9 pages live, all 15 redirects working, sitemap submitted, GSC verified, JSON-LD valid, PageSpeed > 90, tracking events firing |
| OPERATE | REPAIR | Any FCE column rated NO-GO, or site down, or tracking broken |
| REPAIR | OPERATE | Fix applied, column re-rated, all verification passing |
| Any (Strike 3) | TROUBLESHOOT/TRAIN | Same failure 3 times → fleet-wide fix → Airworthiness Directive |

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

_Created ONLY when the auditor certifies (BUILD → OPERATE). Append-only. The legal identity._

**No logbook during BUILD.** This initiative is in BUILD. Logbook will be created when all acceptance criteria pass and an auditor (different engine than builder) certifies.

### Birth Certificate

| Field | Value |
|-------|-------|
| heir_ref | website-initiative / branch / CC-03 |
| orbt_entered | BUILD |
| orbt_exited | pending |
| action | pending certification |
| gates_passed | pending |
| signed_by | pending |
| signed_at | pending |

---

## 13. FLEET FAILURE REGISTRY

| Pattern ID | Location | Error Code | First Seen | Occurrences | Strike Count | Status |
|-----------|----------|-----------|-----------|-------------|-------------|--------|
| — | — | — | — | — | — | No failures recorded (BUILD phase) |

**Strike 1:** Repair. **Strike 2:** Scrutiny. **Strike 3:** Troubleshoot/Train → Airworthiness Directive.

---

## 14. MAINTENANCE LOGBOOK

### Action Types

| Type | Meaning |
|------|---------|
| RETROFIT | UT structure / template upgrade applied |
| VERIFY | Claim grounded against live system (§9b row ticked) |
| AUDIT | FAA Inspector (auditor) pass — PASS / FAIL recorded |
| EDIT | Content change (new step added, schema changed, etc.) |
| CERTIFY | Moved ORBT state (e.g., BUILD → OPERATE) |
| REPAIR | Post-strike fix |
| STRIKE | Fleet failure recorded (§13) |
| LBB_INGEST | Session summary written to LBB |

### Logbook (append-only)

| Date (ISO) | Actor | Action | What Was Done | Evidence | LBB Record |
|-----------|-------|--------|---------------|----------|------------|
| 2026-04-28 | Claude | EDIT | Initial UT creation — full 14-section document with all content filled from FCE-007, Website CTB, Domain Architecture, BAR-302 | This file | pending |

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-04-28 |
| Last Modified | 2026-04-28 |
| Version | 1.0.0 |
| Template Version | 2.7.0 |
| Medium | Domain (website + domain portfolio) |
| US Validated | pending |
| Governing Engine | law/doctrine/FOUNDATIONAL_BEDROCK.md + law/doctrine/DMJ.md |
| Parent | `fleet/content/FCE-007-WEBSITE-MASTERY.md` |
| Children | `fleet/content/WEBSITE-CTB.md`, `fleet/content/DOMAIN-ARCHITECTURE.md`, `fleet/content/BAR-302-WEBSITE-MAP.md` |
| CTB Node | `barton-enterprises/svg-agency/insurance-informatics/website` |
