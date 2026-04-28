# FCE-007 Website Performance Mastery
## The trunk document governing website performance across all three domains. The websites are branches — byproducts of mastering the four FCE columns. Fix the trunk and all three branches improve automatically.
### Status: BUILD
### Authority: Dave Barton
### BAR: BAR-302
### Created: 2026-04-28

---

## Identity

| Field | Value |
|-------|-------|
| hub_id | fce-007-website-mastery |
| ctb_node | barton-enterprises/fce/fce-007-website-performance |
| Position | TRUNK — the three websites are branches |
| Children | insuranceinformatics.com, svg.agency, weewee.me |
| Parent FCE | `law/doctrine/FCE.md` (the engine) |
| Website CTB | `fleet/content/WEBSITE-CTB.md` (child — page-level architecture) |
| II CTB | `fleet/content/INSURANCE-INFORMATICS-CTB.md` (content source) |
| Booking Link | `https://calendar.app.google/VT41mpEgTWDexFET8` |

---

## The Thesis

The FCE columns are the discipline. The websites are the scoreboard.

We don't "build websites." We master four performance columns and the websites fall out as natural expressions. Page speed is Valuation. Keyword authority is Concentration. Content freshness is Trend. Conversion plumbing is Liquidity. Every website decision traces to one of these four columns. If a task doesn't improve a column, it doesn't get done.

Fix the trunk — all three branches improve automatically. A schema markup fix applies to all three sites. A backlink strategy compounds across all three domains. A CTA optimization lifts every page on every property. The websites are NOT three independent projects. They are three views of the same discipline.

**The FCE adapter for websites:**

```
DOMAIN: Website Performance
SCOREBOARD: organic traffic, keyword rankings, conversion rate (CTA → booked meeting)

VALUATION COLUMN:
  Metric: Technical SEO health — does the site exist correctly for search engines?
  Healthy threshold: PageSpeed > 90, zero crawl errors, complete structured data
  Broken threshold: PageSpeed < 50, missing sitemaps, broken schema

CONCENTRATION COLUMN:
  Metric: Where is the traffic? Keyword rankings + backlink profile
  Healthy threshold: #1 for "insurance informatics", growing backlink count
  Broken threshold: Not indexed, zero backlinks, no keyword presence

TREND COLUMN:
  Metric: Is authority growing? Impressions, position, content freshness
  Healthy threshold: Month-over-month impression growth, quarterly content updates
  Broken threshold: Flat or declining impressions, stale content, no publishing cadence

LIQUIDITY/PLUMBING COLUMN:
  Metric: Can visitors convert? CTA visibility, click tracking, booking flow
  Healthy threshold: CTA above fold on every page, 2-click booking, events firing
  Broken threshold: No CTA, broken booking link, no tracking
```

---

## The Y-Fork Architecture

Three websites. One trunk. Two forks that merge.

```
                    FCE-007 WEBSITE MASTERY (this doc)
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         svg.agency      weewee.me    insuranceinformatics.com
       (insurance fork)  (IT fork)       (the merge point)
              │               │               │
              └───────────────┴───────┬───────┘
                                      │
                              SAME FOUR COLUMNS
                              SAME FCE ENGINE
                              SAME BOOKING LINK
```

### svg.agency — The Insurance Fork

The compliance shell. This is where the insurance license, E&O coverage, and regulatory identity live. SVG Agency LLC is the licensed entity. The website exists primarily for:
- Regulatory compliance (state insurance departments can look you up)
- LinkedIn company page URL
- Email domain (dbarton@svg.agency)
- Future: 301 redirect to insuranceinformatics.com to consolidate domain authority, OR minimal landing page that immediately funnels to II

**Current function:** Compliance presence + email domain. Not a content destination.

### weewee.me — The IT Fork

The technology infrastructure story. This is the CIO/CTO-facing surface. Where the engine itself is shown — 38-node Cloudflare edge, real-time data architecture, API integrations, the operational machine. The audience that cares about HOW it works, not WHAT it does for their benefits bill.

**Current function:** Tech-facing credibility. Potential CIO landing page.

### insuranceinformatics.com — The Merge Point

