import type { WebsitePage } from '../types';

export const bookPage: WebsitePage = {
  slug: '/book',
  seo: {
    title: 'Book 15 Minutes — WeeWee.Me',
    description:
      'Schedule a fifteen-minute call with WeeWee.Me. No pitch. Just plain-language answers about your automation program.',
    canonical: 'https://weewee.me/book',
  },
  hero: {
    headline: 'Book 15 Minutes',
    subhead:
      'Pick a time that works. We will pull up your roadmap and walk through it in plain language.',
    ctaLabel: 'Open Booking Calendar',
    ctaHref: 'https://calendar.app.google/QECAsVikVsthXspa8',
  },
  sections: [
    {
      heading: 'What to expect',
      body: `<p>Fifteen minutes on a video or phone call. No slides. No pitch deck. You tell us what your IT team is currently building and what you are worried about. We tell you what we see and what questions you should be asking before you approve the next project.</p>
<p>If there is a fit to work together long-term, we will talk about that. But the fifteen minutes is useful on its own — even if your current IT team stays in place.</p>`,
    },
  ],
};
