# The 10-85 Process — Vendor Operating Spec

This document explains how the 10-85 claims process works and where vendors fit into it. It is not a sales piece. It is an operating spec for any vendor who wants to work inside this system.

## The Premise

In any self-funded health plan, 90% of claims are routine and 10% drive 85% of the total cost. The routine claims run through the TPA and PBM. Those are not our domain. The 10% that drives the cost — specialty drugs, hospital stays, high-dollar procedures — is where this process operates.

## The Hub and the Spokes

Dave Barton is the hub. Everything connects through him. Operations, vendor management, and client ownership sit in one seat.

- The **servicing agent** reports to Dave. They are the human face of the process.
- The **orchestrator** reports to Dave. They route and monitor.
- **Vendors** are pluggable spokes. They sit behind the orchestrator. They work at Dave's discretion.

This is a many-to-one relationship. Many vendors, one hub. The client has one relationship — with Dave. Vendors never contact the client directly outside of the approved handoff window (see below).

## Two Flag Sources — Inputs to the Machine

Claims come to us through two different pipes. Both trigger the same downstream process.

**High-dollar drugs:** Flag comes from the PBM file feed after the medication is adjudicated and filled. We see it automatically.

**High-dollar hospital:** Flag comes from the pre-certification program before the procedure happens. We know before the money is spent.

Both pipes feed the same machine. The moment either flag hits, the process starts.

## The Process

### Step 1 — HR Warm-Up Email

An email is sent to the employee. It appears to come from their own HR department. It tells them that a program is available to help with this claim and that someone will reach out.

The employee trusts HR. They do not trust cold calls. The email opens the door before anyone picks up the phone.

### Step 2 — Orchestrator Front End

The orchestrator contacts the employee. The call is expected because of the HR email. The orchestrator gathers the information needed to route the claim — income verification for drug assistance programs, procedure details for hospital claims, anything else the destination program requires.

The orchestrator then matches the claim to the correct program and routes it to the vendor that runs that program.

### Step 3 — Program Routing

The orchestrator knows every program and which vendor runs which one.

**High-dollar drug programs:**
- MAP (Manufacturer Assistance Programs)
- International sourcing
- 340B

**High-dollar hospital programs:**
- PPO network repricing
- Reference-Based Pricing
- 501(r) hospital financial assistance

Each program is a separate routing path. The orchestrator picks the right one and hands the case to the vendor.

### Step 4 — Vendor Handoff

The case moves to the vendor. At this point — and only at this point — the vendor is authorized to contact the employee directly. The employee has been warmed up by the HR email and has already spoken to the orchestrator. The vendor call is expected.

The vendor executes their program. Their system, their workflow, their job. We do not see inside their system. We do not need to.

### Step 5 — Orchestrator Babysitter

After the handoff, the orchestrator switches from front-end mode to babysitter mode. Same person, two phases, one claim.

The ticket is open on the dashboard. Three people can see it: the servicing agent, HR, and Dave. The dashboard shows one thing clearly — is the ticket still open, and how long has it been open.

If the ticket sits too long, the orchestrator pulls the vendor and reroutes the claim to another vendor that runs the same program. Vendors are pluggable. The client never feels it because the client's relationship is with Dave, not with the vendor.

### Step 6 — Loop Closure (Service Side)

The claim is not done when the vendor finishes. The claim is not done when the savings hit. The claim is done when the servicing agent reaches out to the employee and confirms that the process was handled correctly.

The question is not "are you happy with the price." The question is "did the process work the way it was supposed to." If the process was followed, the servicing agent closes the ticket. If something broke — a vendor did not call back, a step got skipped, communication failed — the loop stays open and the ticket escalates.

The servicing agent covers both sides of the plan. On the 90/15, they make sure routine claims run smoothly. On the 10/85, they hand-hold the high-dollar process from warm-up to close.

### Step 7 — Loop Closure (Financial Side)

Once the vendor has completed the work, they render an invoice. The invoice does not go to the client. It does not go to the vendor's billing department for direct collection. It comes back to Dave.

Dave reviews the invoice against what the dashboard tracked. If the bill matches the program and the work that was completed, the invoice is sent to the TPA. The TPA pays the vendor on the claim side — the same way they would pay any other claim under the plan.

The client never pays the vendor directly. The funding flows through the TPA, which is already the funding mechanism for the plan. The vendor cannot overbill because the entire process was tracked from flag to close. Every step is a data point on the dashboard, and the dashboard is what the invoice is verified against.

## Where Vendors Fit

Vendors are spokes. They connect to the hub through the orchestrator. They work at Dave's discretion.

**Vendor inputs:** Case handoff from the orchestrator with all required information.

**Vendor responsibilities:**
- Execute their program.
- Contact the employee only after the handoff.
- Render an invoice to Dave (not the client) when the work is complete.
- Respond to dashboard monitoring — if a ticket is open too long, expect to be pulled.

**Vendor outputs:**
- Program completion
- Invoice to Dave for verification and TPA payment

**What vendors do not do:**
- Contact the client directly.
- Bill the client directly.
- Own the client relationship.
- Make routing decisions.
- Bypass the orchestrator.

## The Dashboard

Every step of this process is a data point. The flag, the HR email, the orchestrator call, the routing decision, the vendor handoff, the ticket timer, the vendor completion, the invoice, the TPA payment, the service loop closure. All of it.

The dashboard is not a separate system. It is the exhaust from the machine. Three people see it in real time: the servicing agent, HR, and Dave. At renewal, the broker sees the full history — what the plan would have paid versus what it actually paid, every claim touched, every vendor used, every invoice verified.

## Summary

Two flag sources. One machine. One hub. Pluggable vendors. Two loops — service and financial — both close through Dave. The client never touches a vendor directly. The TPA is the payment mechanism. The dashboard is the record.

That is the 10-85 process.
