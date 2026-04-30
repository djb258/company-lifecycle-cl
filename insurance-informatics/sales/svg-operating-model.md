# SVG Agency — Operating Model
## One person, one machine. The person who sold you the plan is the same person running your claims. There is no handoff.
### Status: OPERATE
### Medium: process
### Business: svg-agency

---

# IDENTITY (Thing — what this IS)

_Everything in this cluster answers: what exists? These are constants that don't change regardless of who reads this or when._

## 1. IDENTITY

| Field | Value |
|-------|-------|
| ID | PROC-SVG-OPS |
| Name | SVG Agency Operating Model |
| Medium | process |
| Business Silo | svg-agency |
| CTB Position | trunk / fleet / content — governs outreach, sales, and client sub-hubs |
| ORBT | OPERATE |
| Strikes | 0 |
| Authority | sovereign — Dave Barton |
| Last Modified | 2026-04-10 |
| BAR Reference | none |

### HEIR (8 fields — Aviation Model, Bedrock §8)

| Field | Value |
|-------|-------|
| sovereign_ref | svg-agency |
| hub_id | svg-ops-model |
| ctb_placement | trunk |
| imo_topology | middle |
| cc_layer | CC-01 sovereign |
| services | Outreach engine, Claims orchestrator, Ticketing system, Chrome MCP dashboard |
| secrets_provider | doppler |
| acceptance_criteria | Full life cycle documented: enrollment → outreach → sales → client → claims → loop closure |

---

## 2. PURPOSE

_What breaks without it. What business outcome it serves._

Without this document, the SVG operating model exists only in Dave Barton's head — brokers, TPAs, and prospects can't see the machine. This captures the full life cycle from prospect to claims resolution so it can be presented, replicated, and scaled across all three sub-hubs (outreach, sales, client).

---

## 3. RESOURCES

_Everything this depends on. A mechanic reads this and knows exactly what to set up before it can run._

### Dependencies

| Dependency | Type | What It Provides | Status |
|-----------|------|-----------------|--------|
| svg-d1-outreach-ops | database | Company targets, enrichment, page-parsed keys, DOL filings | DONE |
| svg-d1-spine | database | Core identity spine across all domains | DONE |
| svg-d1-sales | database | Sales pipeline, DISC profiles, appointments | DONE |
| svg-d1-client | database | Client service data, ongoing management | DONE |
| Mission Control | dashboard | Chrome MCP live view for brokers, HR, servicing agents | DONE |
| Ticketing system | process | Claim flags → vendor routing → resolution tracking | DONE |

### Downstream Consumers

| Consumer | What It Needs |
|----------|--------------|
| Brokers / TPAs | The sales pitch — overview of how SVG operates |
| NotebookLM notebooks | Source material for audio/video overviews |
| Servicing agents | Understanding of their role in the process |
| HR contacts | Visibility into how their employees are handled |

### Tools & Integrations

| Item | Type | Cost Tier | Credentials | What It Does |
|------|------|-----------|-------------|-------------|
| Chrome MCP | dashboard | Free | none | Live view into operations — broker sees without installing anything |
| NotebookLM | content | Free | Google login | Generates audio/video overviews from this doc |
| Cloudflare Workers | compute | Cheap | Doppler | Runs the orchestration engine |
| Neon PostgreSQL | vault | Cheap | Doppler/Hyperdrive | Stores operational data |

### Secrets

| Secret | Doppler Project | Config | Used By |
|--------|----------------|--------|---------|
| Infrastructure secrets | imo-creator | dev | Workers, database connections |

---

# CONTRACT (Flow — what flows through this)

_Everything in this cluster answers: what moves? How does data/work enter, get processed, and exit?_

## 4. IMO — Input, Middle, Output

### Two-Question Intake (Bedrock §3)
1. **"What triggers this?"** — A prospect is identified, a client is onboarded, or a claim is flagged
2. **"How do we get it?"** — Outreach engine (prospects), enrollment (clients), file feeds from TPA/PBM (claims)

---

### The Industry Flip

**Traditional Model:**
```
Broker → sells the plan → hands off to operations (back office)
→ Client calls 1-800 number → gets runaround
→ Broker shows up again at renewal
```

**SVG Model:**
```
Client ← DAVE (broker + operations, same seat, same person)
              │
         Servicing Agent (services the ops for the client)
              │
         Orchestrator (routes tickets, watches vendors)
              │
         Vendors (pluggable, replaceable, accountable)

"The person who sold you the plan is the same person running your claims.
 There is no handoff."
```

