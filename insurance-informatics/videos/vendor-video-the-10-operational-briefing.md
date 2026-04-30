# "The 10" — Operational Briefing for Layer 2 Vendors
## Where you fit in the two-layer architecture, what the orchestrator does in front of you, and what changes for your back office.
### Status: STUB (script not yet drafted)
### Medium: vendor-facing video script
### Business: svg-agency

---

## 1. IDENTITY

| Field | Value |
|-------|-------|
| ID | VID-VENDOR-10-BRIEFING |
| Name | "The 10" Operational Briefing for Layer 2 Vendors |
| Medium | vendor-facing video script |
| Business Silo | svg-agency |
| CTB Position | trunk / fleet / content / vendor-facing |
| ORBT | BUILD |
| Strikes | 0 |
| Authority | Dave Barton |
| Last Modified | 2026-04-15 |
| BAR Reference | none |

### HEIR

| Field | Value |
|-------|-------|
| sovereign_ref | svg-agency |
| hub_id | vendor-video-10-briefing |
| ctb_placement | leaf |
| imo_topology | output |
| cc_layer | CC-03 leaf |
| services | Video generation pipeline, NotebookLM, CF Stream |
| secrets_provider | none |
| acceptance_criteria | Vendor watches the video and walks away understanding exactly where they fit in Layer 1 or Layer 2, what the orchestrator does in front of them, and what back-office change they need to make to accept billing through Dave. |

---

## 2. PURPOSE

Without this video, every vendor integration stalls at the "what are you actually asking us to do?" stage. Vendors assume any broker asking them to change their process is trying to replace their expertise. They get defensive and deprioritize the integration work. This video exists to short-circuit that defense by showing them — with a clear architectural diagram — that Dave's orchestrator is NOT a replacement for their process. It's an upstream layer that pre-warms the employee, gathers the intake data, and hands off a ready-to-work case. Their expertise, their playbook, their medical/clinical knowledge, their actual work — all of it stays the same. The only real change is billing goes to Dave instead of the client.

---

## 3. AUDIENCE

Technical operations and BD leadership at:
- **UM pre-cert vendors** — the companies that watch for scheduled procedures and fire pre-cert notifications
- **Specialty drug flag vendors** — the companies that monitor PBM file feeds for high-cost drug flags (Payer Matrix and similar)
- **TPAs** — third-party administrators that adjudicate and pay claims
- **PPO networks** — specifically First Health and HealthSmart (the two approved networks)
- **PBMs** — pharmacy benefit managers handling routine pharmacy
- **Stop-loss carriers** — the catastrophic coverage layer sitting above the claims fund

The video assumes the vendor is technical, respects clarity, and has been burned before by non-technical brokers making vague operational demands. Tone is operational briefing, not sales pitch.

---

## 4. KEY MESSAGES (the script must deliver all of these)

1. **Insurance informatics is a named discipline.** It sits parallel to medical informatics and clinical informatics. Vendors are being asked to integrate with a discipline, not a broker.

2. **The architecture is two layers.** Layer 1 is plumbing — network, TPA, PBM, UM pre-cert, specialty drug flag. Layer 2 is the work — two processes (hospital and drug), one orchestrator. Every vendor fits somewhere in this architecture.

3. **The orchestrator does four things.** Warm-up (HR-branded email), intake (gather the specific data the vendor needs), handoff (pre-warmed employee + packaged intake), billing (invoice flows to Dave). Everything else the vendor does stays the same.

4. **The triggers are unchanged.** Pre-cert vendors still fire pre-certs. Drug flag vendors still monitor PBM feeds. TPAs still adjudicate. PBMs still process scripts. None of that changes. The orchestrator sits in front of Layer 2 vendors (hospital and drug programs), not behind them.

5. **The playbooks are unchanged.** 501r, RBP, PPO fallback, MAP, 340B, international sourcing — whatever playbook the vendor runs, they run it exactly as they do today. Dave is not telling anyone how to do their job.

6. **The engagement rate goes UP, not down.** Cold calls to patients in medical distress get ignored. HR-branded warm-up emails don't. When the vendor gets the handoff, the employee is already expecting the call and trusts the source. Engagement goes up → save rate goes up → everybody wins.

7. **Billing changes to Dave.** One billing address — `invoice@svg.agency` — one vendor ID, one ACH instruction across all of Dave's clients. Dave pays on a predictable schedule. No AP runaround, no lost invoices, no collection risk. **This is a feature for the vendor, not friction.** The `invoice@svg.agency` mailbox is the canonical billing destination for every Layer 1 and Layer 2 vendor invoice in this architecture; see `fleet/content/svg-operating-model.md` §"Canonical Mailboxes".

---

## 5. VOICE REFERENCE

See `law/VOICE-LIBRARY.md` §"How the Orchestrator Relates to Layer 2 Vendors (vendor-facing positioning)". That subsection contains the canonical language and pitch for this video. Do not drift from it.

---

## 6. STATUS

**SCRIPT v2.0 LOCKED — 2026-04-15.** Render-ready for NotebookLM as a single-source notebook.