Insurance + IT = Insurance Informatics. This is where the two forks meet. The 9-page, SEO-first, diagram-heavy destination. The primary content property. All roads lead here.

**Governed by:** `fleet/content/WEBSITE-CTB.md` (9 pages, full page tree, SEO strategy, tracking architecture)

**The merge logic:** svg.agency provides the license and compliance identity. weewee.me provides the technology credibility. insuranceinformatics.com combines both into a named discipline that neither fork can express alone. The sum is greater than the parts.

---

## Column 1: VALUATION (Thing -- Does It Exist Correctly?)

**The question:** If Google crawls this site right now, does it find a well-built, fast, correctly structured property?

Valuation is the foundation. A site that doesn't load fast, isn't mobile-friendly, or lacks structured data is mispriced in Google's index. It exists, but it exists poorly. Technical SEO is the Thing primitive applied to websites — does the thing exist where and how it should?

### Page Speed

| Target | Implementation | Why |
|--------|---------------|-----|
| TTFB < 100ms | CF Pages edge cache, static HTML, no JS frameworks | Cloudflare serves from 300+ edge locations. Static = instant. |
| FCP < 1s | No render-blocking JS, minimal CSS, inline critical styles | First paint is the first impression. |
| LCP < 2.5s | Lazy-load videos (poster frames), optimize SVG diagrams | Largest element can't block the page. |
| CLS = 0 | Fixed dimensions on all media, no layout shifts | Nothing jumps. Nothing moves unexpectedly. |
| FID < 100ms | Near-zero JS (tracking + video player only) | No SPA, no React, no build step. |

**CF Pages advantage:** Static site on Cloudflare's edge network. No origin server. No cold starts. No database queries. The hosting layer is domesticated — range so tight it can't affect the outcome. This is a solved problem.

### Mobile Responsiveness

- Viewport meta tag on every page
- Touch targets minimum 48x48px
- Readable text without zoom (16px base minimum)
- No horizontal scroll
- Images and diagrams scale to viewport
- Single-column layout on mobile
- CTA buttons full-width on mobile

### SSL / Security

Automatic via Cloudflare. HTTPS everywhere. HSTS headers. No mixed content. Domesticated variable — locked by infrastructure choice.

### Schema Markup (JSON-LD)

Every page carries structured data. This is how Google understands what it's looking at, not just what the text says.

| Schema Type | Where | Purpose |
|-------------|-------|---------|
| Organization | Every page | SVG Agency LLC identity, logo, contact |
| ProfessionalService | Home, What Is II, How It Works | Defines the service category |
| Person | About Dave | Dave Barton as the practitioner |
| WebPage | Every page | Page-level metadata |
| FAQPage | What Is II (potential) | Featured snippet targeting |
| BreadcrumbList | Every page | Site hierarchy for SERP display |

### Crawlability

| Element | Implementation |
|---------|---------------|
| Semantic HTML | `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>` |
| Heading hierarchy | H1 (one per page, contains "Insurance Informatics") > H2 > H3 |
| Internal linking | Every page links to Book. Related pages cross-link. |
| SVG diagrams | Inline SVG with `<title>` and `<desc>` for accessibility |
| Alt text | Every image has descriptive alt text |
| sitemap.xml | All pages listed with `<priority>` and `<changefreq>` |
| robots.txt | Allow all crawlers, point to sitemap |

### Canonical URLs

Each page self-canonicalizes. No duplicate content issues. svg.agency pages that overlap with insuranceinformatics.com use canonical pointing to II to consolidate authority.

### 301 Redirects

svg.agency --> insuranceinformatics.com for any overlapping content. This tells Google: "the authority lives HERE, not there." Domain authority consolidation.

### Open Graph + Twitter Cards

Every page carries social sharing metadata:
- `og:title` — page title
- `og:description` — featured-snippet-ready definition
- `og:image` — page-specific social image (diagram or branded graphic)
- `og:url` — canonical URL
- `twitter:card` — summary_large_image

### Mastery Checklist

