# TPA Partnership Framework
## How we evaluate fit between a TPA and our operating model — partner-oriented, not adversarial.

---

## The Core Principle

We are building a partnership, not running an interrogation. The goal is to figure out if a TPA can plug into our operating model cleanly, so that everyone — the employer, the employees, the TPA, the vendors, and us — can do their job without stepping on each other.

The TPA is the plumbing layer for claims. They handle the 90% routine, the pre-cert program, and the service tickets we route to them. We handle the 10% high-dollar claims, the vendor management, the client relationship, and the operating process.

Three questions guide the fit conversation — the same three questions we ask every partner in the operating model:

1. What do you need from us? (Input — so we can deliver it)
2. How do you do your job? (Middle — so we understand your workflow)
3. How do we get things back from you? (Output — so we can close the loop)

If the answers line up with how we operate, we're a good fit. If they don't, that's not a judgment on the TPA — it just means we'd step on each other, and neither of us wants that.

---

## The TPA's IMO — What We're Discussing

```
I (Input)                    M (Middle)                     O (Output)
─────────                    ──────────                     ──────────
What format do you           How do you                     How do we get back
need for enrollment?         handle claims                  vendor invoices paid
                             and service tickets            on the claim side?
We build the enrollment.
We deliver it.               How do you flag                How does the
                             high-dollar claims             reconciliation
                             to us?                         work?

                             What file feeds do             What's the funding
                             you send back?                 flow look like?
```

---

## Critical Context — The Funding Flow

Before we get into the questions, there's one piece of reality that deserves its own section because it's the most common source of friction between employers, TPAs, and vendors.

**The TPA cannot pay any claim — including vendor invoices for our cost-containment programs — until the employer funds the claims account.**

This is basic self-funded plan mechanics. The employer is the plan sponsor. The money for claims sits in the employer's own account. The TPA administers the plan, but they're not paying claims out of their own pocket. When a claim comes in, the TPA draws against the funded account and pays the provider or vendor on the client's behalf.

If the employer is late funding — or forgets to fund, or underfunds — the TPA cannot pay the claims. Vendors start calling. Providers start calling. Everyone yells at the TPA because they're the one who sent the "we can't pay yet" message. But the TPA didn't do anything wrong. **The employer didn't put the money in the account.**

In our operating model, we make sure the client understands this from day one. We track the funding account status on our dashboard. If the balance is low, we alert the client before vendors start calling. The TPA doesn't get caught in the middle of something the client controls.

When we talk to a TPA about plugging into our model, one of the things we want them to know is: **we have your back on the funding flow.** If the client is late, we'll be the ones telling the client to wire the money — not you. That's how we want to work together.

---

## Partnership Conversation — Questions to Discuss

### INPUT: Enrollment (What do you need from us?)

We build the enrollment and deliver it in whatever format works best for the TPA. We're not asking them to build anything or adjust their system to us. We need their spec, and we'll match it.

| Question | What a Good Conversation Looks Like | What Raises a Concern |
|----------|------------------------------------|----------------------|
| What file format do you prefer for enrollment? | A clear spec — file type, field list, layout documented | Uncertainty about their own requirements |
| What fields do you require? | Published or documented field list with data types | No consistent standard |
| How do you prefer delivery? | SFTP, API, or automated file drop | Portal-only uploads (we can still work with it, but it slows things down) |
| What's your timeline for initial enrollment? | Defined lead time relative to effective date | Vague expectations |
| How do you handle mid-year changes? | Same format, same delivery, documented process | Different process for every change type |
| Can you share a sample enrollment file? | Yes, available on request | Long delay or hesitation |

These aren't trick questions. The goal is to make sure we can deliver clean data in a format they can ingest without friction. If they have a spec, we'll match it.

---

### MIDDLE: Service (How do you do your job?)

This is where we learn about their workflow. The TPA handles two things: claims adjudication (the routine 90%) and customer service tickets we route to them through our employee website.

**Important context about the ticketing system:** Our system generates tickets as structured emails and sends them to the TPA's customer service email. The TPA picks them up and works them through their normal workflow. We're not asking the TPA to adopt a new system — we're just sending them a well-formatted email. The only thing we need from them is some way to report back on status so our dashboard stays current.

#### Claims Adjudication Questions

| Question | What a Good Conversation Looks Like | What Raises a Concern |
|----------|------------------------------------|----------------------|
| Walk me through a routine claim from receipt to payment. | Clear step-by-step process with defined timelines | Can't articulate their own workflow |
| What's your typical turnaround on claim adjudication? | Specific numbers — days, not "it varies" | No baseline SLA |
| Do you have a pre-certification program in place? | Yes, with defined trigger criteria | No, and no plan to add one |
| How do you flag high-dollar claims for us? | Configurable threshold, automated flagging, notification to us | Manual review only, no alerts |
| Can we configure custom flag thresholds per client? | Yes, typically | Fixed thresholds they won't adjust |
| What file feeds do you send back to us, and how often? | Defined file format, daily or weekly, automated delivery | Portal-only reports |
| Are you open to working with our cost-containment vendors (MAP, RBP, 501r, etc.)? | Yes, or open to integration | Won't work with outside programs |

#### Customer Service / Ticketing Questions

