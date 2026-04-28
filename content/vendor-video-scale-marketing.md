# Vendor Marketing / Scale Video
## Why vendors should reorganize their roadmap to prioritize integration with Dave: 117K TAM, 30K actively being marketed, and a live sub-hub orchestration machine that will funnel them more clients than any single employer ever could.
### Status: STUB (script not yet drafted)
### Medium: vendor-facing video script
### Business: svg-agency

---

## 1. IDENTITY

| Field | Value |
|-------|-------|
| ID | VID-VENDOR-SCALE |
| Name | Vendor Marketing / Scale Video |
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
| hub_id | vendor-video-scale |
| ctb_placement | leaf |
| imo_topology | output |
| cc_layer | CC-03 leaf |
| services | Video generation pipeline, NotebookLM, CF Stream, Mission Control dashboard captures |
| secrets_provider | none |
| acceptance_criteria | Vendor watches the video and walks away believing (1) the marketing pipeline is real and at scale, (2) integration with Dave is a strategic priority for their own business, and (3) the back-office changes from "The 10" briefing are worth making because the client volume is going to be substantial. |

---

## 2. PURPOSE

**The core psychology this video has to break through:** Vendors will NOT change their processes, build custom flags, prioritize integration work, or accept unusual billing arrangements unless they see real client volume coming through the pipes. They've been burned too many times by brokers promising volume that never showed up. Every operational ask from "The 10" briefing will stall at the vendor's ops team unless the vendor's BD leadership has seen proof of scale and flagged the integration as a strategic priority.

This video exists for exactly one reason: **to prove scale with concrete numbers so vendors stop treating Dave as "just another broker telling us how to do our job" and start treating integration with Dave as a strategic priority.** Without this proof, the operational briefing ("The 10") is a waste of everyone's time. With it, the vendor's head of BD reorganizes their roadmap to make room for Dave.

**The scale proof is the unlock.**

---

## 3. AUDIENCE

BD leadership and executive teams at Layer 1 and Layer 2 vendors. Same vendor categories as "The 10" briefing, but a different persona within each vendor organization — this video targets the person who owns the vendor's partnership pipeline and roadmap prioritization, not the operations team that actually does the integration work. The operations team watches "The 10." The BD/exec team watches this video first.

---

## 4. KEY MESSAGES (the script must deliver all of these)

1. **The TAM is 117K companies.** Concrete number. No hand-waving. Dave's universe of self-insured employers that fit the operational profile is ~117,000 in the US.

2. **Active marketing pipeline is ~30K.** Of the 117K TAM, ~30K are currently in active outreach — meaning enrichment data has been pulled, DOL filings have been parsed, the company has been scored, and outreach campaigns are either running or queued. This is not a hypothetical future pipeline. It's live right now.

3. **The machine is visible.** Show the Mission Control dashboard on screen — live pipeline, outreach campaigns, enrichment system, dispatch engine, sub-hub orchestration across the 28-sub-hub Snap-On Toolbox. Vendors don't want to take your word for it; they want to see the Bloomberg Terminal of insurance informatics running in real time.

4. **Sub-hub architecture explains how it scales.** The reason Dave can run 30K active prospects simultaneously is the sub-hub architecture. Each sub-hub is its own atomic unit with its own CANONICAL and ERROR tables, CQRS data flow, and orchestration interface. Vendors should see this as industrial-grade infrastructure, not a "broker with a spreadsheet."

5. **Integration with Dave is plugging into a pipeline, not signing up one client.** The pitch: "You're not integrating with Dave to serve one employer. You're plugging into a scaling pipeline that is going to funnel you qualified clients over and over, forever, as long as the integration holds. One integration decision. Permanent volume."

6. **The two-layer architecture is why the volume is real.** Because every single client that Dave signs runs the same Layer 1 / Layer 2 architecture, every single client needs the same vendor slots filled. Every UM pre-cert integration serves every Dave client. Every specialty drug flag integration serves every Dave client. Every First Health network rental serves every Dave client. **The integration compounds.** One vendor integration = every future client.

7. **The back-office ask is small compared to the volume upside.** Billing change, one API or webhook integration, one intake data format. That's the operational cost. In exchange, every client Dave signs becomes a client for that vendor. Show the math — if Dave signs 100 clients in year 1, every Layer 1 vendor integrates with 100 new clients at zero marginal cost.

