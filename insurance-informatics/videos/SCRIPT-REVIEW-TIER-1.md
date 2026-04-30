# Tier 1 Script Review — HeyGen Render Queue

## Purpose

Open this at 7 AM. Mark each script ✅ / ✏️ (edit inline) / ❌. Approved scripts go straight into the render queue. Once all 7 are marked, I batch render in HeyGen, upload to CF Stream, wire to content-pages, deploy.

## Session plan recap

| Step | Your action | Time |
|---|---|---|
| 1 | Authorize `curl https://static.heygen.ai/cli/install.sh | sh` | 1 min |
| 2 | Pick stock avatar + stock voice in HeyGen UI | ~10 min |
| 3 | Review + approve scripts below | ~20 min |
| 4 | Wait for renders + do 5-min review per video as they finish | ~35 min spread over day |
| 5 | Videos live on CF Stream + content-pages deployed | automatic |

---

## Voice-audit flags (one item needs your decision)

Before approvals, one honest flag per today's 50K-stripping doctrine:

**⚠ E-03 currently teaches the mechanics.** Your 2026-04-20 rule was "take out RBP, 501, and anything that shows them how we do it. Keep it simplistic, very high-level." The current E-03 script explicitly walks through PPO → RBP → 501R and describes the Medicare-baseline audit. That's Gate 2 content, not top-of-funnel LinkedIn.

**I've written both versions below (E-03 "mechanics-in" = current, E-03 "50K-stripped" = alternative).** You pick.

Everything else (E-01, E-02, E-04, E-05, E-06, C-00) is already aligned with the 50K/evergreen rule or doesn't teach the mechanics.

---

## 1. E-01 — Self-Insured vs Fully-Insured

| Field | Value |
|---|---|
| Slot | E-01 |
| Altitude | 50K/40K |
| Target duration | ~75 seconds |
| Source | `factory/content/video-scripts/EXPLAINER-VIDEOS-E01-E05.md` §E-01 |
| Voice-audit | ✅ Clean |

### Script

> We save 20 to 55% off of your premiums by managing the 10% of employees that cause 85% of your claims. And we take all the benefits management off HR's plate entirely.
>
> That's insurance informatics. Two things. Save you money. Remove the burden.
>
> Here's how.
>
> You can't stop claims. Your employees are going to get sick. They're going to need surgery. They're going to have cancer cases. That's reality.
>
> The question isn't how to prevent them. The question is who manages the cost when they do.
>
> Here's how fully insured works. You hand the carrier a premium every month. They own the money. They pay the claims. Whatever's left over, they keep. Their incentive is not to make your claims cheap — it's to keep your premium high.
>
> Here's how self-insured works. Your money stays in your account. Claims come in, you pay them. Your process decides how they're repriced, routed, and managed. What you don't spend, you keep.
>
> Same employees. Same claims. Same math. Two completely different outcomes.
>
> Fully insured, you're buying a product. Self-insured, you're running a process.
>
> The discipline that makes self-insurance work is called insurance informatics. It treats your health plan the same way hospitals treat patient data — as information to be managed, not a product to be sold.
>
> The math is simple. The decision is a business decision, not an insurance decision.
>
> 15 minutes if you want to see the math.

### Approval

☐ ✅ Render as-is  
☐ ✏️ Edit (note changes inline above)  
☐ ❌ Skip

---

## 2. E-02 — The 90/15 and 10/85

| Field | Value |
|---|---|
| Slot | E-02 |
| Altitude | 30K |
| Target duration | ~75 seconds |
| Source | §E-02 same file |
| Voice-audit | ✅ Clean (process-level only, no mechanics taught) |

### Script