- [ ] All three sites pass Google PageSpeed Insights > 90 (mobile + desktop)
- [ ] All three sites have JSON-LD structured data validated via Google Rich Results Test
- [ ] All three sites have sitemaps submitted to Google Search Console
- [ ] All three sites have proper canonical URLs (self-referencing)
- [ ] Mobile usability: zero errors in Search Console
- [ ] Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1 on all pages
- [ ] robots.txt deployed on all three domains
- [ ] HTTPS everywhere, no mixed content warnings
- [ ] Open Graph tags on every page, validated with Facebook Sharing Debugger
- [ ] Semantic HTML: proper heading hierarchy, landmarks, alt text
- [ ] svg.agency overlapping pages 301-redirect to insuranceinformatics.com

---

## Column 2: CONCENTRATION (Flow -- Where's the Traffic?)

**The question:** Where is the herd, and where is the neglected opportunity?

This is the FCE core thesis applied to search. The herd is chasing "employee benefits consulting" and "health insurance broker" — saturated, expensive, generic keywords. The neglected space is "insurance informatics" — a term Dave coined. ZERO competition. The category doesn't exist in Google's index yet. We're not competing. We're defining.

### Primary Keyword Strategy

| Keyword | Competition | Strategy |
|---------|------------|----------|
| "insurance informatics" | ZERO | Own the definition. Featured snippet. Category creation. |
| "what is insurance informatics" | ZERO | Page 2 exists specifically for this query. |
| "self insured benefits consulting" | LOW-MEDIUM | Secondary keyword. Real demand, low competition. |
| "insurance informatics for CFOs" | ZERO | Executive-targeted. Page 4 owns this. |
| "insurance informatics HR" | ZERO | HR-targeted. Page 5 owns this. |
| "insurance informatics data moat" | ZERO | Thought-leadership keyword. Page 6. |

**The owned-term advantage:** When you coin the term, you ARE the definition. Google has no competing source. The featured snippet is ours by default if we structure the answer correctly (definition paragraph in the first 50 words, followed by supporting detail).

### Long-Tail Keywords Per Page

Every page targets one primary keyword and 2-3 secondary keywords. Full mapping in `fleet/content/WEBSITE-CTB.md` (SEO Strategy section). Each page's H1, meta title, meta description, and first paragraph are optimized for its primary keyword.

### Backlink Sources

Backlinks are the Flow primitive — they're how authority MOVES between domains. More inbound links from quality sources = more authority flowing to our domain.

| Source | Type | Frequency | Notes |
|--------|------|-----------|-------|
| LinkedIn posts | Social signal + direct link | 1-2x/week | Each post links to a specific page |
| LinkedIn company page | Profile link | Static | svg.agency or insuranceinformatics.com |
| Email signatures | Direct link | Every email | dbarton@svg.agency signature links to II |
| HAMMER outreach emails | Direct link | Per campaign | Every outreach email can include a page link |
| YouTube video descriptions | Direct link | Per video | HeyGen renders link back to source page |
| Google Business Profile | Citation | Static | Set up and linked to II domain |
| Industry directories | Citation | One-time setup | Insurance industry directories, IT directories |
| Guest posts / thought leadership | Editorial link | Quarterly target | LinkedIn articles, industry publications |
| Cross-domain links | Internal (cross-property) | Static | svg.agency > II, weewee.me > II |

### Internal Linking Architecture

Every page links to the Book page (the conversion endpoint). Related pages cross-link based on content relationships:

```
Home ──── What Is II ──── How It Works
  │            │               │
  │            │          ┌────┴────┐
  │            │     Executives    HR
  │            │          │        │
  └────────────┴──── Why Permanent
                          │
                     For Vendors
                          │
                     About Dave
                          │
                        Book ◄── (every page links here)
```

### Cross-Domain Linking

- svg.agency --> insuranceinformatics.com (authority flows to primary domain)
- weewee.me --> insuranceinformatics.com (tech credibility feeds the merge point)
- insuranceinformatics.com is the authority sink — all links point inward

### Social Signals

