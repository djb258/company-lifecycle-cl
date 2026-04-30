import type { WebsitePage } from '../types';
import { duckDiagram, twoAggregatorsDiagram } from '../diagrams';

export const executivesPage: WebsitePage = {
  slug: '/executives',
  ctbAltitude: '40K',
  seo: {
    title: 'Insurance Informatics for CEOs and CFOs | Two Bills, One Dashboard, Zero Commission',
    description: 'For CEOs and CFOs: Insurance Informatics delivers two consolidated bills, one real-time dashboard, zero commission, and the compounding cost gap that grows in your favor every year.',
    canonical: 'https://insuranceinformatics.com/executives',
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
      name: 'Insurance Informatics for CEOs and CFOs | Two Bills, One Dashboard, Zero Commission',
      description: 'For CEOs and CFOs: Insurance Informatics delivers two consolidated bills, one real-time dashboard, zero commission, and the compounding cost gap that grows in your favor every year.',
      url: 'https://insuranceinformatics.com/executives',
    },
  ],
  hero: {
    headline: 'For Leadership',
    subhead: 'Two bills. One dashboard. Zero commission. The duck looks calm on top — we handle everything underneath.',
    ctaLabel: 'Book 15 Minutes',
  },
  sections: [
    {
      heading: 'The Duck',
      body: '<p>From where you sit, it is simple: two bills, one dashboard, employees are taken care of. That is by design. Underneath, there is a system running 10 or more vendors, two claim flows, bill audits, employee communications, drug reviews, pre-authorizations, and one shared place where all the numbers live.</p>',
      diagram: duckDiagram,
    },
    {
      heading: 'Two Bills. Zero Vendor Chasing.',
      body: '<p>Every month, you see exactly two numbers. One fixed-cost invoice from us. One claims bill from the company that pays your medical claims. No chasing 8 vendors for 8 invoices. No reconciling different portals. One view.</p>',
      diagram: twoAggregatorsDiagram,
    },
    {
      heading: 'The Compounding Gap',
      body: '<p>Two employers start with the same claims. One stays with a traditional broker — their costs compound from a higher base every year. The other works with Insurance Informatics — costs compound from a lower base. After five years, the gap between them is large.</p>',
      callout: 'I am not predicting your claims. I am showing you the mechanics. You are compounding off a higher base. We work to lower that base.',
    },
    {
      heading: 'Zero Commission — Same Side of the Table',
      body: '<p>One flat monthly fee per employee. No commission. No contract that locks you to one broker. No hidden money from insurance companies. When your costs go down, our fee does not change — we have no reason to keep them high.</p>',
      bullets: [
        'Traditional broker: paid by the insurance company. Their incentive points the wrong way.',
        'Insurance Informatics: paid by you. Flat fee. We are on your side.',
        'When incentives are misaligned, the cost shows up in your claims.',
      ],
    },
  ],
};
