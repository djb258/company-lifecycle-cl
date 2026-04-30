import type { WebsitePage } from '../types';

export const bookPage: WebsitePage = {
  slug: '/book',
  seo: {
    title: 'Book 15 Minutes — SVG Agency',
    description:
      'Schedule a fifteen-minute call with SVG Agency. No pitch. Just plain-language answers about your insurance program.',
    canonical: 'https://svg.agency/book',
  },
  hero: {
    headline: 'Book 15 Minutes',
    subhead:
      'Pick a time that works. We will pull up your program and walk through it in plain language.',
    ctaLabel: 'Open Booking Calendar',
    ctaHref: 'https://calendar.app.google/QECAsVikVsthXspa8',
  },
  sections: [
    {
      heading: 'What to expect',
      body: `<p>Fifteen minutes on a video or phone call. No slides. No pitch deck. You tell us what you are currently paying and what you are worried about. We tell you what we see and what questions you should be asking before your next renewal.</p>
<p>If there is a fit to work together long-term, we will talk about that. But the fifteen minutes is useful on its own — even if you stay with your current broker.</p>`,
    },
  ],
};
