import { useEffect } from 'react';
import { Navigation } from './Navigation';
import type { WebsitePage } from '../types';

interface WebsiteLayoutProps {
  page: WebsitePage;
}

function sendEvent(eventName: string, communicationId: string) {
  const payload = JSON.stringify({
    event_name: eventName,
    sovereign_company_id: 'PUBLIC',
    communication_id: communicationId,
    page_url: window.location.href,
    timestamp: new Date().toISOString(),
  });
  navigator.sendBeacon('https://lcs-hub.svg-outreach.workers.dev/page-event', payload);
}

export function WebsiteLayout({ page }: WebsiteLayoutProps) {
  const communicationId = 'WEB-SVG-AGENCY-HOME';

  useEffect(() => {
    // SEO: title + meta
    document.title = page.seo.title;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.name = name;
        document.head.appendChild(el);
      }
      el.content = content;
    };
    const setProp = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.content = content;
    };
    setMeta('description', page.seo.description);
    if (page.seo.ogTitle) setProp('og:title', page.seo.ogTitle);
    if (page.seo.ogDescription) setProp('og:description', page.seo.ogDescription);
    if (page.seo.ogImage) setProp('og:image', page.seo.ogImage);

    // JSON-LD schemas
    if (page.schemas) {
      page.schemas.forEach((schema, i) => {
        const id = `jsonld-${i}`;
        let el = document.getElementById(id) as HTMLScriptElement | null;
        if (!el) {
          el = document.createElement('script');
          el.id = id;
          el.type = 'application/ld+json';
          document.head.appendChild(el);
        }
        el.textContent = JSON.stringify(schema);
      });
    }

    sendEvent('page_loaded', communicationId);
  }, [page]);

  const BOOKING_URL = 'https://calendar.app.google/QECAsVikVsthXspa8';
  const ctaHref = page.hero.ctaHref ?? BOOKING_URL;

  const handleCtaClick = () => {
    sendEvent('cta_clicked', communicationId);
  };

  return (
    <div className="website">
      <Navigation />

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-mark">//</div>
          <img src="/logos/svg-agency-logo.png" alt="SVG Agency" className="hero-logo" />
          <h1>{page.hero.headline}</h1>
          <p className="hero-sub">{page.hero.subhead}</p>
          {page.hero.ctaLabel && (
            <a
              className="hero-cta"
              href={ctaHref}
              target="_blank"
              rel="noopener"
              onClick={handleCtaClick}
            >
              {page.hero.ctaLabel}
            </a>
          )}
        </div>
      </section>

      {/* Page Sections */}
      <main className="page-sections">
        {page.sections.map((section, idx) => (
          <section key={idx} className="page-section">
            <div className="section-inner">
              {section.eyebrow && (
                <span className="section-eyebrow">{section.eyebrow}</span>
              )}
              <h2>{section.heading}</h2>
              {section.body && (
                <div
                  className="section-body"
                  dangerouslySetInnerHTML={{ __html: section.body }}
                />
              )}
              {section.callout && (
                <div className="section-todo">{section.callout}</div>
              )}
            </div>
          </section>
        ))}
      </main>

      {/* Vocabulary / Glossary */}
      {page.vocabulary && (
        <section className="page-section" style={{ borderBottom: 'none' }}>
          <div className="section-inner">
            <h2>{page.vocabulary.heading}</h2>
            <div className="section-body">
              <p>{page.vocabulary.intro}</p>
            </div>
            <div
              className="section-body"
              dangerouslySetInnerHTML={{ __html: page.vocabulary.tableHtml }}
            />
            <div className="section-todo" style={{ marginTop: '1.5rem' }}>
              <strong>{page.vocabulary.callout}</strong>
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="bottom-cta">
        <div className="bottom-cta-inner">
          <h2>Ready to see it your way?</h2>
          <p>Fifteen minutes. No pitch deck. Just your questions and straight answers.</p>
          <a
            className="hero-cta"
            href={ctaHref}
            target="_blank"
            rel="noopener"
            onClick={handleCtaClick}
          >
            {page.hero.ctaLabel ?? 'Book 15 Minutes'}
          </a>
        </div>
      </section>

      {/* Cross-link */}
      {page.footerCrossLink && (
        <div className="cross-link-section">
          <p>
            <a href={page.footerCrossLink.href}>{page.footerCrossLink.label}</a>
          </p>
        </div>
      )}

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <strong>SVG Agency</strong>
            <p>Shenandoah Valley Group — Insurance, Explained for Leadership</p>
          </div>
          <nav className="footer-links" aria-label="Footer navigation">
            <a href="/">Home</a>
            <a href={BOOKING_URL} target="_blank" rel="noopener">Book a Call</a>
            <a href="https://insuranceinformatics.com">Insurance Informatics</a>
          </nav>
          <p className="footer-copy">
            © {new Date().getFullYear()} SVG Agency LLC. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
