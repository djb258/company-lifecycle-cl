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

// ── Vocabulary term (for 3-column grid) ──
export interface VocabTerm {
  term: string;
  definition: string;
}

// ── Data strip column ──
export interface DataStripColumn {
  number: string;         // e.g. "100%", "1×", "1/12"
  unit?: string;          // optional mono unit appended
  label: string;          // UI sans uppercase label
  body: string;           // Source Serif body copy
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
  /** Optional data strip — rendered before main sections */
  dataStrip?: {
    eyebrow: string;
    heading: string;
    columns: DataStripColumn[];
  };
  sections: PageSection[];
  vocabulary?: {
    heading: string;
    intro: string;
    /** Structured terms for 3-column grid layout */
    terms: VocabTerm[];
    tableHtml?: string;   // legacy fallback, not used for 3-col render
    callout: string;
  };
  /** Two cross-links: weewee.me (data) + insuranceinformatics.com (integration) */
  footerCrossLinks?: Array<{ href: string; label: string }>;
  /** @deprecated use footerCrossLinks */
  footerCrossLink?: { href: string; label: string };
  schemas?: JsonLdSchema[];
}