> We save 20 to 55% off of your premiums by managing the 10% that cause 85% of your claims. And your HR department stops managing benefits entirely.
>
> Here's what that actually looks like.
>
> 90% of your employees drive 15% of your total claims cost. Routine stuff — doctor visits, standard prescriptions, a knee x-ray. Your TPA and PBM handle those automatically. You don't touch them. Nobody needs to.
>
> The other 10% drive 85% of your cost. Cancer cases. Joint replacements. Specialty drugs at $10,000 a month. Hospital stays. This is where every dollar is won or lost.
>
> For the 90%, you run a copay plan. $15 copay, $25 specialist. No deductible. No confusion. Here's your card, go live your life.
>
> For the 10%, you run a process. Every high-dollar claim gets flagged before the money moves. It gets routed to the right vendor. Somebody calls the employee. It gets managed until it's resolved.
>
> When you actively manage that 10%, you save 20 to 55% on your total cost. That's not a projection. That's what the math produces when the process works.
>
> Nobody else is doing this. Not because it's hard. Because nobody else has the data to see it.
>
> Want to see what your 10% looks like?

### Approval

☐ ✅ Render as-is  
☐ ✏️ Edit (note changes inline above)  
☐ ❌ Skip

---

## 3. E-03 — Hospital Bill Audit ⚠ DECISION NEEDED

| Field | Value |
|---|---|
| Slot | E-03 |
| Altitude | 20K (current) — ⚠ but published at LinkedIn top-of-funnel |
| Target duration | ~75 seconds |
| Source | §E-03 same file |
| Voice-audit | ⚠ CURRENT VERSION TEACHES MECHANICS — decide between two versions below |

### Version A — "Mechanics-in" (current, teaches the waterfall)

> We save 20 to 55% off of premiums by managing the 10% that cause 85% of claims. One of the biggest ways we do that is by catching hospital overbilling before a dollar moves.
>
> Hospitals overbill. That's not an opinion. It's a documented pattern. Wrong billing codes. Duplicate line items. Charges for services not rendered. Inflated rates that assume nobody will check.
>
> Most people don't check.
>
> Here's what we do before we pay anything.
>
> Every hospital bill gets audited against Medicare rates. Line by line. Every charge gets compared against what Medicare would pay for the same service. Anything outside that range gets flagged.
>
> On average, that audit cuts about 30% off the bill. Before we negotiate. Before we do anything else. Just from catching what's wrong.
>
> Then we run the waterfall.
>
> First stop: PPO network rate. Negotiated discount. Good, not great. Second stop: Reference-Based Pricing — that's a percentage of Medicare, not the hospital's sticker. Better. Third stop: 501R. Nonprofit hospital financial assistance. If the patient qualifies, the balance goes to zero.
>
> $100,000 hospital bill. Audit cuts it to $70,000. 501R takes the rest to zero.
>
> Two bites at the apple. Shrink the bill first, then shrink what's left.
>
> This is what insurance informatics does with your high-dollar claims.

### Version B — "50K-stripped" (per 2026-04-20 doctrine — no RBP, no 501R, no Medicare-baseline)

> We save 20 to 55% off of premiums by managing the 10% that cause 85% of claims. One of the biggest ways we do that is by catching hospital overbilling before a dollar moves.
>
> Hospitals overbill. That's not an opinion. It's a documented pattern. Wrong billing codes. Duplicate line items. Charges for services not rendered. Inflated rates that assume nobody will check.
>
> Most people don't check.
>
> We check every hospital bill before a dollar moves. Every line item. What we find is the bill is almost always wrong.
>
> Then we route what's left through a sequence of cost-reduction steps. I'm not going to walk through them in a 60-second video. The short version: by the time we're done, a $100,000 hospital bill has been known to go to zero.
>
> Two bites at the apple. Shrink the bill first, then shrink what's left.
>
> 15 minutes if you want to see the math on a real bill — bring yours.

### Approval — pick one

