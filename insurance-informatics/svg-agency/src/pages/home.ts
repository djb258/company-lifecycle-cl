import type { WebsitePage } from '../types';

export const homePage: WebsitePage = {
  slug: '/',
  seo: {
    title: 'SVG Agency — Insurance, Explained for Leadership',
    description:
      'Insurance is a legal contract between your company and a carrier. SVG Agency translates the fine print into plain language so you can make smarter decisions.',
    canonical: 'https://svg.agency/',
    ogTitle: 'SVG Agency — Insurance, Explained for Leadership',
    ogDescription:
      'Stop guessing. Start understanding. SVG Agency explains your insurance program the way your CFO actually thinks.',
    twitterCard: 'summary_large_image',
  },
  hero: {
    headline: 'Your Insurance Program, Finally Explained',
    subhead:
      'Most executives sign renewal paperwork without fully understanding what they bought. We fix that — in plain language, before the next claim.',
    ctaLabel: 'Book 15 Minutes',
    ctaHref: 'https://calendar.app.google/QECAsVikVsthXspa8',
  },

  // Fix 4 — Variable vs Fixed expense Data Strip
  dataStrip: {
    eyebrow: 'THE TWO HALVES OF YOUR SPEND',
    heading: 'Variable. Fixed. Predictable.',
    columns: [
      {
        number: '100%',
        label: 'VARIABLE — DRIVEN BY EMPLOYEES',
        body: 'Every claim. Every prescription. Every hospital visit. Population health is population cost. The variable side is the people.',
      },
      {
        number: '1×',
        unit: '/ yr',
        label: 'FIXED — SET AT RENEWAL',
        body: 'Stop-loss, network, admin, broker. Priced once a year. Locked.',
      },
      {
        number: '1/12',
        label: 'BOOKED MONTHLY',
        body: 'The fixed half divided into twelve. Predictable cash-flow on one side; the variable side follows the workforce.',
      },
    ],
  },

  sections: [
    {
      eyebrow: '// 50K',
      heading: 'Where Your Premium Actually Goes',
      body: `<p>Every dollar you pay in health insurance splits into three buckets. About 75 to 85 cents goes to actual claims — the doctor visits, prescriptions, and hospital stays your employees use. About 10 to 15 cents goes to administration — the carrier processing claims, running customer service, and managing the network. The rest is profit and risk margin — what the carrier charges for taking on your group's risk.</p>
<p>Most leadership teams have never seen these three buckets called out. Once you do, you can see exactly where the money is going and where there is room to push back.</p>
<p><strong>Most brokers negotiate on the total renewal number. We break it apart and address each bucket independently.</strong></p>`,
      callout: '[ TODO: 3-layer cost breakdown pie chart — streamId TBD ]',
    },
    {
      eyebrow: '// 30K',
      heading: 'Why Your Renewal Went Up',
      body: `<p>Your renewal is not random. Five things drive it.</p>
<p><strong>Claims experience</strong> — what your group actually cost the carrier last year. If your employees used a lot of healthcare, the carrier wants more next year.</p>
<p><strong>Medical trend</strong> — healthcare inflation, usually 6 to 8 percent every year, no matter what. Even if your claims were low, this alone bumps your renewal.</p>
<p><strong>Plan design</strong> — your deductibles (what employees pay before insurance kicks in), copays (the fixed amount per visit), and out-of-pocket max (the ceiling on what any one employee pays in a year).</p>
<p><strong>Demographics</strong> — the age and gender mix of your workforce. Older workforce, higher baseline cost.</p>
<p><strong>Network</strong> — which hospitals and doctors are in your plan. Some networks cost more than others.</p>
<p>Knowing what moved gives you ammunition at the negotiating table. Without it, you are just accepting a number.</p>`,
      callout: '[ TODO: renewal drivers breakdown — streamId TBD ]',
    },
    {
      eyebrow: '// 10K',
      heading: 'Three Ways to Pay for Health Benefits',
      body: `<p>There are three funding strategies. Most companies do not realize they have a choice.</p>
<p><strong>Fully Insured</strong> — The traditional way. You pay one fixed price per employee per month. The insurance company takes all the risk. If claims come in low, the carrier keeps the savings. If they come in high, the carrier eats the loss. Best for small companies (under 50 employees) or anyone who wants zero surprises.</p>
<p><strong>Level Funded</strong> — A hybrid. You pay a fixed monthly amount that covers expected claims plus a safety net called stop-loss insurance (stop-loss is like the safety net at a circus — it only catches you if you fall). If actual claims come in low, you get a refund at the end of the year. If they come in high, the safety net covers the excess. Best for healthy groups between 25 and 200 employees.</p>
<p><strong>Self-Insured</strong> — Your company pays claims directly as they happen, plus stop-loss for catastrophic claims. No carrier profit margin sitting on top of base claims. Full transparency — you see every dollar. Best for groups with 100 or more employees and a stable claims history.</p>
<p>The right choice depends on your size, your claims pattern, and how much risk you can absorb.</p>`,
      callout: '[ TODO: funding strategy comparison — streamId TBD ]',
    },
    {
      eyebrow: '// 5K',
      heading: 'How We Actually Show You the Numbers',
      body: `<p>Most brokers show you two or three quotes and tell you to pick one. We do something different.</p>
<p>We run thousands of scenarios using your actual data — your claims history, your demographics, your plan design — and model what your costs could look like under each funding strategy and each market condition. This is called Monte Carlo simulation. Instead of one number you have to trust, you get a range: what is most likely to happen, what is the best case, what is the worst case, and how each funding strategy holds up across all of them.</p>
<p>You are not guessing. You are making a decision based on probabilities. That is the difference between "I think this will save you money" and "here is the math."</p>`,
      callout: 'Same data. Different question. Most brokers ask "what\'s the cheapest quote?" We ask "what\'s the most likely outcome — and what does it look like under stress?"',
    },
  ],
  vocabulary: {
    heading: 'Words That Will Come Up',
    intro:
      'Insurance has its own language. Here are the terms you\'ll hear in our meetings, in plain English. None of these are tests — they\'re just so we can have a real conversation.',
    tableHtml: `<div class="comparison-table">
  <table>
    <thead>
      <tr><th>Term</th><th>Plain English</th></tr>
    </thead>
    <tbody>
      <tr><td><strong>TPA (Third Party Administrator)</strong></td><td>The company that pays your medical claims for you when you self-insure. Not the insurance company — a separate company you pay to handle the paperwork.</td></tr>
      <tr><td><strong>PPO Network</strong></td><td>A list of doctors and hospitals that have agreed to discounted prices. Your employees pay less when they use a doctor on the list. Stands for Preferred Provider Organization.</td></tr>
      <tr><td><strong>Reference Based Pricing (RBP)</strong></td><td>Instead of paying whatever the hospital charges, you pay a number based on Medicare's rate (usually 120–200% of Medicare). The hospital can fight it, but most won't.</td></tr>
      <tr><td><strong>MAP (Manufacturer Assistance Program)</strong></td><td>Drug companies often have programs that give expensive medications free or cheap to qualifying patients. Most companies don't know to ask. We do.</td></tr>
      <tr><td><strong>340B</strong></td><td>A federal program that lets certain hospitals and clinics buy drugs at a steep discount. If your employee gets care at a 340B-eligible facility, the drug cost can drop dramatically.</td></tr>
      <tr><td><strong>International Pharmacy</strong></td><td>For some specialty drugs (especially the very expensive ones), the same medication is legally available from licensed Canadian, UK, or Australian pharmacies for a fraction of the U.S. price.</td></tr>
      <tr><td><strong>501R</strong></td><td>An IRS rule that requires nonprofit hospitals to offer financial assistance to patients who can't afford their bill. Most patients never know to ask. We do.</td></tr>
      <tr><td><strong>Fully Insured</strong></td><td>The traditional way. You pay one fixed price per employee per month. The insurance company takes all the risk and keeps any savings.</td></tr>
      <tr><td><strong>Self-Insured (Self-Funded)</strong></td><td>Your company pays claims directly as they happen, plus a safety net for catastrophic claims. No carrier profit margin sitting on top. Full transparency on every dollar.</td></tr>
      <tr><td><strong>Traditional Stop Loss</strong></td><td>The safety net for self-insurance. If any one employee racks up more than a set amount (specific stop loss), or if total claims cross a threshold (aggregate stop loss), an insurance policy steps in and pays the rest.</td></tr>
      <tr><td><strong>Level Funding</strong></td><td>A hybrid between fully insured and self-insured. You pay a fixed monthly amount that covers expected claims plus stop-loss insurance. If claims come in low, you get a refund. If they come in high, the safety net covers it.</td></tr>
      <tr><td><strong>Captive</strong></td><td>Several companies pool together and form their own insurance company. The pool pays the claims. Less premium going to a big carrier. More control, more transparency, more sophistication required.</td></tr>
      <tr><td><strong>Fixed Expenses</strong></td><td>The benefits costs that stay the same every month no matter what — stop-loss premium, dental, vision, life, employee assistance. You can budget for these to the dollar.</td></tr>
      <tr><td><strong>Variable Expenses</strong></td><td>The benefits costs that move with what your employees actually use — medical claims, pharmacy claims. These can swing month to month.</td></tr>
    </tbody>
  </table>
</div>`,
    callout: 'You can\'t stop claims. You can manage the cost.',
  },
  footerCrossLink: {
    href: 'https://insuranceinformatics.com',
    label: 'Visit insuranceinformatics.com to see how this connects to the data side →',
  },
  schemas: [
    {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'SVG Agency',
      description: 'Insurance, Explained for Leadership',
      url: 'https://svg.agency/',
      parentOrganization: {
        '@type': 'Organization',
        name: 'SVG Agency LLC',
      },
    },
  ],
};
