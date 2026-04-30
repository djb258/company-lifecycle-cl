import type { WebsitePage } from '../types';
import { hubSpokeDiagram } from '../diagrams';

export const vendorsPage: WebsitePage = {
  slug: '/vendors',
  ctbAltitude: '40K–20K',
  seo: {
    title: 'Insurance Informatics for Vendors | Integrate Once, Get All Clients',
    description: 'For insurance vendors: Insurance Informatics offers many-to-one integration. Connect to the hub once and access all clients. Two contacts per vendor. We don\'t replace your process — we put structure in front.',
    canonical: 'https://insuranceinformatics.com/vendors',
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
      name: 'Insurance Informatics for Vendors | Integrate Once, Get All Clients',
      description: 'For insurance vendors: Insurance Informatics offers many-to-one integration. Connect to the hub once and access all clients. Two contacts per vendor. We don\'t replace your process — we put structure in front.',
      url: 'https://insuranceinformatics.com/vendors',
    },
  ],
  hero: {
    headline: 'For Vendors',
    subhead: 'Connect once. Reach all clients. We are not replacing your process — we are putting structure in front of it.',
    ctaLabel: 'Book 15 Minutes',
  },
  sections: [
    {
      heading: 'Connect Once, Reach All Clients',
      body: '<p>Old model: every vendor connects to every client separately. Multiply vendors times clients and the number of connections gets unmanageable fast.</p><p>Insurance Informatics model: vendors connect to the hub once. The hub connects to every client. Far fewer moving parts.</p>',
      diagram: hubSpokeDiagram,
    },
    {
      heading: 'Two Contacts Per Vendor',
      body: '<p>Every vendor works with exactly two people from our team:</p>',
      bullets: [
        'Account Manager — handles the relationship. Escalations, contract questions, strategy.',
        'Customer Service — handles the day-to-day. Routine tickets, claim status, employee questions.',
        'On big claims, the case manager and account manager work together — fast handoffs, nothing dropped.',
        'The ticketing system routes routine questions directly to customer service.',
      ],
    },
    {
      heading: 'Where You Fit',
      body: '<p>The top 10% of employees drive most of the claims cost. That is where specialized vendors make the biggest difference. Our case manager packages what they need and routes it to the right vendor at the right step.</p>',
      bullets: [
        'Hospital claims: PPO network → we benchmark against Medicare rates → financial assistance programs',
        'Drug claims: Manufacturer assistance programs → lower-cost pharmacy options → federal discount programs',
        'You get clean intake data. You run your process. You send results back.',
        'We show the outcome on the client\'s dashboard.',
      ],
    },
    {
      heading: 'Volume Without the Sales Cycle',
      body: '<p>Every client we bring on flows through your connection. One setup. Growing volume. No per-client sales effort on your side — just execution.</p>',
      callout: 'We do not replace your process. We put structure in front of it and volume behind it.',
    },
  ],
};
