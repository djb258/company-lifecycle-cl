import type { WebsitePage } from '../types';

export const aboutPage: WebsitePage = {
  slug: '/about',
  ctbAltitude: '50K',
  seo: {
    title: 'Dave Barton | Founder of Insurance Informatics',
    description: 'Dave Barton created Insurance Informatics — the merger of 25 years in IT data architecture with 25 years in insurance operations. Not a broker. An operational layer.',
    canonical: 'https://insuranceinformatics.com/about',
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
      name: 'Dave Barton | Founder of Insurance Informatics',
      description: 'Dave Barton created Insurance Informatics — the merger of 25 years in IT data architecture with 25 years in insurance operations. Not a broker. An operational layer.',
      url: 'https://insuranceinformatics.com/about',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Dave Barton',
      jobTitle: 'General Agent and Orchestrator, Insurance Informatics',
      email: 'dbarton@svg.agency',
      url: 'https://insuranceinformatics.com/about',
      worksFor: {
        '@type': 'Organization',
        name: 'SVG Agency LLC',
      },
      sameAs: [''],
    },
  ],
  hero: {
    headline: 'About Dave Barton',
    subhead: '25 years IT. 25 years insurance. One discipline that didn\'t exist before.',
    ctaLabel: 'Book 15 Minutes',
  },
  sections: [
    {
      heading: 'The Genesis of Insurance Informatics',
      body: '<p>Medical informatics exists. Clinical informatics exists. Insurance informatics didn\'t — until Dave built it.</p><p>The IT career taught the data architecture: how to build systems that aggregate, normalize, and warehouse information from dozens of disconnected sources into one queryable view. The insurance career taught what questions to ask and where the money actually leaks.</p><p>Put them together and you get a discipline where the data infrastructure IS the product — not a bolt-on, not an afterthought.</p>',
    },
    {
      heading: 'A General Agent and Orchestrator — Not a Broker',
      body: '<p>Dave is licensed as a general agent. Operationally, the role is orchestrator — the conductor of the whole stack. Not a salesperson. Not a vendor in the lineup. The person who connects everything and runs the system day-to-day.</p><p>There is no contract that locks you to one broker. No commission from any insurance company. No hidden money from vendor overrides. One flat monthly fee per employee. Same fee whether your premium goes up or down.</p>',
      callout: 'Traditional brokers are paid by the insurance company — their commission rises with your premium. We are paid by you on a flat fee. Whether costs go up or down, our number stays the same. No commission. No conflict. Just clean math.',
    },
    {
      heading: 'Bloomberg for Healthcare',
      body: '<p>Think of what Bloomberg did for financial data — aggregating thousands of data sources into one terminal that traders can\'t live without. Insurance Informatics does the same for employer healthcare data.</p><p>Every vendor feed, every claims file, every enrollment record, every bill — aggregated into one data warehouse that the CFO, HR, underwriting, and service teams all read from. Different views, same source of truth.</p>',
    },
    {
      heading: 'The MDM Bridge',
      body: '<p>For CIOs: Insurance Informatics is Master Data Management applied to healthcare benefits. One golden record per employee. One hub connecting every vendor. One data warehouse with one version of the truth.</p><p>If you\'re a CIO who\'s spent years trying to unify your core business data, imagine a vendor who shows up with the same philosophy for your benefits stack — already built, already running.</p>',
    },
  ],
};