LinkedIn is the primary social platform. Dave's audience (CEOs, CFOs, HR leaders) lives on LinkedIn. Every LinkedIn post:
1. Delivers a standalone insight (not a teaser)
2. Links to a specific page on insuranceinformatics.com
3. Uses the vocabulary from the II CTB (consistent terminology = brand)
4. Engages with comments (social signals = Flow)

### Mastery Checklist

- [ ] "insurance informatics" ranks #1 on Google (should be immediate — zero competition)
- [ ] "what is insurance informatics" triggers a featured snippet with our definition
- [ ] Each page ranks for its target long-tail keyword (track in Search Console)
- [ ] 10+ external backlinks within 90 days of launch
- [ ] LinkedIn posts average 1+ per week, each linking to a specific page
- [ ] Google Business Profile set up, verified, and linked to insuranceinformatics.com
- [ ] All three domains registered in Google Search Console
- [ ] Cross-domain links active: svg.agency > II, weewee.me > II
- [ ] Email signature on dbarton@svg.agency links to insuranceinformatics.com
- [ ] Internal linking: every page links to Book, related pages cross-link

---

## Column 3: TREND (Change -- Is Authority Growing?)

**The question:** Is the change sustainable? Is domain authority actually growing, or are we flat?

Trend is the Change primitive. A site can be perfectly built (Valuation) and correctly linked (Concentration), but if authority isn't growing over time, the system is static. Static systems don't compound. Authority must accumulate.

### Content Freshness Strategy

| Content Type | Cadence | Purpose |
|-------------|---------|---------|
| LinkedIn posts | 1-2x/week | Social signal + backlink + brand awareness |
| Page content updates | Quarterly | Refresh stats, examples, case studies |
| New case studies | As clients close | Anonymized results — "Company X saved $Y" |
| Video library | Ongoing (HeyGen renders) | Video content ranks separately in Google |
| Blog/articles section | Future consideration | Long-form content for additional keyword targets |

### LinkedIn Posting Cadence

LinkedIn is the primary content engine. Dave's voice (from `fleet/content/VOICE-SPEC.yaml`) drives the tone. Every post maps to an II CTB altitude:

| Post Type | Altitude | Example Topic |
|-----------|----------|---------------|
| Category definition | 50K | "Insurance informatics isn't a brand. It's a discipline." |
| Two-sides explainer | 40K | "Your benefits have two bills. Most CFOs only see one." |
| Process insight | 30K-20K | "The Rule of Twos: 90% of employees cost 15% of the money." |
| Service model | 10K | "HR goes from router to auditor." |
| Data moat | 5K | "Every month of data makes us harder to replace." |

### Authority Growth Signals

Track these in Google Search Console monthly:

| Signal | What It Means | Target Direction |
|--------|--------------|-----------------|
| Total impressions | How often Google shows our pages | UP month over month |
| Total clicks | How often people click through | UP month over month |
| Average position | Where we rank on average | DOWN (lower = better) |
| Indexed pages | How many pages Google has indexed | STABLE at 9 (no bloat) |
| Referring domains | Unique domains linking to us | UP month over month |

### Video Content Pipeline

Video content is a separate ranking vector. Google surfaces videos in search results independently of page content.

| Video | HeyGen Status | YouTube | Page Embed |
|-------|--------------|---------|------------|
| C-00 — 50K Intro | TODO | TODO | Home, Book |
| E-01 — Self-Insured vs Fully Insured | TODO | TODO | What Is II |
| E-02 — 90/15 and 10/85 | TODO | TODO | How It Works |
| E-03 — Bill Audit | TODO | TODO | For Executives |
| E-04 — What Your Broker Can't See | TODO | TODO | For HR |
| E-05 — Deconstructing the Duck | TODO | TODO | For Executives |
| V-01 — Vendor Pitch | TODO | TODO | For Vendors |

**Pipeline:** Script (from II CTB) --> HeyGen render --> R2 storage --> YouTube upload --> Page embed

Each YouTube video description includes a link back to its source page on insuranceinformatics.com. This creates a backlink loop: page references video, video references page.

### Domain Age and History

Domain age is a ranking signal. The older the domain with consistent content, the more Google trusts it.

- insuranceinformatics.com — registration date and history to be confirmed
- svg.agency — established domain, email active
- weewee.me — established domain

