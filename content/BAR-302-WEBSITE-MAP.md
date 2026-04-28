# BAR-302 — Website Page Map
## Three domains. One architecture. CTB altitudes → pages → content.
### Status: BUILD
### BAR: BAR-302

---

## Three Domains

| Domain | Purpose | Audience |
|--------|---------|----------|
| **svg.agency** | The recognized brand. Compliance shell (license + E&O). | Everyone — the front door |
| **insuranceinformatics.com** | The methodology brand. Authority hub. Education. | CEOs, CFOs, HR, advisors |
| **weewee.me** | The actual business model. Consulting fee, no BOR, no 5500. | Post-engagement, operational |

---

## Page Map — CTB Altitude → Page → Content Source

| # | Page | CTB Altitude | Structured Constant Slide | LBB Content | Video |
|---|------|-------------|--------------------------|-------------|-------|
| 1 | **Home** | 50K | Slide 1 (title) + Slide 11 (hero line) | Core positioning statement (06a8a2db) | C-00 (50K intro) |
| 2 | **What Is Insurance Informatics** | 50K | Slide 2 (audience filter) + Slide 5 (genesis) | "Different race" framing (0d7e2104), Category of one | E-01 (self-insured vs fully) |
| 3 | **How It Works** | 40K-30K | Slide 8 (38-node hub) + Slide 9 (Rule of Twos) + Slide 10 (interception) | Two-Layer Architecture (6cd208a3), Four Constants (75b40e85) | E-02 (90/15 and 10/85) |
| 4 | **For CEOs/CFOs** | 40K | Slide 12 (total alignment / IT moat) | Monte Carlo, two aggregators, two bills | E-03 (bill audit), E-05 (duck) |
| 5 | **For HR** | 10K | Slide 9 (Rule of Twos — 90% autopilot) | Service model, ticketing, "HR goes from router to auditor" | E-04 (what your broker can't see) |
| 6 | **Why It's Permanent** | 5K | Slide 12 (ultimate IT moat — structural dependency) | Data warehouse per client, vendor connections, moat | — |
| 7 | **For Vendors** | 40K-20K | Slide 8 (hub-spoke) | Vendor integration pitch content | V-01 (vendor pitch) |
| 8 | **About Dave** | 50K | Slide 5 (genesis — IT + insurance = 25 years each) | MDM framing (af2726d9), Bloomberg analogy | — |
| 9 | **Book / Contact** | 5K | Slide 14 (4-step evaluation) | Booking link, four meetings preview | C-00 embedded |

---

## Homepage — Above the Fold

**Hero line (from Structured Constant slide 11):**
> "We don't sell an insurance product. We install a mechanical, closed-loop operational machine. Perfect inputs guarantee predictable outputs."

**Supporting stat:** 84% of CIOs identify unifying data as their top priority.

**Core positioning (from LBB 06a8a2db):**
> While you are trying to fix your core business software, you are letting your healthcare vendors run wild in completely disconnected silos. We fix that.

**Tagline:** Your data. Our infrastructure. One permanent operational layer.

**CTA:** "15 minutes. Four videos. The math does the talking." → booking link

---

## Page Content Sources — What Fills Each Page

### Page 1: Home
- Core positioning statement (LBB 06a8a2db — LOCKED)
- Hero line from Structured Constant slide 11
- 84% stat above fold
- Hub-and-spoke visual (intro version)
- Video embed: C-00 (50K intro — "The 10% Problem")
- CTA: Book a meeting

### Page 2: What Is Insurance Informatics
- CTB §50K — the discipline definition
- "Category of one" — not a brand, a named discipline parallel to medical/clinical informatics
- Genesis: 25 years IT + 25 years insurance = insurance informatics
- Paradigm shift table from Structured Constant slide 6:
  - Traditional Brokerage vs Insurance Informatics
  - Core Focus: Chasing Price vs Engineering Process
  - Input: Messy Spreadsheets vs Structured Data via API & EDI
  - Tech Engine: Legacy Batch vs 38-Node Cloudflare Edge
  - Benefit Design: Endless HR Debates vs Rule of Twos
  - Revenue: Hidden Commissions vs Flat PEPM
- Video embed: E-01

### Page 3: How It Works
- CTB §40K — fixed vs variable, two sides
- CTB §30K — TPA vs PBM, money flows
- Two-Layer Architecture diagram (LBB 6cd208a3)
- Rule of Twos visual (90% copay autopilot / 10% active management)
- Real-Time Interception — Path A vs Path B (Structured Constant slide 10)
- The Informatics Ecosystem flow (slide 11)
- Video embed: E-02

### Page 4: For CEOs/CFOs
- CTB §40K — two bills, one dashboard
- The Duck — smooth on top (what CFO sees), paddling underneath (what's running)
- Monte Carlo: two paths diverge over 5 years
- Zero commission — flat PEPM, same side of the table
- $27M data failure frame (Structured Constant slide 4)
- Hospital bill audit — 30% cut before waterfall
- Video embed: E-03, E-05

### Page 5: For HR
- CTB §10K — service model
- The 90%: copay card, done. "Here's your card, go live your life."
- Ticketing system — questions route directly to vendor, not through Dave
- The 10%: HR-branded comms (employee thinks it's from HR, it's from Dave)
- Five dashboards — HR dashboard specifically
- Employee page — self-serve benefits + ticketing
- "HR goes from router to auditor" — no more chasing vendors
- Video embed: E-04

### Page 6: Why It's Permanent
- CTB §5K — data warehouse per client, structural dependency
- Structured Constant slide 12 — the IT moat sandwich
- "We don't retain clients with contracts. We retain them through structural dependency."
- "To fire SVG, a client would have to rebuild every vendor API connection, compliance tracker, and data feed from scratch."
- Every month of data makes the moat deeper

### Page 7: For Vendors
- CTB §20K-10K — vendor integration, hub-spoke
- Many-to-one: integrate once, get all clients
- Two contacts per vendor (account manager + customer service)
- The 10/85 process — where the vendor fits
- "We're not replacing your process. We're putting structure in front."
- Video embed: V-01

### Page 8: About Dave
- 25 years IT data architecture + 25 years insurance
- The genesis of insurance informatics
- "Bloomberg for healthcare" positioning
- MDM for healthcare framing (CIO bridge language)
- Not a broker — an operational layer
- Zero commission model — why that matters

### Page 9: Book / Contact
- Four-step closed-loop evaluation (Structured Constant slide 14)
- "Zero friction. Four short video briefings. Four 15-minute meetings."
- Booking link: https://calendar.app.google/VT41mpEgTWDexFET8
- Preview of what each meeting covers (from CTB gate mapping)
- Embed: C-00 video

---

## Build Sequence

| Phase | What | Tool |
|-------|------|------|
| 1 | Content locked per page (this doc) | Done |
| 2 | Design in Claude Design → export wireframes | claude.ai/design |
| 3 | Build as CF Pages (static site) or Webflow/Framer | TBD — Dave's call |
| 4 | Video embeds (InVideo renders) | InVideo AI |
| 5 | SEO structure from FCE website constants | FCE-007 |
| 6 | Connect to booking link + outreach pipeline | LCS Hub |

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-04-20 |
| Last Modified | 2026-04-20 |
| BAR | BAR-302 |
| Source | CTB + Structured Constant deck + LBB records + FCE-007 |