---

## 5. TONE AND AESTHETIC

**Bloomberg Terminal × premium financial infrastructure × Linear/Vercel restraint.** See `.impeccable.md` for the full design discipline. The video must feel like industrial-grade engineering, not a SaaS product demo. Dark mode, tabular data, no gradients, no centered hero shots, no stock photography, no "we're passionate about" language. Dave stays off-camera or appears only briefly — the machine is the star. Let the dashboard do the talking.

Reference brands: Linear, Vercel, Koyfin, Bloomberg Terminal. Do NOT reference: consumer insurance websites, wellness brands, broker websites, generic SaaS landing pages.

---

## 6. VOICE REFERENCE

See `law/VOICE-LIBRARY.md` §"The Pattern is Twos", §"The BUCA Black Box", and §"Layer 1 / Layer 2 — The Two-Layer Operating Model". See `.impeccable.md` for the full visual voice library. Do not drift from either.

---

## 7. STATUS

**SCRIPT v1.0 ARCHIVED — 2026-04-15.** Too dashboard-heavy, too abstract. Didn't lead with the concrete numbers or the outreach engineering story.

**SCRIPT v2.0 ARCHIVED — 2026-04-16.** Leaked the recipe — showed decomposition methodology, source counts, engine internals. Vendors need to see what the machine produces, not how it's built.