v1.0 retired — it was framed as "what we need from you" (architectural ask). v2.0 is framed as "here's what happens to one case, step by step" (operational mechanics). The rewrite was triggered by NotebookLM Video Overview output blending in sales content (four-step buyer funnel, fact finder) when the notebook had multiple mixed sources. The fix is a pure operational script plus a single-source notebook — nothing for NotebookLM to blend toward.

---

## 7. SCRIPT v2.0

**Title:** The 10% with the Orchestrator
**Subtitle:** Vendor Operational Explainer
**Length target:** ~2 minutes (~380 words)
**Tone:** Operational explainer. Peer-to-peer. Technical. Not a sales pitch. Not a buyer funnel. Not a fact finder.
**Audience:** Pre-cert vendors, specialty drug flag vendors, Layer 2 execution shops (PPO, RBP, 501(r), PAP/MAP, international sourcing, 340B).
**Assumption:** the viewer has already agreed to work with SVG. This video explains HOW the mechanics work, not WHY to work with SVG.

---

**[COLD OPEN — Hub and spoke diagram. Center hub: SVG ORCHESTRATOR. Spokes radiating out: PRE-CERT · DRUG FLAG · PPO · RBP · 501(r) · PAP/MAP · INTERNATIONAL · 340B]**

This is an operational explainer for the vendors inside the ten percent. Not a sales video. Not a buyer funnel. Just the mechanics — how a case flows through the orchestrator, and what you see on your side.

If you handle routine claims — TPA, PBM, network, stop-loss — the ten percent doesn't change your workflow. This video isn't for you.

This is for the vendors who sit inside the ten percent: pre-cert shops, specialty drug flag vendors, and the execution shops that run PPO repricing, reference-based pricing, 501(r), manufacturer assistance, international sourcing, and 340B.

**[Animation: a single case icon appears at the rim of the diagram, flows inward through a spoke, hits the hub, gets processed, then flows back out to a different spoke]**

Here's the flow.

**One. Your trigger fires.** Pre-cert hits, or a specialty drug flag hits the PBM feed. Your trigger logic is unchanged.

**Two. The orchestrator catches the trigger.** The hub looks up the client, the employee, the program context. One identity, one record, one source of truth.

**Three. HR-branded warm-up.** An email goes to the employee on behalf of their HR department — a care coordinator will be calling. The employee is expecting the call before it happens. Trust is borrowed from HR, not earned cold.

**Four. Intake call.** The orchestrator gathers the specific data your playbook needs — diagnosis context, income verification, procedure details, whatever your process requires to start work.

**Five. Match and handoff.** The case routes to the right playbook — PPO, RBP, or 501(r) on the hospital side; PAP, international, or 340B on the drug side. You receive a pre-warmed employee and a packaged intake record. One case ID. All the data in the format you need.

**Six. Your playbook runs.** Same expertise. Same process. Same negotiation tactics. Nothing about how you execute changes. You're the specialist. The orchestrator is not.

**Seven. Outcome back.** You send the final negotiated number and the outcome data to the orchestrator. That feeds the client's HR and CFO dashboard in real time.

**Eight. Billing.** You invoice `invoice@svg.agency` on your schedule. One vendor ID. One ACH instruction. Every client in the network.

**[Single-setup callout: ONE INTEGRATION. EVERY CLIENT.]**

And the integration is one-time. You set up once with us — not once per client. Every future SVG client flows through the same pipe.

**[Closing card — hub and spoke diagram]**

That's the ten percent with the orchestrator. Your trigger still fires. Your playbook still runs. The new part is the hub in front of you — HR-branded warm-up, packaged intake, outcome routing, consolidated billing. Nothing else changes.

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-04-15 |
| Last Modified | 2026-04-15 |
| Version | 0.3.0 (SCRIPT v2.0 — full rewrite to operational-explainer structure) |
| Status | RENDER-READY |
| Pairs With | law/VOICE-LIBRARY.md v1.3.3, fleet/content/svg-operating-model.md v1.2.0 (Canonical Mailboxes section), fleet/content/vendor-video-scale-marketing.md v0.2.0 |

### Changelog

**v0.3.0 (2026-04-15)**
- SCRIPT v1.0 → v2.0 full rewrite
- Restructured from "hub and spoke architecture + two-things ask" to "sequential 8-step case flow from trigger to billing"
- Added explicit Case ID and data format mention in the handoff step
- Added outcome routing (step 7) — vendor's work becomes visible in client dashboard
- Added assumption line: viewer has already agreed to work with SVG; this is HOW not WHY
- Root cause of rewrite: NotebookLM Video Overview drifted into sales content (four-step buyer funnel, fact finder) when the notebook had multiple mixed sources including older Gate video material. Fix is a pure operational script PLUS a single-source notebook with nothing to blend toward.

**v0.2.0 (2026-04-15)** — retired
- SCRIPT v1.0 locked as "hub and spoke + two-things ask" framing
- NotebookLM rendered this into a sales-contaminated Video Overview when blended with other sources
- Retained in git history for reference but not usable as-is
