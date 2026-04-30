import { useState } from 'react';

function FamilyBar() {
  return (
    <div className="family-bar">
      <span className="family-bar__glyph">//</span>
      <a href="https://insuranceinformatics.com/" className="family-bar__link">insuranceinformatics.com</a>
      <span className="family-bar__sep">·</span>
      <a href="https://svg.agency/" className="family-bar__link">svg.agency</a>
      <span className="family-bar__sep">·</span>
      <span className="family-bar__current">weewee.me</span>
    </div>
  );
}

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/book', label: 'Book 15 Minutes' },
];

export function Navigation() {
  const [open, setOpen] = useState(false);
  const current = (window.location.pathname.replace(/\/$/, '') || '/');

  return (
    <>
      <FamilyBar />
      <nav className="site-nav" role="navigation" aria-label="Main navigation">
      <div className="nav-inner">
        <a href="/" className="nav-brand" aria-label="WeeWee.Me home">
          <img src="/logos/weewee-me-logo.jpg" alt="WeeWee.Me" className="nav-logo" />
        </a>
        <button
          className="nav-toggle"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
        </button>
        <ul className={`nav-links ${open ? 'nav-links--open' : ''}`}>
          {NAV_LINKS.map(link => (
            <li key={link.href}>
              <a
                href={link.href}
                className={`nav-link ${current === link.href ? 'nav-link--active' : ''} ${link.href === '/book' ? 'nav-link--cta' : ''}`}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
    </>
  );
}