**SCRIPT v3.0 LOCKED — 2026-04-16.** Show the recipe output, not the ingredients. Scale proof (what we have), capability proof (what we can do), integration pitch (what's in it for you). The black box stays black. Render-ready for NotebookLM.

---

## 8. SCRIPT v3.0 — ARCHIVED

_(v3.0 was missing infrastructure credibility, scalability claim, and Mission Control visual. Replaced by v4.0.)_

## 9. SCRIPT v4.0

**Title:** Insurance Informatics — The Pipeline Behind Your Next 100 Clients
**Length target:** ~150 seconds
**Tone:** Confident, numbers-first, infrastructure-proud. Let the scale do the talking.
**Audience:** Every vendor in the insurance informatics ecosystem. Universal — TPA, PBM, network, stop-loss, pre-cert, drug flag, every Layer 2 execution shop. Runs FIRST in the vendor funnel before The 10.
**NotebookLM format:** Explainer. Single-source notebook. No sales language. No buyer funnel. Operational facts only.
**Black box rule:** Show what the machine produces. Do NOT show how it works internally.
**Visual:** Mission Control screenshot (CTB Tree view) included as reference image.

---

This is what SVG Agency is doing on the marketing side — because this is where your client volume comes from.

SVG started with every self-insured employer in the country that fits the operational profile. One hundred seventeen thousand companies across eight states. That's been narrowed down to about thirty-two thousand that have the right combination of size, plan structure, and geography.

Those thirty-two thousand aren't names on a list. Every one of them has been fully worked up. SVG has pulled the DOL 5500 filings — the federal filing every self-insured employer submits annually. Plan size, funding level, current service providers, total spend — all captured. A hundred and nine thousand HR and benefits contacts have been matched across those companies. SVG knows who the decision-maker is before anyone picks up the phone.

But it doesn't stop at filings and contacts. SVG monitors social platforms and talent flow in real time. When a VP of HR changes companies, SVG knows. When a CFO posts about rising healthcare costs on LinkedIn, SVG sees it. When a benefits director leaves and a new one steps in — that's a trigger. Most of the industry waits for renewal season. SVG is watching the signals that tell you a company is ready to move before they know it themselves.

When outreach happens, SVG already knows what they're spending, who they're using, where the gaps are, and what just changed. That's not a cold call. That's a warm conversation with someone who didn't know SVG was coming but realizes very quickly that the homework has already been done.

Twelve hundred emails go out this week. That's the first wave. The machine behind it runs across seven outreach channels simultaneously — email, LinkedIn, direct mail, all of them — and it's engineered to scale. Not by adding headcount. By adding volume to infrastructure that's already built.

What you're looking at is the command center. This is Mission Control — the AI-enabled operations platform that runs behind every client engagement. Thirty-eight operational nodes across five altitude levels. Fleet management, vendor integrations, outreach pipeline, compliance doctrine, the full stack. Everything runs on Cloudflare — the world's largest edge network — with enterprise-grade encryption, globally distributed databases, and zero-trust security. The same infrastructure that runs Shopify, Discord, and a quarter of the Fortune 1000.

And here's the thing about this architecture — you can't outscale it. Walmart could call tomorrow. Amazon. The largest self-insured employers on the planet. Doesn't matter. The infrastructure is built for it. There is no employer too big for this system, and there is no volume of employers too many. The machine scales horizontally. More clients don't slow it down — they make it stronger.

Now here's what that means for you.

The architecture is hub and spoke. SVG is the hub. You're a spoke. You set up your integration once — not once per client. One data feed, one invoice line. Every client SVG signs automatically flows through the same pipe to you.

SVG is the one that pushes you the business. You don't have to find the clients. You don't have to sell them. You don't have to explain the plan architecture. SVG does all of that. Your job is what you're already good at — running your piece of the operation.

The connectivity is universal. SVG connects via API, webhook, file feed, EDI — whatever your system accepts. If you have an integration point, SVG can plug into it. One connection. Every client flows through that same pipe forever. That's the many-to-one relationship — many clients, one integration. You build the bridge once. SVG sends traffic across it permanently.

A hundred clients in year one means every vendor on the wheel picks up a hundred new clients at zero sales cost. No BD cycle. No RFP. The integration is the sales motion.

If you handle the high-cost ten percent — pre-cert, drug flag, hospital negotiations, specialty pharmacy — the next conversation is the operational briefing on how cases flow through the orchestrator.

If you handle the routine ninety percent — TPA, PBM, network, stop-loss — your workflow doesn't change. SVG just pushes you more volume.

There's one more thing worth understanding about why this works and why nobody else is doing it.

SVG sits at the table with the client. Not as a broker collecting commissions from insurance carriers — SVG takes zero commission. The business model is purely operational. SVG charges a flat fee to run the operation. That means there's no carrier conflict, no split loyalty, and the client knows exactly what they're paying for.

Now think about what it would take for someone to compete with this. They'd have to build the same infrastructure, practice a discipline nobody else even knows exists, and then charge fees on top of whatever the client is already paying their commission-based broker. They'd be more expensive before they even start. SVG is already in the seat, already running the operation, and already less expensive because there's no commission layer underneath.

And the intelligence doesn't stop once a prospect becomes a client. When a company moves from the outreach pipeline into the client operation, SVG keeps watching. Talent changes, compliance filings, industry signals — the same monitoring that found them in the first place keeps running after they've signed. That's how SVG catches a renewal risk before it becomes one. That's how new opportunities inside existing clients get identified before anyone asks. The loop never stops.

And here's what makes the client relationship permanent. SVG doesn't stay because of a contract. SVG stays because the operation is embedded. The data flows through SVG. The vendor integrations run through SVG. The claims orchestration, the compliance tracking, the reporting — all of it lives inside the SVG infrastructure. For a client to move away from SVG, they wouldn't be canceling a service. They'd be rebuilding an entire operational layer from scratch — every vendor connection, every data feed, every workflow. That doesn't happen.

So when SVG tells you the volume is permanent, that's not optimism. That's architecture. As long as SVG is embedded with the client, every vendor plugged into SVG stays embedded with that client too. SVG doesn't leave. Which means you don't leave.

SVG is the only firm in the country practicing insurance informatics. It's a named discipline. Nobody else is even in the category. That's not a head start. That's a different race entirely.

One last thing. SVG built this as a plug-and-play architecture for a reason. The expectation is simple — vendors do their job. Perform well, and the volume keeps flowing. The hub is permanent. But every spoke is modular. If a vendor isn't delivering, that spoke gets replaced and the system doesn't skip a beat. The clients don't notice. The other vendors don't notice. The machine keeps running.

That's the deal. Do what you're good at. SVG handles everything else.

One integration. Permanent volume. The machine is running regardless.

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-04-15 |
| Last Modified | 2026-04-16 |
| Version | 0.5.0 (v4.0 script locked) |
| Status | RENDER-READY |
| Pairs With | law/VOICE-LIBRARY.md v1.2.0, fleet/content/svg-operating-model.md v1.2.0, fleet/content/vendor-video-the-10-operational-briefing.md v0.2.0, .impeccable.md |
