import type { WebsitePage } from '../types';
import { hubSpokeDiagram, paradigmShiftDiagram } from '../diagrams';

export const homePage: WebsitePage = {
  slug: '/',
  ctbAltitude: '50K',
  seo: {
    title: 'Insurance Informatics — The Named Discipline | insuranceinformatics.com',
    description: 'Insurance Informatics merges 25 years of IT data architecture with 25 years of insurance operations into one closed-loop system. One hub. Two bills. Zero commission.',
    canonical: 'https://insuranceinformatics.com/',
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
      name: 'Insurance Informatics — The Named Discipline | insuranceinformatics.com',
      description: 'Insurance Informatics merges 25 years of IT data architecture with 25 years of insurance operations into one closed-loop system. One hub. Two bills. Zero commission.',
      url: 'https://insuranceinformatics.com/',
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
    headline: 'Insurance Informatics',
    subhead: 'Health benefits, run by an operating system. One hub. Two bills. Zero commission.',
    ctaLabel: 'Book 15 Minutes',
  },
  sections: [
    {
      heading: 'A Named Discipline — Not a Brand',
      body: '<p>Insurance Informatics sits alongside medical informatics and clinical informatics. It merges IT data architecture with insurance operations into one system you can measure.</p><p>Your healthcare vendors are each running in their own lane. None of them talk to each other. We connect everything into one place.</p>',
    },
    {
      heading: 'One Hub. Every Vendor. Two Bills.',
      diagram: hubSpokeDiagram,
      body: '<p>We sit in the middle — pulling 10 or more vendors into one view. You see exactly two numbers each month. One fixed bill from us. One claims bill from the company that pays your medical claims. No vendor chasing. No surprise invoices.</p>',
    },
    {
      heading: 'How Your Data Flows: IMO',
      body: '<p>We call it <strong>IMO</strong> — Input, Middle, Output. Every piece of data follows the same three steps.</p>',
      bullets: [
        'Input — vendors send claims, enrollment, eligibility, and bills into the hub.',
        'Middle — our system cleans it, organizes it, and runs the rules. This is where the work happens.',
        'Output — you get two bills, five dashboards, and the numbers you need to make decisions.',
      ],
      callout: 'Same three steps. Every time. That\'s what a system looks like — not a stack of disconnected vendors.',
    },
    {
      heading: 'The Paradigm Shift',
      diagram: paradigmShiftDiagram,
      callout: 'Your data. Our system. One layer that gets more useful every month.',
    },
    {
      heading: 'The Math Does the Talking',
      bullets: [
        '84% of technology leaders say unifying their data is their top priority.',
        'Zero commission. One flat monthly fee per employee. We\'re on your side.',
        'Every month of data makes the system more valuable to you.',
        'We keep clients because we\'re useful — not because of a contract.',
      ],
      callout: '15 minutes. Four videos. The math does the talking.',
    },
    {
      heading: 'Common Questions',
      body: '<p><strong>Do I have to switch insurance carriers?</strong><br>No. We change the plumbing, not the insurance. You can keep the carrier you have.</p><p><strong>How long does setup take?</strong><br>Year 1 is a soft transition — we copy your existing employees over and start collecting data. Year 2 is full open enrollment. No re-enrollment, no employee confusion.</p><p><strong>What if I want to leave?</strong><br>You can walk any time. No contract. No broker-of-record letter. No exit penalty.</p><p><strong>Does this replace my insurance?</strong><br>No. We don\'t sell insurance. We run the operating system that manages it.</p>',
    },
  ],
};
