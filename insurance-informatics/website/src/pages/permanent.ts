import type { WebsitePage } from '../types';
import { dataMoatDiagram } from '../diagrams';

export const permanentPage: WebsitePage = {
  slug: '/permanent',
  ctbAltitude: '5K',
  seo: {
    title: 'Why Insurance Informatics Compounds | Year-Over-Year Value',
    description: 'Every month, the system builds more value — accumulated data, tighter vendor connections, deeper renewal leverage. No BOR. No contracts. No exit penalties. The system earns its place by being more useful, not by writing terms that hold you in place.',
    canonical: 'https://insuranceinformatics.com/permanent',
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
      name: 'Why Insurance Informatics Compounds | Year-Over-Year Value',
      description: 'Every month, the system builds more value — accumulated data, tighter vendor connections, deeper renewal leverage. No BOR. No contracts. No exit penalties. The system earns its place by being more useful, not by writing terms that hold you in place.',
      url: 'https://insuranceinformatics.com/permanent',
    },
  ],
  hero: {
    headline: 'Why It Compounds',
    subhead: 'Every month, the system gets more useful. Not because of a contract — because the data keeps building. We earn our place at renewal by being more valuable, not by writing terms that hold you in.',
    ctaLabel: 'Book 15 Minutes',
  },
  sections: [
    {
      heading: 'Every Month Builds More Value',
      body: '<p>The longer the system runs, the more useful it becomes. Enrollment data grows. Claims history deepens. Savings get tracked. Vendor relationships tighten. Renewal becomes a numbers conversation — not a guess.</p>',
      diagram: dataMoatDiagram,
    },
    {
      heading: 'Year-Over-Year',
      body: '<p>Each year builds on the one before it. Year 1 sets the baseline. Year 2 gives you your own year-over-year numbers to use at renewal. Year 3 and beyond is a depth of data no traditional broker can match — because no one else has been tracking it.</p>',
      bullets: [
        'Year 1 — Baseline built. Vendors connected. Clean data from day one.',
        'Year 2 — Year-over-year trends. Renewal driven by your numbers, not industry guesses.',
        'Year 3+ — Depth that compounds on every vendor negotiation, plan decision, and renewal.',
      ],
    },
    {
      heading: 'One System Built Around Your Business',
      body: '<p>One shared data layer sits between your vendors and your decision-makers. Every vendor feeds into it. Every dashboard reads from it. Every renewal references it. The whole benefits stack ties together — built around your business, not a contract.</p>',
    },
    {
      heading: 'No Contracts. No Lock-In. No Penalties.',
      body: '<p>There is no contract that locks you to one broker. No multi-year commitment. No exit penalty. You can walk any time. We earn our place every month by being more useful than what you had before.</p>',
      callout: 'Take our numbers to any broker. Compare line by line. We invite the comparison — that\'s the whole point of putting it in writing.',
    },
  ],
};
