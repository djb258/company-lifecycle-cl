import type { WebsitePage } from '../types';
import { ruleOfTwosDiagram, hubSpokeDiagram, twoAggregatorsDiagram } from '../diagrams';

export const howItWorksPage: WebsitePage = {
  slug: '/how-it-works',
  ctbAltitude: '40K–30K',
  seo: {
    title: 'How Insurance Informatics Works | Two Sides, Two Bills, One Hub',
    description: 'Insurance Informatics splits insurance into fixed costs and variable costs, manages 10+ vendors through one hub, and runs two separate systems for the 90% routine and 10% high-dollar employees.',
    canonical: 'https://insuranceinformatics.com/how-it-works',
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
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'dbarton@svg.agency',
        contactType: 'customer service',
      },
      sameAs: [''],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'How Insurance Informatics Works | Two Sides, Two Bills, One Hub',
      description: 'Insurance Informatics splits insurance into fixed costs and variable costs, manages 10+ vendors through one hub, and runs two separate systems for the 90% routine and 10% high-dollar employees.',
      url: 'https://insuranceinformatics.com/how-it-works',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      name: 'Insurance Informatics',
      serviceType: 'Insurance Informatics consulting',
      areaServed: 'United States',
      url: 'https://insuranceinformatics.com',
    },
  ],
  hero: {
    headline: 'How It Works',
    subhead: 'Two sides. Two bills. One hub. The structure is simple — the execution is where everyone else falls short.',
    ctaLabel: 'Book 15 Minutes',
  },
  sections: [
    {
      heading: 'The Two Sides of Insurance',
      body: '<p>When your company pays its own medical claims directly — instead of buying a fully-insured plan — you have two cost buckets.</p><p><strong>Fixed costs</strong> — the safety net that caps big claims, life insurance, dental, vision, employee assistance, and more. Could be 8 to 12 separate vendors, each with their own bill. We roll all of that into one invoice.</p><p><strong>Variable costs</strong> — what your company pays for hospital and doctor claims, plus pharmacy claims. Two separate money flows.</p>',
      diagram: twoAggregatorsDiagram,
    },
    {
      heading: 'The Hub-and-Spoke',
      body: '<p>We sit in the middle. Every vendor connects to the hub — not to each other, not directly to you. One connection point. One shared place where all the numbers live. One view.</p><p>The company that pays your medical claims only sees its own piece. We see everything. That is the difference.</p>',
      diagram: hubSpokeDiagram,
    },
    {
      heading: 'The Rule of Twos',
      body: '<p>Your employees split into two groups. Each group needs a completely different system:</p>',
      diagram: ruleOfTwosDiagram,
    },
    {
      heading: 'How the Money Actually Flows',
      body: '<p>The two claim types move money in opposite directions:</p>',
      bullets: [
        'Hospital and doctor claims: Visit happens → bill arrives later → we fix the bill → you pay. Reactive.',
        'Pharmacy claims: Employee swipes their card → pharmacy is paid first → you are billed later. The pharmacy middleman fronts the money.',
        'The safety net (stop loss): Caps how much you pay on any one person and in total.',
      ],
      callout: 'Most owners have never seen this laid out clearly. That\'s by design — complexity keeps you dependent.',
    },
    {
      heading: 'Enrollment Is the Front Door',
      body: '<p>Enrollment is not paperwork. It is the first step of claims management. We collect the standard information plus extra questions that high-cost vendors will need later. By the time a major claim comes in, we already have what we need.</p>',
      bullets: [
        'Standard info pushed to all vendors through the hub',
        'Extra questions built in for future high-cost situations',
        'One clean record per employee — no duplicates, no gaps',
        'The 10% high-cost process is ready before any claim ever fires',
      ],
    },
  ],
};
