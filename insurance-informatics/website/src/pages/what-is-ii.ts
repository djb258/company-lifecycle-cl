import type { WebsitePage } from '../types';
import { paradigmShiftDiagram } from '../diagrams';

export const whatIsIIPage: WebsitePage = {
  slug: '/what-is-insurance-informatics',
  ctbAltitude: '50K',
  seo: {
    title: 'What Is Insurance Informatics? | The Named Discipline',
    description: 'Insurance Informatics is the named discipline that merges IT data architecture with insurance operations. Not a brand — a category of one. Learn how it works.',
    canonical: 'https://insuranceinformatics.com/what-is-insurance-informatics',
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
      name: 'What Is Insurance Informatics? | The Named Discipline',
      description: 'Insurance Informatics is the named discipline that merges IT data architecture with insurance operations. Not a brand — a category of one. Learn how it works.',
      url: 'https://insuranceinformatics.com/what-is-insurance-informatics',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      name: 'Insurance Informatics',
      serviceType: 'Insurance Informatics consulting',
      areaServed: 'United States',
      url: 'https://insuranceinformatics.com',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is insurance informatics?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Insurance Informatics is a named discipline — like medical informatics or clinical informatics — that merges IT data architecture with insurance operations into one system you can measure. It is not a brand. It is a category of one.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is insurance informatics different from a benefits broker?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A traditional broker is paid by the insurance company through commission. Insurance Informatics charges one flat monthly fee per employee — paid directly by you. No commission. No contract that locks you to one broker. No hidden money. We are on your side of the table.',
          },
        },
        {
          '@type': 'Question',
          name: 'Who is insurance informatics for?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Insurance Informatics is built for employers who pay their own medical claims directly — called self-insured employers. It is designed for leadership and operations teams managing 10 or more benefit vendors who want one view, one fixed bill, and one claims bill.',
          },
        },
        {
          '@type': 'Question',
          name: 'What does "zero commission" mean in practice?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'We earn no money from insurance companies or vendors. You pay one flat monthly fee per employee. There is no hidden money. There is no reason for us to steer you toward any specific vendor or plan.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the Rule of Twos?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Everything in insurance splits into two. Fixed costs and variable costs. One bill from us and one from the company that pays your medical claims. 90% routine employees and 10% high-cost employees. Two contacts per vendor. Two claim types — hospital and pharmacy. The pattern is the constant. The numbers change.',
          },
        },
      ],
    },
  ],
  hero: {
    headline: 'What Is Insurance Informatics?',
    subhead: 'A named discipline — parallel to medical informatics and clinical informatics. Not a brand. A category of one.',
    ctaLabel: 'See How It Works',
    ctaHref: '/how-it-works',
  },
  sections: [
    {
      heading: 'The Genesis: 25 + 25',
      body: '<p>25 years of IT data architecture. 25 years of insurance operations. Put them together and you get a discipline that didn\'t exist before: <strong>Insurance Informatics</strong>.</p><p>Every other broker is chasing price. We build process. The difference shows up at renewal — every year.</p>',
    },
    {
      heading: 'Traditional Brokerage vs Insurance Informatics',
      diagram: paradigmShiftDiagram,
    },
    {
      heading: 'Why It Matters',
      body: '<p>The company that pays your medical claims thinks they are the center of the system. They are not. They see one piece — claims. Insurance Informatics sees both sides (fixed costs and variable costs), runs enrollment from day one, manages your employee communications, and pulls everything into one view.</p>',
      callout: 'Sitting close to the client is what makes this work. Nobody else is in this position.',
    },
    {
      heading: 'The Rule of Twos',
      bullets: [
        'Two sides: Fixed costs (monthly vendors) + Variable costs (claims)',
        'Two bills: One from us. One from the company that pays your medical claims.',
        'Two groups: 90% routine employees (autopilot) + 10% high-cost employees (managed closely)',
        'Two contacts per vendor: Account manager + customer service',
        'Two claim types: Hospital and doctor claims + pharmacy claims',
      ],
      body: '<p>Everything splits into two. The pattern is constant. The numbers change — the structure doesn\'t.</p>',
    },
    {
      heading: 'Zero Commission. One Flat Fee.',
      body: '<p>Your premium is not your cost. Real cost lives in claims, administration, and the gap between data and decisions.</p><p>We charge one flat monthly fee per employee. The insurance company does not pay us. There is no contract that locks you to one broker. No hidden money. We sit on your side of the table.</p>',
      callout: 'Take our number to any broker. Compare it line by line. We invite the comparison — that\'s the whole point of putting it in writing.',
    },
    {
      heading: 'Traditional Broker vs Insurance Informatics',
      body: `
<div class="comparison-table">
  <table>
    <thead>
      <tr><th></th><th>Traditional Broker</th><th>Insurance Informatics</th></tr>
    </thead>
    <tbody>
      <tr><td><strong>How they get paid</strong></td><td>Commission from the insurance company</td><td>Flat monthly fee from you</td></tr>
      <tr><td><strong>What they sell</strong></td><td>Insurance products</td><td>An operating system</td></tr>
      <tr><td><strong>What they manage</strong></td><td>The carrier relationship</td><td>The data, the vendors, and the claims</td></tr>
      <tr><td><strong>What you see each month</strong></td><td>One invoice per vendor (8 to 12 of them)</td><td>Two bills. Total.</td></tr>
      <tr><td><strong>At renewal</strong></td><td>Last year's spreadsheet plus market quotes</td><td>Your own year-over-year numbers</td></tr>
      <tr><td><strong>To leave</strong></td><td>Broker of Record letter required</td><td>No contract. No penalty. Walk any time.</td></tr>
    </tbody>
  </table>
</div>
      `.trim(),
    },
    {
      heading: 'A Category of One',
      body: '<p>Brokers can drop their commission. Brokers can add service reps. Brokers can rebrand. None of those is a competing operating system.</p><p>To match what we do, somebody else has to build a better operating system than the one we are running. Right now, nobody has.</p>',
      callout: 'To compete against me, you need a better operating system than the one I am running. Good luck — I am the only one in the country doing insurance informatics.',
    },
  ],
};
