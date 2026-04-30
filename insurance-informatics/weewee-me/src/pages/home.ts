import type { WebsitePage } from '../types';

export const homePage: WebsitePage = {
  slug: '/',
  seo: {
    title: 'WeeWee.Me — Automation, Explained for Leadership',
    description:
      'Automation is not magic. It is just software doing repetitive work so your people do not have to. WeeWee.Me explains it in plain language.',
    canonical: 'https://weewee.me/',
    ogTitle: 'WeeWee.Me — Automation, Explained for Leadership',
    ogDescription:
      'Stop guessing. Start understanding. WeeWee.Me explains what your IT team is actually building and why it matters to your bottom line.',
    twitterCard: 'summary_large_image',
  },
  hero: {
    headline: 'Your Automation Program, Finally Explained',
    subhead:
      'Most executives approve IT projects without fully understanding what they bought. We fix that — in plain language, before the next deployment.',
    ctaLabel: 'Book 15 Minutes',
    ctaHref: 'https://calendar.app.google/QECAsVikVsthXspa8',
  },
  sections: [
    {
      eyebrow: '// 50K',
      heading: 'Three Steps. Every Time.',
      body: `<p>Every single thing your business does — every benefit decision, every renewal, every employee question — follows the same three steps. Something goes IN. Something happens in the MIDDLE. Something comes OUT. We call this <strong>IMO</strong> — Input, Middle, Output.</p>
<p>The input is data: enrollment lists, claims, eligibility, bills. The middle is the system that cleans it, organizes it, and runs the rules. The output is what you actually use: dashboards, decisions, clean bills, renewal numbers.</p>
<p>Most companies treat their benefits like a folder full of paper. We treat them like a system. Three steps. Every time.</p>`,
      callout: '[ TODO: IMO flow diagram — streamId TBD ]',
    },
    {
      eyebrow: '// 30K',
      heading: 'One Place Every Vendor Talks To',
      body: `<p>Old way: every benefits vendor talks to every other vendor and to you separately. Multiply 10 vendors by 200 employees and you get a tangled mess of phone calls, emails, and spreadsheets.</p>
<p>New way: every vendor talks to ONE central place — call it the hub. The hub talks to you. We call this <strong>hub-and-spoke</strong>. The vendors keep doing their job. The hub takes care of getting everything where it needs to go.</p>
<p>For HR, that means one ticketing system instead of a dozen vendor portals. For the CFO, that means one consolidated view instead of 10 separate invoices. Same data flowing — just routed through one place that is actually keeping track.</p>`,
      callout: '[ TODO: hub-and-spoke diagram — streamId TBD ]',
    },
    {
      eyebrow: '// 10K',
      heading: 'The Master File: One Clean Record Per Employee',
      body: `<p>Last week we told a Chief Technology Officer he needed a master file for his enrollment, then match every vendor's records to it. He did not have words for what we were describing. He is not wrong — almost nobody applies this thinking to health benefits data.</p>
<p>A <strong>master file</strong> is one clean, trustworthy record per employee — the source of truth that everything else points back to. <strong>Matching</strong> is comparing what each vendor says about that employee against the master file and fixing the gaps.</p>
<p>That is how you go from "which spreadsheet is right?" to one answer everyone can trust. Every renewal, every audit, every vendor question — it all comes back to one master record. Without it, you are rebuilding the answer every time you ask the question.</p>`,
      callout: '[ TODO: master file matching diagram — streamId TBD ]',
    },
    {
      eyebrow: '// 5K',
      heading: 'What Happens in Real Time',
      body: `<p>An employee fills a prescription. The pharmacy swipes the card. In milliseconds — way before the transaction finishes — the system checks: Is this person eligible? What plan are they on? What is their copay? Any flagged drug interactions? Was this prescription pre-approved?</p>
<p>The pharmacy gets a yes-or-no in under a second. The transaction is logged. The cost gets allocated. The dashboard updates. That whole sequence happens whether you can see it or not. We make it visible.</p>
<p>Same swipe. Different oversight. We process this kind of decision across our client base — without anyone having to call anyone. That is what an operating system does.</p>`,
      callout: 'We track 32,000+ companies, 109,000+ contacts, and 171,000+ government benefit filings — not to impress you, but because that data tells us exactly what a company like yours should be paying for coverage. And whether you are.',
    },
  ],
  vocabulary: {
    heading: 'Words That Will Come Up',
    intro:
      'The data side has its own language too. These are the terms that come up when we talk about how the system actually works. None are technical — they just have specific meanings.',
    tableHtml: `<div class="comparison-table">
  <table>
    <thead>
      <tr><th>Term</th><th>Plain English</th></tr>
    </thead>
    <tbody>
      <tr><td><strong>IMO (Input → Middle → Output)</strong></td><td>Every process has three steps. Something goes IN. Something happens in the MIDDLE. Something comes OUT. We use this to break down any task — from a single claim to an entire renewal — into the same three steps.</td></tr>
      <tr><td><strong>CTB (Christmas Tree Backbone)</strong></td><td>A way to organize information from big-picture down to detail. The trunk is the whole business. Branches are each major area (benefits, payroll, etc.). Leaves are the specific details. Like a Christmas tree — you can see the trunk, the branches, and every leaf, all at once.</td></tr>
      <tr><td><strong>Altitude</strong></td><td>A way of zooming in and out. 50,000 feet is the strategic view (the whole business). 30,000 feet is tactical (each major area). 10,000 feet is operational (how it actually runs). 5,000 feet is execution (the moment a single thing happens). When we say "let's go to 10K," we mean look at the operational layer.</td></tr>
      <tr><td><strong>API (Application Programming Interface)</strong></td><td>A live connection that lets two systems talk to each other in real time. Like a phone line that's always open. When something changes on one side, the other side knows immediately. This is how modern systems share data.</td></tr>
      <tr><td><strong>SFTP (Secure File Transfer Protocol)</strong></td><td>Old technology. One system writes a file (usually overnight), the other system downloads it the next morning. The data is always at least a day old. Most legacy benefits vendors still work this way. It's how we used to do it 20 years ago.</td></tr>
      <tr><td><strong>API vs SFTP</strong></td><td>The whole industry is moving from SFTP (old, slow, file-based, one-day-late) to APIs (modern, instant, live). When you ask a vendor "is this an API?" and they say yes, you get real-time data. When they say SFTP, you're getting yesterday's news. Same data — completely different timing.</td></tr>
    </tbody>
  </table>
</div>`,
    callout: 'Old systems send you yesterday\'s news. Modern systems read the table while it\'s still being written.',
  },
  footerCrossLink: {
    href: 'https://insuranceinformatics.com',
    label: 'Visit insuranceinformatics.com to see how this connects to the data side →',
  },
  schemas: [
    {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'WeeWee.Me',
      description: 'Automation, Explained for Leadership',
      url: 'https://weewee.me/',
      parentOrganization: {
        '@type': 'Organization',
        name: 'SVG Agency LLC',
      },
    },
  ],
};
