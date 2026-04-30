import type { WebsitePage } from '../types';
import { ruleOfTwosDiagram } from '../diagrams';

export const hrPage: WebsitePage = {
  slug: '/hr',
  ctbAltitude: '10K',
  seo: {
    title: 'Insurance Informatics for HR | From Router to Auditor',
    description: 'For HR teams: Insurance Informatics eliminates the benefits bottleneck. 90% of employee questions route directly to vendors. HR goes from router to auditor.',
    canonical: 'https://insuranceinformatics.com/hr',
    ogImage: '/logos/insurance-informatics-presentation.png',
    twitterCard: 'summary_large_image',
  },
  schemas: [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'SVG Agency LLC',
      url: 'https://insuranceinformatics.com',
      logo: 'https://insuranceinformatics.com/logos/insurance-informatics-horizontal.svg',
      contactPoint: { '@type': 'ContactPoint', email: 'dbarton@svg.agency', contactType: 'customer service' },
      sameAs: [''],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Insurance Informatics for HR | From Router to Auditor',
      description: 'For HR teams: Insurance Informatics eliminates the benefits bottleneck. 90% of employee questions route directly to vendors. HR goes from router to auditor.',
      url: 'https://insuranceinformatics.com/hr',
    },
  ],
  hero: {
    headline: 'For the Client Team',
    subhead: 'You stop being the one who routes every question. You become the one who checks that the system is working.',
    ctaLabel: 'Book 15 Minutes',
  },
  sections: [
    {
      heading: 'The 90% — Self-Serve',
      body: '<p>90% of employees have routine questions. Dental. Vision. Life insurance. Today, all of those come through your team. With Insurance Informatics, employees submit a ticket and it goes straight to the right vendor.</p>',
      bullets: [
        'Employee submits a ticket — it routes directly to the vendor for that benefit',
        'Dental question goes to the dental vendor. Vision question goes to the vision vendor.',
        'No manual routing through your team. The system handles it. You oversee.',
        'Traditional brokers stay in the middle of every question. We take them out of the routine loop.',
      ],
      callout: 'Here\'s your card. Go live your life. That\'s what the 90% looks like.',
    },
    {
      heading: 'The 10% — Managed Closely',
      body: '<p>When a big claim comes in — cancer, major surgery, specialty medication — a dedicated case manager takes over. Not your team. You get notified, but the process runs through us.</p>',
      bullets: [
        'Communication to the employee goes out under your company name',
        'Case manager reaches out to the employee and collects what is needed',
        'Routes to the right process — hospital or pharmacy',
        'Someone follows up with the employee after the process wraps',
        'You see it on your dashboard — but you do not have to chase it',
      ],
      diagram: ruleOfTwosDiagram,
    },
    {
      heading: 'Five Dashboards — Including Yours',
      body: '<p>Every role gets its own view of the same data:</p>',
      bullets: [
        'Operations Dashboard — enrollment, employee status, census, compliance',
        'Leadership Dashboard — two bills, total spend, savings, fixed vs variable',
        'Underwriting Dashboard — claims data, risk analysis',
        'Renewal Dashboard — what was spent, what was saved',
        'Service Advisor Dashboard — open cases, process status',
      ],
      callout: 'Same data. Different views. Leadership sees dollars. Operations sees people. Underwriting sees risk.',
    },
    {
      heading: 'One Benefits Page for Employees',
      body: '<p>Every employee has one page to see all their benefits:</p>',
      bullets: [
        'Benefits summary — what they have and how to use it',
        'Ticket submission — questions go directly to the right vendor',
        'Self-serve. 90% of employees never need to call anyone.',
      ],
    },
    {
      heading: 'Getting Started — No Disruption',
      body: '<p><strong>Year 1:</strong> We copy your existing employees over. New cards are issued — same benefits, different plumbing. No re-enrollment. No confusion. The system starts collecting data from day one.</p><p><strong>Year 2:</strong> Full enrollment opens. The Rule of Twos plan design goes live. High-cost management is fully running. Year 1 data drives Year 2 decisions.</p>',
      callout: 'Switching sounds like a nightmare. It is not. Year 1 is quiet. Year 2 is where it opens up.',
    },
  ],
};