The traditional model separates the sale from the service. SVG eliminates the gap. The broker IS operations. AI and automation is what makes one person capable of holding both seats.

---

### Input

| Source | What Comes In | How |
|--------|--------------|-----|
| Outreach engine | Prospect data — companies, contacts, enrichment, DOL filings | Automated discovery + enrichment |
| Enrollment | New client setup — plan details, employee census | Dave runs enrollment directly |
| TPA / PBM file feeds | Adjudicated claims data | Automatic file feeds after TPA/PBM processes claims |
| Employee calls | Service requests, questions, problems | Inbound to servicing agent |

### Middle — Dave Barton (the Hub)

Everything connects through one person. Many-to-one relationship. Every TPA, PBM, vendor, and program is a spoke. Dave is the hub.

```
                         ┌─────────┐
                         │  DAVE   │
                         │ (hub)   │
                         └────┬────┘
                              │
          ┌───────┬───────────┼───────────┬───────┐
          │       │           │           │       │
       Outreach  Sales     Claims      Client   IT/Ops
       (Dave)   (Dave)       │        (Dave)   (Dave)
                             │
                     ┌───────┴───────┐
                     │               │
               Orchestrator    Servicing Agent
               (under Dave)    (under Dave)
                     │
                  Vendors
               (pluggable spokes)
```

**Three sub-hubs, one trunk:**

| Sub-Hub | What It Does | Key Stats |
|---------|-------------|-----------|
| **Outreach** | Find prospects, enrich data, score, assign agents | 32K+ companies tracked, 28 sub-hubs of data, automated enrichment |
| **Sales** | Convert prospects — appointments, DISC profiling, proposals | Process-driven, not spray-and-pray |
| **Client** | Service clients — ongoing management, retention, claims | One relationship owner, no handoffs |

---

### The Two-Layer Architecture (Layer 1 and Layer 2, explicitly named)

**Every self-insured health plan has two layers. The broker industry hides this by mashing them together. Insurance informatics separates them cleanly and tells the executive exactly what's in each one.** This is the 50k mental model and the canonical architecture for every client-facing and vendor-facing asset in the library.

#### Layer 1 — Autopilot (90% of employees, 15% of total cost)

Routine utilization — doctor visits, maintenance prescriptions, minor interventions. High volume, low cost per event, predictable. **Pick competent vendors, let them run.** Five plug-in pieces:

| Vendor | Role | Signal produced |
|---|---|---|
| **PPO network** — First Health or HealthSmart only | Provider directory + routine rate schedule | A rate card the TPA uses |
| **TPA** | Universal biller for variable costs (claims bank) | Consolidated claims feed |
| **PBM** | Routine pharmacy processor | Pharmacy claims → flow to TPA |
| **UM pre-cert vendor** (separate company from the TPA) | Watches for scheduled procedures | Pre-cert fire (hospital trigger) |
| **Specialty drug flag vendor** (Payer Matrix class) | Watches PBM file feed for high-cost drug flags | Auto-flag notification (drug trigger) |

**Important market note: PHCS and MultiPlan are OFF the approved network list.** They no longer rent clean PPO networks — they force clients into their own reference-based pricing product, which collapses Layer 1 and Layer 2 into their stack and destroys the three-path routing (501r → RBP → PPO fallback). First Health and HealthSmart are the only approved Layer 1 network rentals as of 2026-04.

None of these Layer 1 vendors negotiate, shop, or source. They're plumbing. Dave picks them competently during onboarding; after that they run themselves.

#### Layer 2 — Insurance Informatics (10% of employees, 85% of total cost)

**Two processes, one orchestrator.** This is where the discipline earns its keep.

| Process | Wake-up trigger | Playbook | Timing |
|---|---|---|---|
| **High-dollar hospital claims** | Pre-cert fire (Layer 1 UM vendor) | 501r → RBP → PPO fallback | Proactive — before the claim exists |
| **High-dollar drug claims** | Specialty drug flag (Layer 1 drug vendor) | MAP → 340B → international sourcing | Reactive on fill #1, proactive on fills #2+ (captures 11/12 of annual cost on recurring specialty scripts) |

