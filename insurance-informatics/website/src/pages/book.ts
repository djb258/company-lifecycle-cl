import type { WebsitePage } from '../types';

const BOOKING_URL = 'https://calendar.app.google/QECAsVikVsthXspa8';

export const bookPage: WebsitePage = {
  slug: '/book',
  ctbAltitude: '5K',
  seo: {
    title: 'Book a Meeting | Insurance Informatics Consultation',
    description: 'Zero friction. Four short video briefings. Four 15-minute meetings. Book a free consultation to see how Insurance Informatics can reduce your benefits spend.',
    canonical: 'https://insuranceinformatics.com/book',
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
      name: 'Book a Meeting | Insurance Informatics Consultation',
      description: 'Zero friction. Four short video briefings. Four 15-minute meetings. Book a free consultation to see how Insurance Informatics can reduce your benefits spend.',
      url: 'https://insuranceinformatics.com/book',
    },
  ],
  hero: {
    headline: 'See the Math for Yourself',
    subhead: 'No friction. Four short video briefings. Four 15-minute meetings. The numbers do the talking.',
    ctaLabel: 'Book 15 Minutes Now',
    ctaHref: BOOKING_URL,
  },
  sections: [
    {
      heading: 'Four Meetings. No Pressure.',
      body: '<p>No sales pitch. Just math. Four meetings, each 15 to 20 minutes, each building on the last:</p>',
      bullets: [
        'Meeting 1: Fact Finder — we already know your company, your carrier, your broker, your renewal date. We lay it out. You confirm.',
        'Meeting 2: Education — how self-insured plans work vs. traditional plans. Two paths shown side by side over five years.',
        'Meeting 3: Service — five dashboards, the employee page, the ticketing system. What your day-to-day actually looks like.',
        'Meeting 4: Your Numbers — your specific quote, your specific savings. Take it to any broker. Compare line by line.',
      ],
    },
    {
      heading: 'What You Need to Bring',
      body: '<p>One thing: your current benefits bill. That is it. We do the rest.</p>',
      callout: 'You bring the bill. I bring the math.',
    },
    {
      heading: 'What You Walk Away With',
      bullets: [
        'A clear picture of how your health benefits actually work',
        'Your company\'s specific savings projection — based on your numbers, not industry averages',
        'A side-by-side comparison with your current plan\'s total cost',
        'No contract that locks you to one broker. No commitment. No pressure. Just numbers.',
      ],
    },
    {
      heading: 'Book Your First Meeting',
      body: `<p style="text-align:center;margin:2rem 0"><a href="${BOOKING_URL}" style="display:inline-block;padding:1rem 2.5rem;background:#2b6cb0;color:white;text-decoration:none;border-radius:8px;font-size:1.25rem;font-weight:bold">Book 15 Minutes</a></p><p style="text-align:center;color:#718096">Free. No obligation. The math speaks for itself.</p>`,
    },
  ],
};
