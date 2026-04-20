# Insurance Informatics — CTB (Content Tree Backbone)
## The full architecture of how insurance informatics works. Every piece of content slots into an altitude.
### Status: BUILD
### Authority: Dave Barton
### Last Modified: 2026-04-20

---

## The Duck — Operating Philosophy

**"Smooth on top, paddling like hell underneath."**

**Above the water (what the client sees):**
- Two bills
- One dashboard
- One phone number
- Employees are happy

**Below the water (what's actually happening):**
- 10+ vendors managed
- Two claim pipes running
- Two waterfalls routing
- Enrollment feeds flowing
- HR-branded comms going out
- Orchestrator triaging
- Service reps on accounts
- Drug flags monitoring
- Pre-certs intercepting
- Bills audited against Medicare
- Invoices collected and dashboarded
- Data warehouse updating in real time

**Dave's job: keep the duck calm on top. The process does the paddling.**

---

## 50K — THE DISCIPLINE

**Insurance Informatics = Insurance + IT.** A named discipline — sits parallel to medical informatics and clinical informatics. Not a brand.

Dave sits BESIDE the client (CFO). Not below. Not through a broker. Direct.

**Positioning:** The TPA thinks they're the hub. They're not. They see one pipe (claims). Dave sees both pipes (fixed + variable), controls enrollment (the front door), has the HR communication channel, and aggregates everything into one view. Proximity to client = the moat.

**The Pattern is Twos.** Everything splits into two at every altitude.

---

## 40K — THE TWO SIDES

```
INSURANCE INFORMATICS
│
│  ENROLLMENT (the front door — Dave controls)
│  ├── Collects standard info → pushes to ALL vendors (hub & spoke)
│  ├── Embeds EXTRA questions that high-dollar vendors will need later
│  └── Golden Record — one flawless record per employee in Dave's DB
│
├── FIXED (Dave aggregates → ONE invoice to client)
│
└── VARIABLE (TPA aggregates → ONE claims bill to client)
```

**CFO sees exactly two numbers. That's it.**

---

## 30K — FIXED SIDE (Dave Aggregates)

All PEPM (Per Employee Per Month) vendors consolidated into one bill.

```
FIXED SIDE — Dave Aggregates → ONE Invoice
│
├── Stop loss
├── TPA admin fee
├── Life insurance
├── Short-term disability (STD)
├── Long-term disability (LTD)
├── Dental
├── Vision
├── EAP (Employee Assistance Program)
├── FSA/HRA admin
├── COBRA admin
└── Other ancillary vendors as needed
```

**Could be 8-12 separate vendors.** Each with their own bill, own format, own portal. HR currently chasing all of them individually. Nobody thinks this is big — but add it all up and it's a clusterfuck.

**Dave normalizes all of it → one consolidated invoice.**

The TPA doesn't touch this side. They don't even know these vendors exist.

---

## 30K — VARIABLE SIDE (TPA Aggregates)

All claims consolidated into one bill. Two pipes:

```
VARIABLE SIDE — TPA Aggregates → ONE Claims Bill
│
├── TPA (hospitals + doctors)
│   ├── 90/15 — Autopilot
│   └── 10/85 — High-Dollar Claimants
│
└── PBM (pharmacy)
    ├── 90/15 — Autopilot
    └── 10/85 — High-Dollar Claimants
```

**Money flow difference (180 degrees):**
- **TPA:** Event happens → bill comes in AFTER → reprice → employer pays. Reactive.
- **PBM:** Employee swipes card → PBM pays pharmacy FIRST → PBM bills TPA → employer reimburses. PBM fronts the money.

---

## 20K — 90/15 AUTOPILOT

90% of employees cause 15% of claims cost. Day-to-day stuff. No intervention needed.

```
90/15 — AUTOPILOT
│
├── TPA side
│   └── Employee goes to doctor/hospital → claim filed → TPA reprices → employer pays
│
└── PBM side
    └── Employee swipes card at pharmacy → PBM pays upfront → bills TPA → employer reimburses
```

**Copay plan. Pick a network. Done.** This runs itself.

---

## 20K — 10/85 HIGH-DOLLAR CLAIMANTS (Dave's World)

10% of employees cause 85% of claims cost. Cancer, surgeries, high-dollar specialty drugs. This is where every dollar is won or lost.

### Triggers (how claims get caught)

```
TRIGGERS
│
├── DRUG: PBM file feed → specialty drug flag vendor monitors → flags high-dollar script
│   Reactive on fill #1, then proactive on fills #2+ (captures 11/12 annual cost on recurring)
│
└── HOSPITAL: Pre-cert → UM vendor flags → caught BEFORE procedure
    Proactive — intercept before the bill exists
```

### The Team

```
10/85 TEAM
│
├── Service Rep (ONE per account)
│   └── Employee relationship — calls them, makes sure they're happy
│
├── Orchestrator (ONE across ALL accounts)
│   └── Talks to employee first → collects intake info → routes to right pipe
│
├── Dave (controls both, writes HR-branded comms)
│
└── Trello = HR communication layer
    └── Dave writes comms branded AS the company's HR department
        Employee thinks it's from their HR. It's from Dave.
```

**Service Rep + Orchestrator work together.** Rep can call orchestrator and vice versa. Many-to-one relationships: many employees → one rep per company. Many companies → one orchestrator.

### The Flow

```
High-dollar claim triggers (pre-cert or PBM file flag)
    ↓
HR-branded comm via Trello → preps employee
    ↓
Orchestrator calls employee → collects intake info
    (data already partially in DB from enrollment — Dave embedded the questions)
    ↓
Routes to DRUG waterfall or HOSPITAL waterfall
    ↓
Vendor executes → sends invoice back to Dave
    ↓
Dave dashboards it (client sees savings in real time)
    ↓
Dave sends to TPA to pay
    ↓
Service Rep follows up with employee (satisfaction)
```

---

## 10K — HOSPITAL CLAIM FLOW (Audit + Waterfall)

Two steps. Audit the bill FIRST, then run the waterfall on what's left.

```
HOSPITAL CLAIM FLOW
│
├── STEP 1: BILL AUDIT (before anything else)
│   ├── Hospital bill comes in
│   ├── Audit every line item against Medicare rates
│   ├── Find overbilling:
│   │   ├── Wrong billing codes
│   │   ├── Duplicate charges
│   │   ├── Inflated line items
│   │   └── Billing for services not rendered
│   ├── Map actual charges against what Medicare would pay
│   └── Cut ~30% off the bill from audit alone
│
└── STEP 2: WATERFALL (on the remaining balance)
    ├── 1. PPO Network — negotiated rate (least savings)
    ├── 2. RBP — Reference-Based Pricing, % of Medicare (more savings)
    └── 3. 501R — Nonprofit financial assistance (100% off — $0)
```

**Two bites at the apple.** Shrink the bill first (audit), then shrink what's left (waterfall).

Example: $100K bill → audit catches 30% overbilling → $70K → 501R → $0.

**501R is the home run.** But even without 501R, audit + RBP can take a $100K bill to $15-20K.

---

## 10K — DRUG WATERFALL

Ordered by cost reduction.

```
DRUG WATERFALL (in order)
│
├── 1. MAP/PAP — Manufacturer/Patient Assistance Program (interchangeable terms)
├── 2. International pharmacy
└── 3. 340B — Federal discount program
```

---

## 10K — ENROLLMENT (The Front Door)

Enrollment isn't paperwork — it's the first step of claims management.

```
ENROLLMENT
│
├── Standard enrollment info
│   └── Pushed to ALL vendors via hub & spoke
│       TPA, PBM, stop loss, life, STD, LTD, dental, vision, etc.
│
├── Extra questions embedded
│   └── Info that high-dollar vendors will need LATER
│       ├── Hospital claim vendors might need
│       └── Drug claim vendors might need
│       Already captured. Orchestrator doesn't have to chase it.
│
└── Golden Record
    └── One flawless record per employee
        Sits in Dave's database
        Pre-loads the 10/85 side before a claim ever happens
```

---

## 10K — THE DATA AGGREGATION LAYER

Dave is the data hub. ALL data flows through regardless of pipe or split.

```
DATA AGGREGATION
│
├── TPA feeds claim data → Dave
├── PBM feeds drug data → Dave
├── High-dollar hospital vendors feed results → Dave
├── High-dollar drug vendors feed results → Dave
├── All fixed-side vendors feed billing → Dave
├── Enrollment data sits in Dave's DB
│
└── OUTPUT: Client dashboards
    └── One view. Everything. CFO doesn't log into 10 portals.
```

---

## 10K — SERVICE SIDE

### The Blind Spot

**No broker, no account manager at the broker level can see inside any vendor system.** You can't log into the TPA's system. You can't see inside the PBM. You can't see the stop loss carrier's dashboard. Nobody can. You have to rely on the vendor to answer the question.

**That's where the dashboards come into play.** Dave builds the data warehouse from vendor feeds, so he HAS visibility — not by logging into their systems, but by aggregating their data into his own. Nobody else has this. Every other broker is calling the vendor and asking "what's the status?" Dave already knows.

### Service — 90% (Self-Serve)

The 90% — we don't really give a shit. As long as they get their cards and everything's happy, we're happy.

```
SERVICE — 90% (self-serve, bottleneck eliminated)
│
├── Employee has a question → puts in a ticket
│   └── Ticket routes DIRECTLY to the vendor handling that benefit
│   └── Dental question → dental vendor
│   └── Life insurance question → life vendor
│   └── NOT to Dave's team
│
└── Dave's team is NOT a router for routine stuff
    └── Traditional brokers are the bottleneck — every question goes through them
    └── We eliminate ourselves from the routine loop entirely
```

### Service — 10% (Orchestrated)

When a high-dollar flag fires, the service side has two phases, two roles:

```
SERVICE — 10/85 FLOW
│
├── PHASE 1: Orchestrator (intake → routing → babysitter)
│   │
│   ├── INTAKE
│   │   ├── Flag comes in (PBM file feed or pre-cert)
│   │   ├── HR-branded comm goes out via Trello (preps employee)
│   │   ├── Orchestrator contacts employee → collects info
│   │   └── Data already partially in DB from enrollment
│   │
│   ├── ROUTING
│   │   └── Packages intake → sends to right vendor (drug or hospital waterfall)
│   │
│   └── BABYSITTER MODE (orchestrator flips roles)
│       ├── Watches the vendor — are they doing their job?
│       ├── Is employee info getting to vendor on time?
│       ├── Is the process moving or stalled?
│       └── Stays on it until vendor completes the process
│
└── PHASE 2: Service Rep (close the loop)
    ├── Once the process is DONE
    ├── Service rep reaches out to employee
    ├── "How was your experience?"
    ├── Employee might be mad about the OUTCOME (can't control claims)
    └── But did the PROCESS work? That's what we measure.
        └── Process worked = sigma tightens
        └── Process broke = fix it, find where
```

### The Circle

Output feeds back as input. Employee feedback tells you if the process worked. If it broke, you know which step failed. If it worked, the system gets tighter. This is the closed loop that no other broker has — because no other broker has the data to measure it.

---

## 5K — DASHBOARDS & EMPLOYEE PAGE (Per Client)

Six views total. Five dashboards for the client team, one page for employees.

```
CLIENT-FACING VIEWS (per client — built from data warehouse)
│
├── EMPLOYEE PAGE (separate from dashboards)
│   ├── Benefits summary — what they have, how to use it
│   ├── Ticketing system — submit questions, routes to vendor directly
│   └── Self-serve. 90% never needs to call anyone.
│
└── FIVE DASHBOARDS
    │
    ├── 1. HR Dashboard
    │   └── Enrollment, employee status, census, compliance
    │
    ├── 2. CFO/CEO Dashboard (financial)
    │   └── Two bills, total spend, savings, fixed vs variable
    │
    ├── 3. Underwriting Dashboard
    │   └── Claims data, loss ratios, risk analysis for stop loss
    │
    ├── 4. Renewal Dashboard
    │   └── "Here's what we spent. Here's what we saved. Here's your money back."
    │
    └── 5. Service Advisor Dashboard
        └── Orchestrator/service rep view — open cases, babysitter status, employee satisfaction
```

**Every dashboard pulls from the same data warehouse.** Same data, different views for different audiences. CFO sees dollars, HR sees people, underwriting sees risk, service sees process.

---

## 5K — VENDOR CONTACTS (Per Vendor — Twos Pattern)

Every vendor, two contacts. No exceptions.

```
VENDOR CONTACTS (per vendor)
│
├── Account Manager — strategic
│   ├── Assigned to Dave's book
│   ├── Escalations, contract issues, relationship
│   └── Orchestrator rides this person in babysitter mode (10/85)
│
└── Customer Service — tactical
    ├── Handles routine tickets (90/15)
    ├── Claim status, employee questions
    └── Where the ticketing system routes to
```

---

## 5K — VENDOR ECOSYSTEM (Layer 1 Autopilot)

Five commodity vendors that run the 90/15:

```
LAYER 1 VENDORS
│
├── 1. PPO Network — First Health OR HealthSmart only
│      (PHCS and MultiPlan retired — they force their own RBP, won't allow split routing)
├── 2. TPA — universal biller for variable cost, pure payment execution, zero decision-making
├── 3. PBM — routine pharmacy
├── 4. UM Pre-Cert Vendor — separate company from TPA, fires hospital trigger
└── 5. Specialty Drug Flag Vendor (Payer Matrix class) — monitors PBM file feed, fires drug trigger
```

---

## 5K — PLAN DESIGN (Rule of Twos)

```
PLAN DESIGN
│
├── 90% Routine — Copay plan ($15/$25), zero deductible
└── 10% Catastrophic — 80/20 capped at ACA out-of-pocket max
```

**80/20 is not cost-shifting. It's incentive alignment.** Employee's 20% is calculated on the NEGOTIATED number, not sticker. Skin in the game. Everybody on the same side trying to get the bill down.

---

## 5K — THE TWO AGGREGATORS (Bill Summary)

```
TWO AGGREGATORS
│
├── Dave → aggregates FIXED costs → ONE consolidated bill
│   All PEPM vendors normalized into one invoice
│
└── TPA → aggregates VARIABLE costs → ONE consolidated claims bill
    All claims (routine + high-dollar results after Dave routes) in one feed
```

**CFO sees two numbers. Zero hidden invoices. Zero vendor chasing.**

---

## THE FOUR GATES — Sales Video Mapping to CTB

Each gate is a zoom. Start at 50K, end at 5K with their actual numbers. Education builds on itself — can't understand Gate 2 without Gate 1.

```
FOUR GATES (4 videos → 4 meetings of 15-20 min each)
│
├── GATE 1: Fact Finder (We Know You) — 50K/40K altitude
│   ├── "Here's what we know about your company"
│   ├── Grid data: company, employees, carrier, broker, renewal
│   ├── Contacts, web presence — all stated as facts, not questions
│   ├── "To run your numbers, I need one thing: your current bill."
│   └── "You bring the bill, I'll bring the math."
│
├── GATE 2: Education + Monte Carlo (Your Numbers) — 30K/20K altitude
│   ├── Self-insured vs fully-insured explained
│   ├── TPA/PBM — how claims actually work (money flows)
│   ├── 90/15 and 10/85 — where the money goes
│   ├── Hospital waterfall (PPO → RBP → 501R)
│   ├── Drug waterfall (MAP/PAP → international → 340B)
│   ├── Monte Carlo simulation — two paths diverge
│   ├── "I'm not predicting claims. I'm showing you the mechanics."
│   └── "You're compounding off a higher base. We compound off a lower base."
│
├── GATE 3: Service (What Life Looks Like) — 10K/5K altitude
│   ├── Five dashboards — HR, CFO, underwriting, renewal, service advisor
│   ├── Employee page + ticketing system (self-serve)
│   ├── Orchestrator + service rep — how the 10% gets handled
│   ├── Implementation — Year 1 census enrollment, Year 2 full enrollment
│   ├── "Switching sounds like a nightmare. It's not."
│   └── "No lock-in at any point."
│
└── GATE 4: The Numbers (What We Found) — 5K altitude
    ├── THEIR specific quote, THEIR specific savings
    ├── General framing only in the video — no numbers until live meeting
    ├── "I encourage you to compete it. Take it to every broker."
    ├── "Their number has commission baked in. Ours doesn't."
    ├── "Bring your decision-maker."
    └── Shortest video. Confident. The dare.
```

### Gate Videos vs Explainer Videos

| | Gate Videos (sales) | Explainer Videos (education) |
|---|---|---|
| **Audience** | Specific prospect | General public (LinkedIn, website) |
| **Data** | Their company, their numbers | Generic examples |
| **Purpose** | Move them through the sales process | Build awareness, attract inbound |
| **Personalization** | Remotion stamps prospect data | One version for everyone |
| **Where** | Sent directly to prospect | LinkedIn, website, YouTube |

**Same content. Same CTB. Different fill.** Gate videos are personalized (variable). Explainer videos are general (constant). Same architecture, same altitudes, same education — just different audience.

---

## EDUCATION LAYER — How All This Shit Works

The client doesn't understand ANY of this. They don't know what self-insured means. They don't know what stop loss is. They don't know switching doesn't mean re-enrolling 200 people from scratch.

**Education is the product BEFORE the sales process starts.** You're not selling — you're educating. The explainer videos live here.

### Education Topics (CTB order — 50K down to 5K)

```
EDUCATION — WHAT THE CLIENT NEEDS TO LEARN
│
├── 50K — What is self-insured vs fully-insured?
│   └── "You can't stop claims. The question is who manages the cost."
│
├── 40K — How does the money actually work?
│   ├── Fixed side vs variable side
│   ├── What is a PEPM fee vs commission? (incentive alignment)
│   └── Why two bills is better than one opaque premium
│
├── 30K — What is stop loss?
│   ├── Types of stop loss (specific vs aggregate)
│   ├── How it protects you
│   └── Why it's not as scary as it sounds
│
├── 30K — What are TPA and PBM?
│   ├── TPA = processes medical claims (pays AFTER)
│   ├── PBM = processes drug claims (pays FIRST, reimburses)
│   └── Why they're separate and why that matters
│
├── 20K — What happens with high-dollar claims?
│   ├── The 10/85 reality — 10% cause 85% of cost
│   ├── Hospital waterfall (PPO → RBP → 501R)
│   ├── Drug waterfall (MAP/PAP → international → 340B)
│   └── How the orchestrator works
│
├── 10K — How does switching actually work?
│   ├── Year 1: Census enrollment — take what's already there
│   │   └── Everybody gets new cards. No re-enrollment. No disruption.
│   ├── Year 2: Full enrollment — open everything up
│   │   └── Now you optimize plan design, add the extras
│   └── "Switching sounds like a nightmare. It's not."
│
├── 5K — Plan design explained
│   ├── Copay plan ($15/$25) — the 90%
│   ├── 80/20 capped at ACA MOOP — the 10%
│   └── Why 80/20 is incentive alignment, not cost-shifting
│
└── 5K — What does the dashboard look like?
    ├── Real-time claims visibility
    ├── Savings tracking
    └── Renewal in three sentences: "Here's what we spent. Here's what we saved. Here's your money back."
```

### Implementation Timeline

```
IMPLEMENTATION (Year 1 → Year 2)
│
├── YEAR 1 — Soft transition
│   ├── Census enrollment: take existing employees, copy them over
│   ├── New cards issued — same benefits, just different plumbing
│   ├── No re-enrollment, no disruption, no employee confusion
│   └── Dave's system starts collecting data from day 1
│
└── YEAR 2 — Full optimization
    ├── Open enrollment — full plan design implementation
    ├── Rule of Twos plan design goes live
    ├── High-dollar process fully operational
    └── Data from Year 1 drives Year 2 decisions
```

---

## CONTENT MAP — What Goes Where

| Altitude | Architecture | Education | Sales (Gate) | Content Assets |
|----------|-------------|-----------|-------------|----------------|
| 50K | Insurance Informatics = the discipline | Self-insured vs fully-insured | — | Website homepage, LinkedIn posts |
| 40K | Fixed vs Variable, two sides | How money works, PEPM vs commission | Gate 1: We Know You | Explainer video #1, diagrams |
| 30K | TPA vs PBM pipes, money flows | What is stop loss? What are TPA/PBM? | — | Explainer video #2, diagrams |
| 20K | 10/85 process, triggers, team, flow | What happens with high-dollar claims? | Gate 2: Your Numbers | Monte Carlo, hospital waterfall diagram |
| 10K | Waterfalls, enrollment, data aggregation | How switching works (Year 1 → Year 2) | Gate 3: What to Expect | Implementation timeline, dashboard demo |
| 5K | Vendor ecosystem, plan design, bills | Plan design explained, dashboard walkthrough | Gate 4: What We Found | Specific numbers, the dare |

---

## VIDEO PRODUCTION TABLE

**Constants (structure — the slots exist, the sequence is locked):**
- The video slots (V-01, V-02, C-00, C-01 through C-04, T-01, T-02, E-01 through E-05)
- The gate sequence (1→2→3→4)
- The purpose/altitude of each video
- The personalization FIELDS (what data goes where)

**Variables (fill — can change, improve, evolve):**
- The scripts themselves (rewrite, refine, update as needed)
- The prospect data filling the personalization fields
- The rendering tool (InVideo, NotebookLM, Veo, Remotion)
- The delivery method (email, LinkedIn, website)

### Vendor-Facing Videos (2)

| # | Video | Altitude | Duration | Script Status | Source |
|---|-------|----------|----------|--------------|--------|
| V-01 | Vendor Integration Pitch — why integrate with us, many-to-one, one-time setup, volume | 40K | 2-3 min | NEEDS WRITE | CF Pages video library (Google draft exists) |
| V-02 | Vendor 10/85 Process — how the orchestrator + service rep work, where vendor fits, we don't replace their process | 20K | 3-4 min | NEEDS WRITE | CTB §10K Service Side |

### Client-Facing Videos (1 + 4 gates)

| # | Video | Altitude | Duration | Script Status | Source |
|---|-------|----------|----------|--------------|--------|
| C-00 | 50K Intro/Filter — what is insurance informatics, why me, the four videos coming, "you need me, I don't need you" | 50K | ~2 min | DONE | `hook-the-10-percent-problem.md` |
| C-01 | Gate 1 — Factfinder ("We Know You") | 50K/40K | 5-6 min | DONE | `gate-1-source.md` + `gate-1-we-know-you.md` |
| C-02 | Gate 2 — Education + Monte Carlo ("Your Numbers") | 30K/20K | 5-6 min | DONE | `gate-2-source.md` + `gate-2-your-numbers.md` |
| C-03 | Gate 3 — Service ("What to Expect") | 10K/5K | 5-6 min | DONE | `gate-3-source.md` |
| C-04 | Gate 4 — Quote + Dare ("What We Found") | 5K | 3-5 min | DONE | `gate-4-source.md` |

### Internal Training Videos (2)

| # | Video | Altitude | Duration | Script Status | Source |
|---|-------|----------|----------|--------------|--------|
| T-01 | Orchestrator Training — flags, intake, routing, babysitter mode, dashboards, what "done" looks like | 20K/10K | 5-8 min | NEEDS WRITE | CTB §10K Service Side |
| T-02 | Service Rep Training — assigned clients, tickets, orchestrator handoff, closing the loop, measuring process not outcome | 10K/5K | 5-8 min | NEEDS WRITE | CTB §10K Service Side |

### LinkedIn/Website Explainer Videos (general audience — not personalized)

| # | Video | Altitude | Duration | Script Status | Source |
|---|-------|----------|----------|--------------|--------|
| E-01 | Self-Insured vs Fully-Insured — "you can't stop claims" | 50K/40K | 1-2 min | NEEDS WRITE | CTB §40K + Voice Library |
| E-02 | The 90/15 and 10/85 — where the money goes | 30K | 1-2 min | NEEDS WRITE | CTB §20K + Four Constants |
| E-03 | Hospital Bill Audit — hospitals overbill, here's how we catch it | 20K | 1-2 min | NEEDS WRITE | CTB §10K Hospital Flow |
| E-04 | What Your Broker Can't See — the vendor silo problem | 30K | 1-2 min | NEEDS WRITE | CTB §10K The Blind Spot |
| E-05 | The Duck — smooth on top, paddling like hell underneath | 50K | 1-2 min | NEEDS WRITE | CTB §The Duck |

### Production Pipeline

```
VIDEO PRODUCTION PIPELINE
│
├── SCRIPT (constant — locked in gate-templates/)
│   └── Personalization fields filled per prospect from D1 grid
│
├── RENDER (variable — tool choice)
│   ├── InVideo AI — full script-to-video (primary)
│   ├── NotebookLM — podcast/whiteboard style
│   ├── Google Veo 3.1 — B-roll clips
│   └── Remotion — data overlay personalization ($0/render)
│
├── PERSONALIZE (Remotion — prospect data stamped on base MP4)
│   └── Company name, employee count, costs, Monte Carlo, savings
│
└── DELIVER (variable — channel)
    ├── Gate videos → sent directly to prospect (email)
    ├── Explainer videos → LinkedIn, website, YouTube
    ├── Vendor videos → vendor onboarding package
    └── Training videos → internal (orchestrator, service rep)
```

### Script Source Files

All scripts live in: `workers/video-pipeline/gate-templates/`

| File | Video | Status |
|------|-------|--------|
| `hook-the-10-percent-problem.md` | C-00 (50K intro) | DONE |
| `gate-1-source.md` | C-01 (factfinder) | DONE |
| `gate-1-we-know-you.md` | C-01 (alternate cut) | DONE |
| `gate-2-source.md` | C-02 (education) | DONE |
| `gate-2-your-numbers.md` | C-02 (alternate cut) | DONE |
| `gate-3-source.md` | C-03 (service) | DONE |
| `gate-4-source.md` | C-04 (quote/dare) | DONE |

---

## CROSS-REFERENCE — LBB, R2, Voice Library by Altitude

### 50K — Positioning

| Source | Record | ID |
|--------|--------|----|
| LBB | LOCKED: Core positioning statement (homepage) | 06a8a2db |
| LBB | "Different race" framing + Bloomberg analogy | 0d7e2104 |
| LBB | MDM for healthcare framing (CIO bridge) | af2726d9 |
| LBB | Tagline and closing line | fc184966 |
| LBB | Three-domain architecture decision | 51df8d16 |
| LBB | Industry prescription matches SVG build | d18e430b |
| Voice | §Voice Constants — tone, sentence structure, what he never/always says | law/VOICE-LIBRARY.md |

### 40K — Two Sides (Fixed/Variable)

| Source | Record | ID |
|--------|--------|----|
| LBB | Two-Layer Architecture v1 — Pattern is Twos | 6cd208a3 |
| LBB | SVG Operating Model — one person one machine | b13670e5 |
| LBB | Paradigm Shift table (slide 6 of Structured Constant) | d743f77e |
| Voice | §Gate 1 Video Script — "bring the bill, I'll bring the math" | law/VOICE-LIBRARY.md |
| Slides | Self-Insured Explained — Budget Diagram (Advisor p8) | LBB a996ffb3 |
| Slides | Fully Insured vs Self-Insured Comparison (Advisor p9) | LBB be089280 |
| Slides | Cost Flow Diagram (BA-Health p7) | LBB 9acbd5b3 |

### 30K — Claims Pipes (TPA/PBM) + Stop Loss

| Source | Record | ID |
|--------|--------|----|
| LBB | Four Constants (LOCKED) — TPA vs PBM money flows | 75b40e85 |
| LBB | Doctor and Prescription Claim Process (slide) | LBB c92de594, 56430508 |
| LBB | Hospital Claim Process (slide) | LBB 4a4fc956 |
| LBB | Stop-Loss Quoting — Wholesale vs Retail (Advisor p23) | LBB 44e0fc2b |
| LBB | Claims Funding Budget Account (Advisor p24, BA p10) | LBB c59e7d32, 7b42cdd3 |
| Voice | §Gate 2 Video Script — Monte Carlo, two paths | law/VOICE-LIBRARY.md |

### 20K — 10/85 High-Dollar Management

| Source | Record | ID |
|--------|--------|----|
| LBB | Drivers of Cost — 10% cause 85% (Advisor p25, BA p11) | LBB ce5cf8cd, 5b9ab4b6 |
| LBB | Medical Shopper Overview (Advisor p31, BA p13) | LBB 86736b1b, 23533971 |
| LBB | MAP/PAP Programs Solution (Advisor p29) | LBB d54eb5ed |
| LBB | MAP Report — Savings Summary (Advisor p30, BA p15) | LBB ed6eaf46, 678983a1 |
| LBB | Real-Time Interception — Path A vs Path B (Structured Constant slide 10) | d743f77e |
| R2 | Enterprise Data Crisis infographic | svg-files/insurance-informatics/infographics/enterprise-data-crisis-fix.png |
| Voice | §Gate 2 — "I'm not predicting claims" | law/VOICE-LIBRARY.md |

### 10K — Service Model + Enrollment + Switching

| Source | Record | ID |
|--------|--------|----|
| LBB | Implementation Year 1 + Year 2 (Advisor p19, BA p16-17) | LBB 7832fc54, 33fb23bd, 5c3a3d54 |
| LBB | Communication System — Email Types (Advisor p18) | LBB 79d36358 |
| LBB | Vendor-facing content track | LBB 45355a3f |
| Voice | §Gate 3 — "switching sounds like a nightmare, it's not" | law/VOICE-LIBRARY.md |

### 5K — Dashboards, Plan Design, Implementation

| Source | Record | ID |
|--------|--------|----|
| LBB | Client Dashboards (Advisor p15) | LBB 8b52431f |
| LBB | Sample Renewal 30,000ft Dashboard (Advisor p33) | LBB 2637903b |
| LBB | 20,000ft Self-Insured Detail View (Advisor p34) | LBB c4e379af |
| LBB | Benefits Reconciliation (Advisor p16-17) | LBB bc33c412, 5cf95176 |
| LBB | Admin Fees — PEPM Table (Advisor p22) | LBB 17aa5bf1 |
| LBB | Co-Pay Plan — Year 2 (BA p18) | LBB 8607d2b1 |
| LBB | Data Warehouse Architecture Diagram (Advisor p14) | LBB f2a73ae6 |
| Voice | §Gate 4 — "compete it, take it to every broker" | law/VOICE-LIBRARY.md |

### Sales Pipeline Assets

| Source | Record | ID |
|--------|--------|----|
| LBB | Video Pipeline — 4 gate audio scripts | a13156b3 |
| LBB | Video Pipeline BUILD — templates + CLI guide | 63f5a9d9 |
| LBB | Sales Pipeline Design — factfinder + Monte Carlo | b1c2d3e4 |
| LBB | Slide Library — 236 pages uploaded to R2 | 220d488f |
| LBB | Voice Library applied to gate templates | abf328b9 |
| LBB | Structured Constant deck — 14-slide narrative | d743f77e |
| LBB | Strategic Analysis — full prospect narrative | 91afb9fa |
| LBB | Website — 9-page structure from FCE constants | fd86d1b5 |
| LBB | CTB spine document (this doc ingested) | 1e80dba1 |

### R2 Assets

| Asset | R2 Path | Used At |
|-------|---------|---------|
| Structured Constant deck | svg-files/insurance-informatics/decks/the-structured-constant.pptx | All altitudes — the master deck |
| Enterprise Data Crisis infographic | svg-files/insurance-informatics/infographics/enterprise-data-crisis-fix.png | 20K-30K |
| 236 slide PNGs (5 decks) | svg-files/ (uploaded 2026-04-07) | All altitudes — individual slides |

### Voice Library Sections

| Section | Used At | Key Lines |
|---------|---------|-----------|
| §Voice Constants | 50K | Tone, sentence structure, what he never/always says |
| §Outreach Emails (Cold) | Outreach | 3-5 sentences, one fact, one insight, one ask |
| §Outreach Emails (Movement) | Outreach | 2-4 sentences, what changed, what it means |
| §Gate 1 Script | 40K (Gate 1) | "Bring the bill, I'll bring the math" |
| §Gate 2 Script | 20K (Gate 2) | "I'm not predicting claims. I'm showing you the mechanics." |
| §Gate 3 Script | 10K (Gate 3) | "Switching sounds like a nightmare. It's not." |
| §Gate 4 Script | 5K (Gate 4) | "Compete it. Take it to every broker." |
| §Qualifying Language | All | Tire kicker filter, the dare, zero desperation |

### Blueprint Repos

| Repo | What It Owns | CTB Coverage |
|------|-------------|-------------|
| company-lifecycle-cl | THIS CTB — company identity, CID pipeline | 50K spine |
| barton-outreach-core | Outreach intelligence, email/LinkedIn content | Outreach channels |
| ctb-sales-navigator | Sales meeting process, DISC, proposals | Gates 1-4 |
| client | Client intake, vendor export, portal, dashboards | 10K-5K service + dashboards |
| Barton-Processes | Process execution (PROC 100-900) | All altitudes (muscle) |

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-04-20 |
| Last Modified | 2026-04-20 |
| Version | 1.0.0 |
| Authority | Dave Barton |
| Source | Conversation capture — Dave walked through the full architecture |