☐ ✅ Render Version A (keep mechanics in — you're OK giving away the waterfall at top of funnel)  
☐ ✅ Render Version B (50K-stripped per today's doctrine — mechanics stay for Gate 2)  
☐ ✏️ Edit either (note changes)  
☐ ❌ Skip — cut E-03 from Tier 1

---

## 4. E-04 — What Your Broker Can't See

| Field | Value |
|---|---|
| Slot | E-04 |
| Altitude | 30K |
| Target duration | ~75 seconds |
| Source | §E-04 same file |
| Voice-audit | ✅ Clean — describes positioning (data silos, warehouse) without teaching mechanics |

### Script

> We save 20 to 55% off of premiums and take all benefits management off HR's plate. The reason nobody else can do this comes down to one thing — data.
>
> Your broker can't see what's happening with your health plan.
>
> Not because they don't want to. Because no broker, no account manager, can log into your TPA's system. They can't see inside the PBM. They can't pull data from your stop loss carrier. Every vendor sits in its own portal. Every invoice comes in a different format. Your CFO is logging into 10 systems to piece together a picture that should already exist in one place.
>
> That's the silo problem. And it's universal.
>
> Here's how we solve it.
>
> We build a data warehouse for each client. Every vendor feeds data directly into it — TPA claims, PBM drug spend, fixed-side vendor invoices, enrollment records, high-dollar case outcomes. All of it. One warehouse, one view.
>
> We can't log into their systems either. We don't need to. Their data is already in ours.
>
> Your CFO sees one dashboard. Two bills — one fixed, one variable. Every number in one place. No chasing portals. No piecing together spreadsheets.
>
> And because all your vendor connections run through our infrastructure, the switching cost to leave is real. You'd rebuild every data connection from scratch.
>
> That's not a threat. That's just how infrastructure works.
>
> One dashboard. Two bills. That's it.

### Approval

☐ ✅ Render as-is  
☐ ✏️ Edit  
☐ ❌ Skip

---

## 5. E-05 — The Duck (75-sec short)

| Field | Value |
|---|---|
| Slot | E-05 |
| Altitude | 50K |
| Target duration | ~75 seconds |
| Source | §E-05 same file |
| Voice-audit | ✅ OK — rapid-fire list of mechanics is intentional for the metaphor ("look under the water"), doesn't teach any of them. Different purpose than E-03. |

### Script

> We save 20 to 55% off of premiums by managing the 10% that cause 85% of claims. And we take all the benefits management off HR entirely.
>
> What does that actually look like day to day?
>
> Picture a duck on the water. Calm. Smooth. Effortless.
>
> That's what your CFO sees. Two bills. One dashboard. One phone number. That's it.
>
> Now look underneath.
>
> 10 or more vendors managed simultaneously. Two separate claim pipes running. Two waterfalls routing high-dollar claims — one for hospitals, one for drugs. Enrollment feeds pushing data to every vendor. HR-branded communications going out to employees who don't even know we wrote them. An orchestrator triaging every flagged case. Service reps following up after every resolution. Drug flags monitoring PBM file feeds in real time. Pre-authorizations being intercepted before procedures happen. Hospital bills being audited line by line before a dollar moves. Invoices collected, normalized, and posted to dashboards that update automatically.
>
> That's what's happening under the water.
>
> My job is to keep the duck calm on top. The process does the paddling.
>
> Nobody wants to know how the sausage is made. They want the plan to work, the employees to be taken care of, and two clean numbers at the end of the month.
>
> That's exactly what they get.
>
> That's insurance informatics. Smooth on top. Paddling like hell underneath.
>
> 15 minutes if you want to see the duck.

### Approval

☐ ✅ Render as-is  
☐ ✏️ Edit  
☐ ❌ Skip

---

## 6. E-06 — Deconstructing the Duck — 50K Master (3-4 min)

| Field | Value |
|---|---|
| Slot | E-06 |
| Altitude | 50K → 5K walk |
| Target duration | ~3:00-3:15 |
| Source | `fleet/content/videos/rendered/deconstructing-the-duck-50k-master.md` |
| Voice-audit | ✅ Locked 2026-04-20 — mechanics already stripped, voice-audited line by line vs raw transcript |
| Word count | 395 |

### Script

> We reduce total premium costs by 20 to 55 percent and take all benefits management off HR's plate. Those numbers sound like a pitch. They aren't. They're the output of a process, not a promise.
>
> Think of it like a duck on a lake. Smooth on top. Calm. One clean dashboard. Two bills. Employees happy. Underneath the water — paddling like hell. That's the whole point. The mechanics are hidden so the executive team doesn't have to manage them.
>
> Start with the math. Your claims cost isn't spread evenly. 90 percent of your employees cause 15 percent of your claims. Routine stuff. The other 10 percent cause 85 percent of the cost. Cancer, surgeries, specialty drugs. That's where every dollar is won or lost.
>
> Most cost-cutting efforts target the wrong 90. Raise copays. Tweak the network. Nibble at the edges. The math doesn't work. You can't generate real savings unless you actively manage the 10 percent that drives the cost. That's a different discipline.
>
> It's called insurance informatics. Insurance plus IT. You treat the health plan the same way a hospital treats patient data — as information to be managed, not a product to be sold.
>
> Fully insured, you hand the carrier a premium. They keep what they don't spend. Their incentive is to keep your premium high. Self-insured, your money stays in your account. Same employees. Same claims. Different math. But self-insured without the discipline is just fully-insured with more paperwork.
>
> Here's what stops most companies. The vendors running your plan all sit in their own systems. TPA, PBM, stop-loss, a handful of others. Nobody sees all of them at once. Your CFO ends up logged into ten portals. HR chases answers across disconnected vendors. The data doesn't talk.
>
> Fix that, and everything else becomes possible. Don't fix it, and nothing else works.
>
> The discipline is a data warehouse. Every vendor feed in one place. Real time. Once the data is unified, the 10 percent gets managed the same way an airline manages its fleet. Preemptive. Continuous. Measured.
>
> The executive team doesn't see any of that. The CFO gets a dashboard. Two bills. One fixed. One variable. That's it.
>
> If you want to see whether your company fits, the first step is simple. 15 minutes. Bring your current bill. I'll show you where the 90 and the 10 actually sit inside your own numbers.

### Approval

☐ ✅ Render as-is  
☐ ✏️ Edit  
☐ ❌ Skip

---

## 7. C-00 — 50K Intro / Filter ("You need me, I don't need you")

| Field | Value |
|---|---|
| Slot | C-00 |
| Altitude | 50K |
| Target duration | ~2 minutes (390 words) |
| Source | `workers/video-pipeline/gate-templates/hook-the-10-percent-problem.md` |
| Voice-audit | ✅ Mostly clean — flat-PEPM + zero-commission is positioning; process described without teaching mechanics. **One flag:** mentions "enterprise platforms Fortune 500 and US government trust" — verify you're comfortable making that claim publicly. |

### Script

> Here's something every broker in the country knows but nobody will tell you.
>
> In your health plan, 10% of your employees drive 85% of your total claims cost.
>
> The other 90%? They're routine. A doctor visit, a prescription, a standard procedure. Your TPA and PBM handle those fine.
>
> But that 10% — the hospital stays, the specialty drugs, the cancer cases, the surgeries — that's where all the money goes. And nobody is managing them.
>
> When you actively manage that 10%, you save 20 to 55% on your premiums.
>
> And your HR department stops managing benefits entirely.
>
> That's not a pitch. That's the math.
>
> The discipline that makes this possible is called insurance informatics. It treats your health plan as data and process, not as a product to be sold. Medical informatics runs hospitals. Clinical informatics runs care delivery. Insurance informatics runs the money.
>
> Here's how it works.
>
> The 90% runs on a simple copay plan. No deductibles. No surprises. Nothing to learn.
>
> The 10% gets actively managed by the informatics process. Every high-dollar claim gets flagged automatically before the money moves. Your employee gets an email from HR that says "we've got this." Somebody calls them. The claim gets routed to the right program. Every step gets followed until it's resolved.
>
> And when it's done, we call the employee back and confirm the process worked. Not "are you happy with the price" — healthcare costs what it costs. "Did we take care of you?" That's the loop.
>
> Everything is tracked in real time on a dashboard your HR, your CFO, and I can all see.
>
> This does not run on commission. You pay a flat per-employee-per-month fee, and the more the process saves you, the better. There's no incentive to push you toward any carrier. I'm not selling you a product. I'm applying a discipline.
>
> The system is self-healing. Every ticket, every vendor, every claim has a traceable identity and a state — operate, repair, build, or escalate. The machine watches itself. If a vendor isn't performing, the machine flags it. If a ticket is sitting too long, the machine routes around it. You don't call anyone. You watch the dashboard.
>
> The machine is built on the same enterprise platforms Fortune 500 companies and the US government trust. This isn't a one-man operation running on spreadsheets. It's one person running a system built on infrastructure the biggest organizations in the world already rely on.
>
> I'm the person running the machine. Not the other way around.
>
> Here's how we get started.
>
> Four stages. Each one works the same way. You get a video — about 5 minutes — explaining what we're doing. You watch it on your own time. Then we have a 15-minute meeting to answer your questions and move to the next stage.
>
> Stage one is a fact finder. I need a few numbers from you. Stages two through four, we build your system and show you what it looks like.
>
> No commitment at any stage. You can walk at any point.
>
> If you're willing to look at how the money actually moves through your plan, I'll show you what your plan could look like.
>
> Bring your current bill. Fifteen minutes.
>
> You either understand it or you don't. Either way, you'll know more than you did when you sat down.

### Approval

☐ ✅ Render as-is  
☐ ✏️ Edit (especially the Fortune 500 / US government line — confirm comfortable with that claim)  
☐ ❌ Skip

---

## Summary Approval Sheet (fill out at end)

| # | Slot | Title | Status | Notes |
|---|---|---|---|---|
| 1 | E-01 | Self-Insured vs Fully-Insured | ☐ ✅ ☐ ✏️ ☐ ❌ | |
| 2 | E-02 | 90/15 + 10/85 | ☐ ✅ ☐ ✏️ ☐ ❌ | |
| 3 | E-03 | Hospital Bill Audit | ☐ A ☐ B ☐ ✏️ ☐ ❌ | **pick A or B** |
| 4 | E-04 | Broker Blind Spot | ☐ ✅ ☐ ✏️ ☐ ❌ | |
| 5 | E-05 | The Duck (75 sec) | ☐ ✅ ☐ ✏️ ☐ ❌ | |
| 6 | E-06 | Deconstructing the Duck (3-4 min) | ☐ ✅ ☐ ✏️ ☐ ❌ | |
| 7 | C-00 | 50K Intro / Filter (2 min) | ☐ ✅ ☐ ✏️ ☐ ❌ | Confirm Fortune 500 line |

## Once approved

Tell me "Tier 1 approved — go" (or list the specific ones you've ✅'d if partial) and I start:

1. Batch submit to HeyGen render API
2. Poll for completion (typical: 2-5 min per video)
3. Download each MP4
4. Show you each for 5-min approval
5. Upload approved ones to CF Stream via wrangler
6. Update `workers/content-pages/src/configs/*.ts` with real Stream UIDs
7. Deploy content-pages (`vite build && wrangler pages deploy`)
8. Update `fleet/content/videos/MANIFEST.md` with Live status + UIDs
9. Log each render to LBB subject `svg-outreach`
10. Commit + push at each stage

Expected end-of-day: 7 evergreens live, 7 content-pages routes live, render pipeline documented + repeatable for Tier 2 next week.
