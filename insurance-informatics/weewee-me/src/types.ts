// ── JSON-LD structured data schema ──
export interface JsonLdSchema {
  '@context': string;
  '@type': string;
  [k: string]: unknown;
}

// ── Page section ──
export interface PageSection {
  heading: string;
  eyebrow?: string; // e.g. "// 50K"
  body?: string;    // HTML string
  bullets?: string[];
  callout?: string;
  video?: { streamId: string; title: string };
}

// ── Website page ──
export interface WebsitePage {
  slug: string;
  seo: {
    title: string;
    description: string;
    canonical: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterCard?: 'summary' | 'summary_large_image';
  };
  hero: {
    headline: string;
    subhead: string;
    ctaLabel?: string;
    ctaHref?: string;
  };
  sections: PageSection[];
  vocabulary?: {
    heading: string;
    intro: string;
    tableHtml: string;
    callout: string;
  };
  footerCrossLink?: { href: string; label: string };
  schemas?: JsonLdSchema[];
}