| Question | What a Good Conversation Looks Like | What Raises a Concern |
|----------|------------------------------------|----------------------|
| What's your customer service email address? | Dedicated team inbox | No centralized inbox |
| What fields do you need in the email for your team to work it efficiently? | Defined list — employee name, ID, issue type, plan info | No format preference |
| Walk me through what happens after a ticket email lands. | Clear workflow, named owners, typical timeline | Can't describe their own process |
| What's your typical response and resolution SLA? | Specific numbers | Vague or "it depends" |
| Who on your team handles it? | Named team or role | Undefined ownership |
| How do you report back to us on status? | Email updates, status reports, or a data feed to our dashboard | No reporting mechanism |
| How do we escalate if something falls through? | Clear escalation path with named contacts | No defined escalation |

**What we need from the service side:** A way for a ticket to come in as an email, get worked by the TPA's team, and have status reported back to us so our dashboard stays accurate. Simple email in, status out. If they can do that, we can work together.

---

### OUTPUT: Financial (How do we close the loop?)

This is the financial flow. Vendor invoices for our cost-containment programs need to be paid on the claim side, which means the TPA writes the check from the client's funded claims account.

This is exactly the same mechanism the TPA already uses to pay any medical claim — we're just asking them to add a new line item type (vendor invoice for cost containment program) to the existing workflow.

| Question | What a Good Conversation Looks Like | What Raises a Concern |
|----------|------------------------------------|----------------------|
| When we route a vendor invoice for a cost-containment program, can you process it as a claim payment? | Yes, with a defined submission process | Not set up to handle outside invoices |
| What format do you need for the invoice? | Clear spec | No standard |
| How should we submit pay-way bills? | Defined process | Unclear workflow |
| What's the reconciliation process? | Clear cycle, defined format, audit trail | No reconciliation process |
| What's your typical payment turnaround once the funding account is liquid? | Specific SLA | No commitment |
| Can you share a sample claims report showing vendor invoice payments? | Yes | Long delay |

Notice the phrase "once the funding account is liquid." That's intentional. Payment turnaround is a TPA question. Funding liquidity is a client question. We evaluate those separately because they're separate problems.

---

## What We Bring to the Partnership

We're not just asking questions — we're offering something. Here's what the TPA gets by working inside our operating model:

- **Clean enrollment, delivered on spec.** No chasing us for missing fields or bad formats.
- **Funding discipline on the client side.** We track the funding account and alert the client before vendors start calling. The TPA stops getting yelled at for something they don't control.
- **Ticket traffic that comes in as well-formatted emails.** No surprise escalations. No employees calling random numbers.
- **High-dollar claims actively managed by us.** The TPA handles the 90% routine. The 10% stressful claims — the ones that typically turn into complaints and yelling — get handled on our side.
- **Clear communication.** One operating model, one dashboard, one person (me) accountable for what's happening on our side.
- **Long-term client retention.** Clients who understand their plan stay longer. Better for them, better for us, better for the TPA.

---

## Fit Assessment

After the conversation, we evaluate fit across three areas:

| Area | Good Fit | Potential Friction |
|------|---------|-------------------|
| **Input (Enrollment)** | Clean spec provided, automated delivery possible, handles changes | No clear spec, manual-only processes |
| **Middle (Service)** | Clear workflow, automated flags, file feeds, email-based ticket intake, status reporting | No automated flagging, no way to report ticket status |
| **Output (Financial)** | Can pay vendor invoices on the claim side, clear reconciliation, defined SLA | No mechanism for vendor invoice payment on the claim side |

If all three areas are a fit, we move forward. If there's friction in any area, we talk about whether there's a workaround or whether we should each look elsewhere. **There's no winning or losing here — it's just a compatibility check.**

---

## The Positioning

This isn't a power move. It's a compatibility check between two organizations that both have standards and both have ways of working.

We're transparent about how we operate because we want the TPA to know upfront whether we're a good fit. We'd rather have the uncomfortable conversation now than discover six months in that our workflows don't line up.

The TPA is a partner, not a subcontractor. We need them to do their job well so we can do ours. They need us to bring clean data, funded clients, and managed escalations so they can do theirs. It's a real partnership when it works.

---

## What to Share in the Meeting

These are the things the TPA needs to know about us to evaluate the fit from their side:

- We build and deliver enrollment in their format
- We manage the 10% high-dollar claims through our own vendors
- We send automated file feeds and need high-dollar flags back
- We route service tickets to them as structured emails
- We send vendor invoices to be paid on the claim side
- We track the client's funding account and alert them before vendors complain
- We have a real-time dashboard that shows everything in one place

And a few things we keep close because they're our operating IP:

- How the orchestrator works internally
- Which specific vendors we use at each routing path
- Our scoring and prospect enrichment engine
- Our pricing model details

---

## Post-Meeting Checklist

After each TPA conversation, we document:

- [ ] Did we get a clear enrollment spec?
- [ ] Can they send automated file feeds with high-dollar flags?
- [ ] Can they process vendor invoices as claim payments?
- [ ] What's their pay-way bill workflow?
- [ ] What does reconciliation look like?
- [ ] What's their claims adjudication SLA?
- [ ] Can they receive and work a structured email ticket?
- [ ] Can they report ticket status back to our dashboard?
- [ ] Are they open to working with our cost-containment vendors?
- [ ] Did the conversation feel like a partnership discussion or an uphill battle?
- [ ] Overall fit: good fit / workable with adjustments / not a fit