Both triggers feed the **same orchestrator**, which runs the **same sequence** for both: HR-branded warm-up → orchestrator intake → route to playbook → servicing agent executes → final number to TPA for payment.

> **Pitch altitude discipline:** The timing asymmetry (hospital = proactive, drug = reactive on fill #1) is NOT initial-pitch content. Gates 1-4 and the hook stay at "two processes, same orchestrator." The mechanical details live in the explainer videos that come after engagement. See `law/VOICE-LIBRARY.md` §"The Pattern is Twos".

---

### The Two Aggregators (the financial architecture the CFO sees)

Every employer cost on the benefits line belongs to one of two buckets. Each bucket has exactly one aggregator. **The CFO sees exactly two numbers. That's the entire financial picture.**

| Bucket | Aggregator | What rolls up | Output to CFO |
|---|---|---|---|
| **Fixed costs** (predictable PEPM) | **Dave** | Stop-loss premium, ops fee, service fee, ancillary (life/disability/dental/vision), every other per-employee-per-month line item | ONE consolidated fixed bill |
| **Variable costs** (actual claims) | **TPA** | Routine hospital/doctor claims, routine pharmacy, Layer 2 hospital (post-negotiation), Layer 2 drug (post-sourcing) | ONE consolidated claims feed |

**The TPA is a universal biller for variable cost. Dave is a universal biller for everything else.** Two aggregators, two numbers, zero hidden invoices, zero vendor chasing. If a cost doesn't show up on one of the two bills, it doesn't exist.

**Vendor-facing implication:** Every Layer 1 and Layer 2 vendor invoices Dave, not the client. This is a back-office change for the vendor (one vendor ID, one billing address, one ACH instruction) and a feature for Dave's aggregation story. Dave pays on a predictable monthly schedule, which means no AP-department runaround and no collection risk — vendors generally prefer this once they understand it.

---

### Canonical Mailboxes (the single source of truth for all svg-agency correspondence)

Every outbound email from the svg-agency business goes through exactly one of two mailboxes. These are the authoritative addresses. Every worker, campaign, video script, and doctrine reference pulls from this table. No worker sends from any other address. No vendor or client is ever asked to reply to any other address.

| Mailbox | Purpose | Used In | Referenced By |
|---|---|---|---|
| `marketing@svg.agency` | All outreach — prospect campaigns, cold outreach, warm-up sequences, nurture flows, HR-branded Layer 2 employee warm-up emails, every marketing touch | Outreach workers, HeyReach campaigns, mission-control dispatches that produce outbound mail, the sub-hub marketing machine (all 28 sub-hubs) | `svg-outreach` workers, outreach process docs |
| `invoice@svg.agency` | All inbound vendor invoicing — Layer 1 and Layer 2 vendor bills, stop-loss invoicing, ancillary carrier invoices, anything that lands on Dave's aggregator | The Two Aggregators architecture (see above). Every Layer 1 + Layer 2 vendor is instructed to bill this address once per cycle | `fleet/content/vendor-video-the-10-operational-briefing.md`, `fleet/content/vendor-video-scale-marketing.md`, any vendor-facing contract or onboarding doc |

**Storage:**
- Doppler `imo-creator → dev` holds `MARKETING_EMAIL`, `MARKETING_EMAIL_PASSWORD`, `INVOICE_EMAIL`, `INVOICE_EMAIL_PASSWORD` as the runtime secrets for any worker that needs SMTP/IMAP access
- Composio holds OAuth-authenticated connections (`gmail-marketing-svg`, `gmail-invoice-svg`) for tool-layer access from Claude Code, Mission Control, and any agent that sends/reads via the Gmail API instead of SMTP
- Claude Code user config (`~/.claude.json`) holds the per-mailbox MCP server entries so agents in this garage can send and read directly

**Rule:** No new mailbox gets added to the svg-agency business without updating this section first. Any worker that hardcodes a different sending address is a doctrine violation and gets reclassified as an error on the ORBT scale until corrected.

---

### Claims Processing — The 90/15 and 10/85

Not all claims are equal. 90% are routine. 10% drive 85% of cost.

**The 90/15 (Layer 1):** Routine claims run through the TPA and PBM. Not Dave's domain. They handle it.

**The 10/85 (Layer 2):** High-dollar claims. This is where insurance informatics operates. Two flag sources, one machine.

---

### Two Flag Sources (Inputs to the 10-85 Machine)

```
HIGH-DOLLAR DRUGS                    HIGH-DOLLAR HOSPITAL
      │                                    │
  PBM File Feed                       Pre-Cert Program
  (after adjudication)               (before procedure)
      │                                    │
      └──────────────┬─────────────────────┘
                     │
                  FLAG HITS
                (SVG is alerted)
```

**High-dollar drugs:** Flag comes from the PBM file feed after the medication is filled/adjudicated. We see it in the data automatically.

**High-dollar hospital:** Flag comes from the pre-certification program before the procedure happens. We know before the money is spent.

Two different timing windows. Same trigger point. The moment the flag hits, the machine is in motion.

---

### The 10-85 Process (Full Sequence)

**Step 1 — HR Warm-Up Email:**
An email goes to the employee that looks like it's coming from the HR department. Not from a vendor. Not from a stranger. From HR — a channel the employee already trusts. The email says: "We have a program that can help with this. Someone is going to reach out."

This changes everything. In the traditional model, the employee gets a cold call from a company they've never heard of asking for income information. They hang up. They think it's a scam. The program never gets off the ground.

**Step 2 — Orchestrator (Phase 1: Front End):**
The orchestrator reaches out to the employee. The employee is already expecting the call because of the HR email. The orchestrator gathers what's needed — income verification, procedure details, whatever the program requires — and routes the claim to the right vendor program.

The orchestrator knows every program available:

| High-Dollar Drug Programs | High-Dollar Hospital Programs |
|--------------------------|------------------------------|
| MAP — Manufacturer Assistance Programs | PPO Network repricing |
| International sourcing — same medications, fraction of price | Reference-Based Pricing — pay based on Medicare rates |
| 340B — federal program for reduced drug pricing | 501(r) — IRS requirement for nonprofit hospital financial assistance |

**Step 3 — Vendor Handoff:**
The case goes to the vendor. The vendor is NOW authorized to contact the employee directly. The employee has been warmed up — HR email, orchestrator call — so when the vendor reaches out, it's expected. Not a cold call into the void.

The vendor executes their program. Their system. Their job. We can't see inside, and we don't need to.

**Step 4 — Orchestrator (Phase 2: Babysitter):**
The orchestrator flips from front-end to babysitter. Same person, two hats, one claim. The ticket is open on the dashboard. Three people can see it:

```
    DASHBOARD
    │  • Ticket is open
    │  • How long it's been open
    │  • Is it resolved yet?
    │
    ┌────┴──────────────────┐
    │         │             │
 Servicing   HR           DAVE
  Agent                    │
    │              Vendor taking too long?
    │              → Pull them. Reroute.
```

The vendor can't hide. If the ticket sits too long, the vendor gets pulled and the claim gets rerouted. Vendors are pluggable — underperform and you get replaced. The client never feels it because their relationship is with SVG, not with the vendor.

**Step 5 — Loop Closure (Servicing Agent):**
The claim isn't done when the vendor finishes. The claim isn't done when the savings hit. The claim is done when the servicing agent reaches out to the employee and confirms the process was handled correctly.

The question isn't "are you happy with the price?" The question is: "Did the process work the way it was supposed to? Were you taken care of? Did someone communicate with you every step of the way?"

- Process confirmed correct → **servicing agent closes the ticket**
- Something fell through (vendor didn't call back, step got skipped, communication broke down) → **loop stays open, escalates**

---

### The Servicing Agent Across Both Sides

**90/15:** Makes sure everybody's happy with routine claims. Smooth sailing. Oversight.

**10/85:** The human face of the high-dollar process. Covers the warm-up, monitors the dashboard, closes the loop by confirming process integrity with the employee.

---

### Vendor Management — Many-to-One

Every vendor is a pluggable spoke. None of them own the client relationship. All of them connect through Dave.

| Principle | How It Works |
|-----------|-------------|
| **Many-to-one** | Multiple vendors, one hub (Dave). The client has one relationship. |
| **Pluggable** | Vendor underperforms? Pull them, plug in another. Client never feels it. |
| **Accountable** | Dashboard visibility. Open ticket + elapsed time = built-in pressure. |
| **Vendor contacts employee only after warm-up** | HR email first, orchestrator second, THEN vendor is authorized to reach out. |
| **Orchestrator babysits** | Front end (gather + route) then back end (monitor + enforce). Same person, two phases. |
| **Invoices route back to Dave** | Bill rendered → invoice comes to operations for review → verified against program and dashboard → paid. Vendor can't overbill. |

---

### Two Loops Close Through One Hub

**Service Loop:** Flag → HR email → orchestrator → vendor → orchestrator babysits → servicing agent confirms process with employee → ticket closed.

**Financial Loop:** Vendor renders bill → invoice routes to operations → verified against program/dashboard → invoice sent to TPA → TPA pays vendor on the claim side → client never pays vendor directly.

Both loops close through the same person. The vendor can't shortcut the service. The vendor can't inflate the invoice. One hub controls both. The client's plan absorbs the cost as a claim through the TPA — the funding mechanism that's already in place.

**The Dashboard:** Every step of both loops is a data point. Flags, routing, vendor assignments, ticket status, elapsed time, invoices, payments, savings. The dashboard is the exhaust from the machine. At renewal, the broker opens it and sees the full picture: what the plan would have paid vs what it actually paid. The dashboard IS the renewal presentation.

---

### Output

| What Comes Out | Who Gets It |
|---------------|------------|
| Prospect intelligence (enrichment, DOL data, scoring) | Dave → outreach campaigns |
| Appointments and proposals | Brokers and prospects |
| Claims savings (cost containment results) | Client HR, broker |
| Dashboard visibility | HR, servicing agent, Dave |
| Employee confirmation ("I'm good") | Loop closure — the final output |

### Circle (Bedrock §5)

Every claims resolution feeds back into the system. Vendor performance data improves routing. Employee satisfaction confirms the process works. Broker sees results, brings more clients. The Circle tightens.

---

### Content Architecture — Four Audiences, Four Content Tracks

The operating model produces content for four distinct audiences. Each track has its own purpose, altitude, and tone. Scripts, videos, and visuals must be filed under the correct track or they get rejected as "wrong altitude for audience."

| Track | Audience | Purpose | Canonical examples | Altitude |
|---|---|---|---|---|
| **Prospect-facing** (sales funnel) | CEOs, CFOs, HR directors at target employers | Convert cold prospect to signed client via the four-gate sales journey | Hook video ("The 10% Problem"), Gate 1-4 videos, sales infographics, landing pages (svg.agency, networks.svg.agency) | Shallow mechanics, heavy on the "twos" pattern and the control boundary. No vendor-specific detail, no timing asymmetry, no pricing-path dissection. |
| **Client-facing** (post-engagement) | New clients in onboarding weeks 1-2 | Explain the mechanics they're about to experience so onboarding runs smoothly | Explainer videos on hospital process timing, drug process timing, 501r/RBP/PPO routing, MAP/340B/international drug sourcing, dashboard tour, ticket system walkthrough | Deep mechanics, full honesty about timing asymmetry and vendor ecosystem. Assumes the client has already bought in. |
| **Vendor-facing** (operational + recruitment) | UM pre-cert vendors, specialty drug flag vendors, TPAs, networks, PBMs, stop-loss carriers | Two sub-purposes: (1) get vendors to understand where they fit in the two-layer architecture so they cooperate on integration, (2) get vendors excited about the scale so they prioritize Dave's integration requests over other customers | "The 10" Operational Briefing (where vendors fit, how the orchestrator pre-warms and hands off, how billing changes), Vendor Marketing / Scale Video (117K TAM, 30K active marketing, sub-hub orchestration, why vendors should want in) | Operational tone for the briefing, scale-and-sophistication tone for the marketing video. Both assume the vendor is technical and respects clarity. |
| **Doctrine** (internal) | Dave's team + future agents operating the machine | Single source of truth for how the operation works, how it talks, how it gets built | `law/VOICE-LIBRARY.md`, `law/doctrine/FOUNDATIONAL_BEDROCK.md`, `fleet/content/svg-operating-model.md` (this doc), CLAUDE.md, fill instructions | Full detail. Canonical. Everything else in the library derives from these docs. |

**Vendor track — specific videos required:**

1. **"The 10" Operational Briefing for Vendors** — explains where each Layer 1 and Layer 2 vendor fits, what the orchestrator does in front of them (warm-up, intake, handoff, billing), and exactly what changes vs what stays the same. The core message: *"Your triggers are fine. Your playbook is fine. Your expertise is the whole reason we want you in the stack. What we're adding is an orchestration layer that dramatically improves your engagement rate — and the only back-office change is that you bill us instead of the client."*

2. **Vendor Marketing / Scale Video** — shows the TAM (~117K companies), the active marketing pipeline (~30K), the sub-hub orchestration architecture (Mission Control, outreach engine, enrichment system, dispatch engine), and positions integration with Dave as plugging into a scaling pipeline rather than signing up one client at a time. Tone: Bloomberg Terminal × premium financial infrastructure. Lets vendors see the machine.

   **Core psychology the video has to break through:** Vendors will NOT change their processes, build custom flags, prioritize integration work, or accept unusual billing arrangements unless they see real client volume coming through the pipes. They've been burned too many times by brokers promising volume that never showed up. The video exists for exactly one reason — to prove scale with concrete numbers (117K TAM, 30K being actively marketed, the sub-hub dashboard live on screen) so vendors stop treating Dave as "just another broker telling us how to do our job" and start treating integration with Dave as a strategic priority. Without this proof, every operational ask from "The 10" briefing is going to stall at the vendor's ops team. With it, the vendor's head of BD reorganizes their roadmap to make room for Dave. **The scale proof is the unlock.**

Both vendor videos live in `fleet/content/` as sibling files to the prospect-facing content, with their own HEIR identity and status tracking.

---

## 5. DATA SCHEMA

_Where the data lives. What's read, written, joined._

### READ Access

| Source | What It Provides | Join Key |
|--------|-----------------|----------|
| svg-d1-outreach-ops | Company targets, enrichment, DOL filings, page-parsed intelligence | outreach_id |
| svg-d1-spine | Core identity across all domains | company_unique_id |
| svg-d1-sales | Pipeline status, DISC profiles, appointments | outreach_id |
| svg-d1-client | Client service records, ongoing management | client_id |
| TPA/PBM file feeds | Adjudicated claims, high-dollar flags | member_id / claim_id |
| Ticketing system | Open tickets, vendor status, resolution time | ticket_id |

### WRITE Access

| Target | What It Writes | When |
|--------|---------------|------|
| Ticketing system | New tickets (auto-flag or employee request) | Claim flag or inbound call |
| Dashboard | Ticket status, elapsed time, resolution | Real-time updates |
| svg-d1-outreach-ops | Enrichment data, scoring updates | Outreach cycle |

### Join Chain

```
Client (the person)
  → svg-d1-spine (company_unique_id)
    → svg-d1-outreach-ops (outreach_id — prospect intelligence)
    → svg-d1-sales (outreach_id — pipeline and conversion)
    → svg-d1-client (client_id — service records)
    → TPA/PBM feeds (member_id — claims data)
      → Ticketing (ticket_id — resolution tracking)
```

### Forbidden Paths

| Action | Why |
|--------|-----|
| Vendor contacts client directly | Many-to-one violated — all vendor interaction goes through Dave |
| Ticket closed without employee confirmation | Loop not closed — servicing agent must confirm |
| Claims processing on the 90/15 | Not our job — TPA/PBM handles routine claims |

---

## 6. DMJ — Define, Map, Join (law/doctrine/DMJ.md)

_Three steps. In order. Can't skip._

### 6a. DEFINE (Build the Key)

| Element | ID | Format | Description | C or V |
|---------|-----|--------|-------------|--------|
| Dave (hub) | HUB-01 | Person — broker + ops | The single point of contact and control | C |
| Servicing Agent | SA-01 | Person — under Dave | Services the operations, hand-holds 10/85 employees | C |
| Orchestrator | ORCH-01 | Process — under Dave | Routes tickets to vendors, watches the clock | C |
| 90/15 Routine | CLAIM-90 | Claim type | Routine claims — TPA/PBM handles, not SVG | C |
| 10/85 High-Dollar | CLAIM-10 | Claim type | High-dollar claims — SVG's domain | C |
| Vendor (spoke) | VENDOR-* | Service provider | Pluggable, replaceable, accountable to Dave | V |
| Ticket | TKT-* | Service ticket | Routes to vendor, tracked on dashboard | V |
| High-$ Drug Programs | PROG-DRUG | MAP, International, 340B | Cost containment for high-dollar drugs | C |
| High-$ Hospital Programs | PROG-HOSP | PPO, Reference-Based Pricing, 501(r) | Cost containment for high-dollar hospital claims | C |
| Employee Confirmation | CONFIRM-01 | Yes/No | Loop closure — employee says they're good | V |

### 6b. MAP (Connect Key to Structure)

| Source | Target | Transform |
|--------|--------|-----------|
| TPA/PBM file feed | Claim flag (10/85 threshold) | Automatic — system detects high-dollar |
| Claim flag | Ticket (TKT-*) | Auto-created — routed to vendor by type |
| Ticket type (drug/hospital) | Vendor program (PROG-DRUG / PROG-HOSP) | Routing — ticket goes directly to vendor |
| Vendor resolution | Dashboard status | Direct — open/elapsed/resolved |
| Dashboard resolved | Servicing agent call | Trigger — call the employee |
| Employee confirmation | Loop closure | Direct — yes closes, no escalates |

### 6c. JOIN (Path to Spine)

| Join Path | Type | Description |
|-----------|------|-------------|
| Client → Dave (hub) | Direct | One relationship, no handoff |
| Dave → Servicing Agent | Direct | SA reports to Dave |
| Dave → Orchestrator | Direct | Orchestrator reports to Dave |
| Orchestrator → Vendor | Direct | Ticket routing, vendor accountable to orchestrator |
| Vendor → Dashboard | Direct | Ticket visibility for SA, HR, Dave |
| Dashboard → Employee | Indirect | Via servicing agent call — loop closure |

---

## 7. CONSTANTS & VARIABLES (Bedrock §2)

### Constants (structure — never changes)

- Dave is the hub — broker + operations, same seat, same person
- Many-to-one vendor relationship — all vendors connect through Dave
- Servicing agent reports to Dave — services the ops, not the client directly
- Orchestrator reports to Dave — routes tickets, watches vendors
- 90/15 is TPA/PBM territory — SVG doesn't touch routine claims
- 10/85 is SVG territory — high-dollar claims, cost containment
- Loop closes on employee confirmation — not on system status
- Vendors are pluggable — underperform and you get pulled
- Vendors never contact client directly — everything through the hub
- Two ticket paths — automatic flags (proactive) and employee requests (reactive)
- Dashboard visibility — servicing agent, HR, and Dave all see the ticket

### Variables (fill — changes every client)

- Which TPA / PBM is in play
- Which vendors are assigned to which programs
- Specific plan details and employee census
- Claim dollar thresholds for flagging
- Vendor response time expectations

---

## 8. STOP CONDITIONS (Bedrock §6)

| Condition | Action |
|-----------|--------|
| Vendor not responding to ticket | Escalate — Dave pulls vendor, reroutes |
| Employee not satisfied at loop closure | Loop stays open — escalate to Dave |
| TPA/PBM file feed stops | HALT — no claims visibility without feed |
| Servicing agent can't reach employee | Retry protocol — 3 attempts before escalation |
| Same vendor fails 3 times | Strike 3 — pull vendor permanently, find replacement |
| Claim routing unclear (new type) | Escalate to Dave — orchestrator doesn't guess |

---

# GOVERNANCE (Change — how this is controlled)

_Everything in this cluster answers: what transforms? How is quality measured, verified, certified?_

## 9. VERIFICATION

_Executable proof that it works. Run these._

```
1. High-dollar claim flagged → expected: ticket auto-created, routed to correct vendor
2. Vendor receives ticket → expected: visible on dashboard with timestamp
3. Vendor resolves → expected: dashboard updates, servicing agent notified
4. Servicing agent calls employee → expected: employee confirms satisfaction
5. Employee not satisfied → expected: loop stays open, escalation triggered
6. Vendor takes too long → expected: Dave alerted, vendor pullable
7. Employee calls in with problem → expected: ticket created, same routing/tracking
```

**Three Primitives Check (Bedrock §1):**
1. **Thing:** Does the ticket exist? Does the vendor assignment exist? Does the dashboard show it?
2. **Flow:** Does the flag reach the system? Does the ticket reach the vendor? Does the resolution reach the servicing agent?
3. **Change:** Did the vendor execute? Did the employee confirm? Did the loop close?

---

## 10. ANALYTICS

_The BUILD→OPERATE gate. Three sub-layers._

### 10a. Metrics

| Metric | Unit | Baseline | Target | Tolerance |
|--------|------|----------|--------|-----------|
| Ticket auto-flag accuracy | % | BASELINE | 100% | 0 — every 10/85 claim gets flagged |
| Vendor response time | hours | BASELINE | < 24h | 48h max before pull |
| Loop closure rate | % | BASELINE | 100% | 0 — every 10/85 gets employee confirmation |
| Employee satisfaction | Yes/No | BASELINE | 100% Yes | Track every No for root cause |
| Vendor pull rate | count/quarter | BASELINE | 0 | Rising = vendor quality problem |
| Proactive vs reactive tickets | ratio | BASELINE | 80/20 | More proactive = system working |

### 10b. Sigma Tracking (Bedrock §2)

| Metric | Run 1 | Run 2 | Run 3 | Trend | Action |
|--------|-------|-------|-------|-------|--------|
| Vendor response time | — | — | — | PENDING | Establish baseline |
| Loop closure rate | — | — | — | PENDING | Establish baseline |
| Employee satisfaction | — | — | — | PENDING | Establish baseline |

### 10c. ORBT Gate Rules

| From | To | Gate |
|------|-----|------|
| BUILD | OPERATE | All metrics baselined, ticketing live, dashboard live |
| OPERATE | REPAIR | Vendor response time exceeds tolerance or loop closure drops |
| REPAIR | OPERATE | Vendor replaced or process fixed, metrics back in range |
| Any (Strike 3) | TROUBLESHOOT/TRAIN | Vendor permanently pulled, program restructured |

---

## 11. EXECUTION TRACE

_Append-only. Every action logged. The auditor reads this._

| Field | Format | Required |
|-------|--------|----------|
| trace_id | UUID | Yes |
| ticket_id | UUID | Yes |
| claim_type | 90-15 / 10-85-drug / 10-85-hospital | Yes |
| vendor_assigned | vendor name | Yes |
| routed_at | ISO-8601 | Yes |
| vendor_responded_at | ISO-8601 or null | If responded |
| resolved_at | ISO-8601 or null | If resolved |
| employee_confirmed | yes / no / pending | Yes |
| elapsed_hours | integer | Yes |
| action_taken | routed / escalated / vendor-pulled / closed | Yes |
| signed_by | agent or Dave | Yes |

---

## 12. LOGBOOK (After Certification Only)

_Created ONLY when the auditor certifies (BUILD → OPERATE). Append-only._

**No logbook during BUILD.**

### Birth Certificate

| Field | Value |
|-------|-------|
| heir_ref | PROC-SVG-OPS / svg-ops-model / trunk / CC-01 |
| orbt_entered | BUILD |
| orbt_exited | OPERATE |
| action | Certified — SVG operating model documented and operational |
| gates_passed | { imo: true, ctb: true, circle: true } |
| signed_by | [pending certification] |
| signed_at | [pending] |

---

## 13. FLEET FAILURE REGISTRY

| Pattern ID | Location | Error Code | First Seen | Occurrences | Strike Count | Status |
|-----------|----------|-----------|-----------|-------------|-------------|--------|
| — | — | — | — | — | — | No failures registered |

**Strike 1:** Repair vendor. **Strike 2:** Scrutiny — watch every ticket. **Strike 3:** Pull vendor → find replacement.

---

## 14. SESSION LOG

| Date | What Was Done | LBB Record |
|------|---------------|-----------|
| 2026-04-10 | Initial build — full operating model captured from Dave Barton working session | pending |
| 2026-04-15 | Two-layer architecture locked and named. Added Layer 1 (five vendors: First Health/HealthSmart PPO, TPA, PBM, UM pre-cert, specialty drug flag) and Layer 2 (two processes, one orchestrator) as explicit sections. PHCS and MultiPlan removed from approved networks (no longer rent clean). Added "The Two Aggregators" financial architecture section (Dave bills fixed, TPA bills variable, CFO sees two numbers). Added "Content Architecture" section naming four audience tracks: prospect-facing, client-facing, vendor-facing (new), and doctrine. Defined two vendor-facing videos: "The 10" Operational Briefing and Vendor Marketing / Scale Video. Captured the core vendor psychology: vendors won't change processes without proof of client volume; the scale proof is the unlock. Removed duplicate Vendor Management section. | pending |

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-04-10 |
| Last Modified | 2026-04-15 |
| Version | 1.2.0 |
| Template Version | 1.0.0 |
| Medium | process |
| US Validated | pending |
| Governing Engine | law/doctrine/FOUNDATIONAL_BEDROCK.md + law/doctrine/DMJ.md |
| Canonical Reference | law/VOICE-LIBRARY.md v1.2.0 (paired doctrine) |