### Content Update Protocol

Every quarter, review all 9 pages:
1. Are stats current? Update any numbers.
2. Are examples relevant? Add new case studies if available.
3. Are diagrams accurate? Update if the business model evolved.
4. Are meta descriptions still optimal? Revise for better CTR.
5. Update `<lastmod>` in sitemap.xml for any changed pages.

### Mastery Checklist

- [ ] Search Console shows impression growth month over month
- [ ] Average position improving (decreasing) for target keywords
- [ ] Content reviewed and updated at least quarterly
- [ ] Video library growing (HeyGen renders uploaded to YouTube)
- [ ] LinkedIn posting consistent (no gaps > 2 weeks)
- [ ] At least 1 new backlink acquired per month
- [ ] Domain indexed with zero crawl errors in Search Console
- [ ] YouTube channel set up with video descriptions linking to II pages
- [ ] Case studies added as clients close (anonymized)

---

## Column 4: LIQUIDITY (Connection -- Can They Convert?)

**The question:** When someone lands on the site, can they actually DO the thing we want them to do?

Liquidity is the Connection primitive. The plumbing. All the Valuation, Concentration, and Trend in the world are worthless if the visitor can't convert. In our case, conversion has exactly one definition: **book a 15-minute meeting.**

### The Single Conversion Action

There is ONE CTA across all three websites: **Book 15 Minutes.**

- Booking link: `https://calendar.app.google/VT41mpEgTWDexFET8`
- No email capture forms. No newsletter signups. No "download our whitepaper." One action. Book a meeting.
- This is intentional. Multiple CTAs dilute. One CTA converts.

### CTA Placement

Every page on insuranceinformatics.com has the CTA in two positions:

| Position | Why |
|----------|-----|
| Above the fold (hero section) | Visitors who already know they want to talk don't have to scroll |
| Bottom of page (after content) | Visitors who read the whole page are now educated and ready |

**CTA copy options (A/B test candidates):**
- "15 minutes. Four videos. The math does the talking." (from Home page spec)
- "Start Your Evaluation" (from Book page)
- "I encourage you to compete it." (Dave's signature close)
- "Book 15 Minutes" (direct, no friction)

### Friction Audit

How many clicks from landing to booked meeting?

```
CURRENT TARGET: 2 clicks

Click 1: Land on any page (from search, LinkedIn, email)
Click 2: Click CTA button --> Google Calendar booking page

That's it. Two clicks. No forms. No login. No "tell us about your company first."
```

**Friction killers to avoid:**
- No contact forms (they add a step and require follow-up)
- No "request a demo" language (implies process, not immediacy)
- No gated content (no email required to read anything)
- No chatbots (they intercept and delay)

### Tracking Architecture

All page events flow to LCS Hub (`https://lcs-hub.svg-outreach.workers.dev/page-event`).

| Event | Trigger | What It Tells Us |
|-------|---------|-----------------|
| `page_loaded` | Page renders | Which pages get traffic, from where, when |
| `cta_clicked` | Booking CTA clicked | Conversion — the only metric that matters |

### Event Payload

Every event carries attribution context:

| Key | Description |
|-----|-------------|
| `sovereign_company_id` | If visitor came from outreach, their company ID |
| `communication_id` | If from an email, which specific communication sent them |
| `event_type` | `page_loaded` or `cta_clicked` |
| `lifecycle_phase` | Always `website` |
| `page_step` | Which page (1-9) |
| `signal_set_hash` | Fingerprint of the visit context |
| `payload` | UTM params, referrer, etc. |

### Attribution Chain

The full path from outreach to booked meeting:

```
Outreach email (communication_id)
  --> Page load (page_loaded, page_step, lifecycle_phase=website)
    --> CTA click (cta_clicked)
      --> Booking (Gate 1 scheduled in Google Calendar)
        --> LCS Hub links company to lifecycle position
```

This closes the loop. We know WHO visited (if from outreach), WHICH page they landed on, WHETHER they clicked the CTA, and WHETHER they booked. The Circle is closed.

### The Funnel (Website to Client)

The website is the top of the funnel. Everything above the first human conversation.

```
WEBSITE ──► Gate 1 (Fact Finder, 15 min)
              ──► Gate 2 (Education + Monte Carlo, 15-20 min)
                    ──► Gate 3 (Service Model, 15-20 min)
                          ──► Gate 4 (The Numbers, 15 min)
                                ──► CLIENT ONBOARDING
                                      ──► CLIENT PORTAL
```

The website's ONLY job is to get someone to Gate 1. Everything after that is the sales process (four gates, documented in II CTB). The website does NOT sell. The website educates and books a meeting.

### Future Optimization (Domesticated for Now)

These are variables with ranges too tight to affect the current outcome. Revisit after baseline traffic is established:

- **A/B testing:** CTA copy, placement, button color — requires traffic volume to be statistically meaningful
- **Heat mapping:** Where do visitors actually look? Cloudflare Analytics or similar
- **Exit intent:** Popup CTA when cursor moves to close — aggressive, test carefully
- **Retargeting:** Pixel-based ads for visitors who didn't convert — requires ad spend budget

### Mastery Checklist

- [ ] Every page has booking CTA above the fold
- [ ] Every page has booking CTA at bottom
- [ ] CTA clicks tracked in LCS Hub (`cta_clicked` events firing)
- [ ] Page loads tracked in LCS Hub (`page_loaded` events firing)
- [ ] Booking link works and calendar is configured (available slots visible)
- [ ] Funnel: landing --> booked meeting in 2 clicks maximum
- [ ] Attribution: outreach emails carry `communication_id` that passes through to page events
- [ ] No friction elements: no forms, no gated content, no chatbots
- [ ] Google Calendar booking page loads correctly on mobile
- [ ] LCS Hub `/page-event` endpoint receiving events (health check)

---

## Measurement Dashboard

### Monthly FCE Scorecard

Rate each column GO / MONITOR / NO-GO / UNCLASSIFIABLE every month.

| Column | Metric | Source | GO Threshold | NO-GO Threshold |
|--------|--------|--------|-------------|-----------------|
| Valuation | PageSpeed score | Google PageSpeed Insights | > 90 all sites | < 50 any site |
| Concentration | "insurance informatics" rank | Google Search Console | #1 | Not in top 10 |
| Trend | Month-over-month impressions | Google Search Console | Growing | Declining 2+ months |
| Liquidity | CTA click rate | LCS Hub events | > 0 clicks/week | Zero clicks for 2+ weeks |

### Data Sources

| Source | What It Measures | Columns Served | Access |
|--------|-----------------|---------------|--------|
| Google Search Console | Impressions, clicks, position, indexed pages | Concentration, Trend | Free, per-domain |
| Google PageSpeed Insights | Core Web Vitals, speed scores | Valuation | Free, on-demand |
| Cloudflare Analytics | Traffic, geography, threats, performance | All four | Free with CF account |
| LCS Hub events | page_loaded, cta_clicked | Liquidity | Custom, `https://lcs-hub.svg-outreach.workers.dev` |
| LinkedIn analytics | Post impressions, engagement, profile views | Concentration, Trend | Free with LinkedIn account |
| YouTube analytics | Video views, watch time, click-through | Trend | Free with YouTube account |
| Google Rich Results Test | Structured data validation | Valuation | Free, on-demand |

### Review Cadence

| Frequency | What | Action |
|-----------|------|--------|
| Weekly | LinkedIn posting check | Did we post this week? If not, why? |
| Monthly | FCE scorecard | Rate all four columns. Any NO-GO = investigate immediately. |
| Quarterly | Content freshness review | Update stats, examples, meta descriptions on all 9 pages. |
| Quarterly | Backlink audit | How many new referring domains? Quality check. |
| Annually | Full technical audit | Re-run PageSpeed, structured data tests, crawl all pages. |

---

## Three Websites -- Branch Details

### insuranceinformatics.com (The Merge Point)

| Field | Value |
|-------|-------|
| Pages | 9 (Home, What Is II, How It Works, Executives, HR, Permanent, Vendors, About, Book) |
| Audience | CEOs, CFOs, HR leaders of 50-200 life self-insured employers |
| Primary Keyword | "insurance informatics" |
| Hosting | CF Pages (static site, edge-cached) |
| Tracking | LCS Hub page events |
| Governed By | `fleet/content/WEBSITE-CTB.md` |
| Content Source | `fleet/content/INSURANCE-INFORMATICS-CTB.md` |
| Diagrams | 9 inline SVGs (hub-spoke, rule of twos, the duck, hospital waterfall, drug waterfall, monte carlo, data moat, two aggregators, five dashboards) |
| Videos | 7 HeyGen renders (C-00, E-01 through E-05, V-01) |
| Build Status | Content locked. Diagrams TODO. Videos TODO. Build TODO. |

This is the primary property. All SEO effort, all backlink effort, all content effort focuses here. The other two domains feed authority TO this domain.

### svg.agency (The Insurance Fork)

| Field | Value |
|-------|-------|
| Purpose | Compliance shell — insurance license, E&O, regulatory identity |
| Audience | State regulators, compliance checks, LinkedIn profile visitors |
| Primary Function | Email domain (dbarton@svg.agency) + regulatory presence |
| Future State | Minimal landing page with immediate redirect/link to insuranceinformatics.com |
| SEO Role | Authority donor — links from svg.agency flow to insuranceinformatics.com |
| Protected | YES — DNS for svg.agency is NEVER modified without Dave's explicit approval |

**Minimum viable page:**
- Company name: SVG Agency LLC
- License information
- Contact: dbarton@svg.agency
- Link to insuranceinformatics.com: "Visit Insurance Informatics to learn how we work"
- JSON-LD: Organization schema

### weewee.me (The IT Fork)

| Field | Value |
|-------|-------|
| Purpose | Technology infrastructure credibility |
| Audience | CIOs, CTOs, technology-minded executives |
| Primary Function | The "under the hood" story — how the engine works |
| Future State | Tech-facing landing page highlighting the 38-node architecture |
| SEO Role | Authority donor — links from weewee.me flow to insuranceinformatics.com |
| Protected | YES — DNS for weewee.me is NEVER modified without Dave's explicit approval |

**Potential content:**
- The 38-node Cloudflare edge architecture
- Real-time data pipeline (D1 + Neon + R2)
- Hub-spoke operational model (technical view)
- API-first vendor integration
- Data warehouse architecture per client
- Link to insuranceinformatics.com: "See what this infrastructure delivers"

---

## The Structural Obsolescence Guard

Applied to the website medium itself:

**Can you name a permanent replacement for websites as a discovery + credibility medium?**

NO. Social media platforms come and go. Search engines evolve. But a domain you own, serving content you control, on infrastructure you manage — that's the constant. The PLATFORM is the variable (Google today, something else tomorrow). The PROPERTY (your domain, your content, your structured data) is the constant.

Websites are not structurally obsolete. They are cyclically neglected by people who chase social media virality. Position in the neglected space. Build the property correctly. Wait for the herd to remember that owning your audience beats renting it.

---

## Gate Output — Current State

| Column | Current State | Rating |
|--------|--------------|--------|
| Valuation | Sites not yet built (II) or minimal (svg.agency, weewee.me) | UNCLASSIFIABLE |
| Concentration | "insurance informatics" not yet indexed | UNCLASSIFIABLE |
| Trend | No baseline data yet | UNCLASSIFIABLE |
| Liquidity | Booking link active but no page CTAs yet | UNCLASSIFIABLE |

**Overall: UNCLASSIFIABLE** — insufficient data. Sites are in BUILD phase. First measurement after launch + 30 days of data collection.

**Target state at launch + 90 days: GO on all four columns.**

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-04-28 |
| Last Modified | 2026-04-28 |
| BAR | BAR-302 |
| Version | 1.0.0 |
| Status | BUILD |
| Authority | Dave Barton |
| Parent | `law/doctrine/FCE.md` (the engine) |
| Children | `fleet/content/WEBSITE-CTB.md`, svg.agency config, weewee.me config |
| CTB Node | barton-enterprises/fce/fce-007-website-performance |
