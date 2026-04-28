# Domain Architecture — Insurance Informatics
## 18 domains flowing into one canonical: insuranceinformatics.com. Every domain is a spoke. The canonical is the hub. Authority consolidates inward.
### Status: BUILD
### BAR: BAR-347 (domain consolidation), BAR-302 (website)
### Created: 2026-04-28

---

## The Y-Fork + Domain Consolidation Diagram

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 900" font-family="'Segoe UI', Arial, sans-serif">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#334155"/>
    </marker>
    <marker id="arrow-blue" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#2563eb"/>
    </marker>
    <marker id="arrow-green" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#16a34a"/>
    </marker>
    <marker id="arrow-purple" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#7c3aed"/>
    </marker>
    <marker id="arrow-orange" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#ea580c"/>
    </marker>
  </defs>

  <!-- Background -->
  <rect width="1100" height="900" fill="#f8fafc" rx="8"/>

  <!-- Title -->
  <text x="550" y="35" text-anchor="middle" font-size="20" font-weight="bold" fill="#0f172a">Domain Architecture — 18 Domains → 1 Canonical</text>
  <text x="550" y="55" text-anchor="middle" font-size="12" fill="#64748b">All arrows = 301 redirect (permanent). Authority consolidates to the canonical center.</text>

  <!-- ============================================ -->
  <!-- THE CANONICAL (center) -->
  <!-- ============================================ -->
  <rect x="355" y="370" width="390" height="80" rx="12" fill="#1e40af" stroke="#1e3a8a" stroke-width="2"/>
  <text x="550" y="402" text-anchor="middle" font-size="18" font-weight="bold" fill="white">insuranceinformatics.com</text>
  <text x="550" y="422" text-anchor="middle" font-size="11" fill="#bfdbfe">THE CANONICAL — merge point of the Y-fork</text>
  <text x="550" y="438" text-anchor="middle" font-size="10" fill="#93c5fd">9 pages · CF Pages · SEO authority sink · all roads lead here</text>

  <!-- ============================================ -->
  <!-- Y-FORK: svg.agency (left) -->
  <!-- ============================================ -->
  <rect x="100" y="100" width="250" height="70" rx="10" fill="#2563eb" stroke="#1d4ed8" stroke-width="2"/>
  <text x="225" y="128" text-anchor="middle" font-size="15" font-weight="bold" fill="white">svg.agency</text>
  <text x="225" y="146" text-anchor="middle" font-size="10" fill="#bfdbfe">Insurance Fork — license, E&amp;O, compliance</text>
  <text x="225" y="160" text-anchor="middle" font-size="9" fill="#93c5fd">PROTECTED — DNS changes require Dave's approval</text>

  <!-- Arrow: svg.agency → canonical -->
  <line x1="280" y1="170" x2="460" y2="370" stroke="#2563eb" stroke-width="2.5" marker-end="url(#arrow-blue)"/>
  <text x="340" y="260" font-size="9" fill="#2563eb" transform="rotate(-35, 340, 260)">authority flows →</text>

  <!-- ============================================ -->
  <!-- Y-FORK: weewee.me (right) -->
  <!-- ============================================ -->
  <rect x="750" y="100" width="250" height="70" rx="10" fill="#2563eb" stroke="#1d4ed8" stroke-width="2"/>
  <text x="875" y="128" text-anchor="middle" font-size="15" font-weight="bold" fill="white">weewee.me</text>
  <text x="875" y="146" text-anchor="middle" font-size="10" fill="#bfdbfe">IT Fork — tech infrastructure, data architecture</text>
  <text x="875" y="160" text-anchor="middle" font-size="9" fill="#93c5fd">PROTECTED — DNS changes require Dave's approval</text>

  <!-- Arrow: weewee.me → canonical -->
  <line x1="820" y1="170" x2="640" y2="370" stroke="#2563eb" stroke-width="2.5" marker-end="url(#arrow-blue)"/>
  <text x="760" y="260" font-size="9" fill="#2563eb" transform="rotate(35, 760, 260)">← authority flows</text>

  <!-- Y-Fork label -->
  <text x="550" y="90" text-anchor="middle" font-size="13" font-weight="bold" fill="#1e40af">Y-FORK (Core 3)</text>
  <text x="550" y="106" text-anchor="middle" font-size="10" fill="#475569">Insurance + IT = Insurance Informatics</text>

  <!-- ============================================ -->
  <!-- II DOMAIN FAMILY (10 domains — left side below canonical) -->
  <!-- ============================================ -->
  <text x="200" y="500" text-anchor="middle" font-size="13" font-weight="bold" fill="#16a34a">II Domain Family (10)</text>
  <text x="200" y="516" text-anchor="middle" font-size="9" fill="#64748b">Mailgun sending + brand protection</text>

  <!-- Domain boxes — Column 1 -->
  <rect x="20" y="530" width="200" height="28" rx="5" fill="#dcfce7" stroke="#16a34a" stroke-width="1"/>
  <text x="120" y="549" text-anchor="middle" font-size="10" fill="#166534">insuranceinformatic.agency</text>

  <rect x="20" y="564" width="200" height="28" rx="5" fill="#dcfce7" stroke="#16a34a" stroke-width="1"/>
  <text x="120" y="583" text-anchor="middle" font-size="10" fill="#166534">insuranceinformatic.com</text>

  <rect x="20" y="598" width="200" height="28" rx="5" fill="#dcfce7" stroke="#16a34a" stroke-width="1"/>
  <text x="120" y="617" text-anchor="middle" font-size="10" fill="#166534">insuranceinformatics.agency</text>

  <rect x="20" y="632" width="200" height="28" rx="5" fill="#dcfce7" stroke="#16a34a" stroke-width="1"/>
  <text x="120" y="651" text-anchor="middle" font-size="10" fill="#166534">insuranceinformatics.club</text>

  <rect x="20" y="666" width="200" height="28" rx="5" fill="#dcfce7" stroke="#16a34a" stroke-width="1"/>
  <text x="120" y="685" text-anchor="middle" font-size="10" fill="#166534">insurance-informatics.com</text>

  <!-- Domain boxes — Column 2 -->
  <rect x="230" y="530" width="200" height="28" rx="5" fill="#dcfce7" stroke="#16a34a" stroke-width="1"/>
  <text x="330" y="549" text-anchor="middle" font-size="10" fill="#166534">insuranceinformatics.info</text>

  <rect x="230" y="564" width="200" height="28" rx="5" fill="#dcfce7" stroke="#16a34a" stroke-width="1"/>
  <text x="330" y="583" text-anchor="middle" font-size="10" fill="#166534">insuranceinformatics.net</text>

  <rect x="230" y="598" width="200" height="28" rx="5" fill="#dcfce7" stroke="#16a34a" stroke-width="1"/>
  <text x="330" y="617" text-anchor="middle" font-size="10" fill="#166534">insuranceinformatics.online</text>

  <rect x="230" y="632" width="200" height="28" rx="5" fill="#dcfce7" stroke="#16a34a" stroke-width="1"/>
  <text x="330" y="651" text-anchor="middle" font-size="10" fill="#166534">insuranceinformatics.shop</text>

  <rect x="230" y="666" width="200" height="28" rx="5" fill="#dcfce7" stroke="#16a34a" stroke-width="1"/>
  <text x="330" y="685" text-anchor="middle" font-size="10" fill="#166534">insuranceinformatics.xyz</text>

  <!-- Arrows: II family → canonical -->
  <line x1="220" y1="530" x2="440" y2="450" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#arrow-green)"/>
  <line x1="330" y1="530" x2="500" y2="450" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#arrow-green)"/>
  <text x="370" y="490" font-size="9" fill="#16a34a">301 redirects (all 10)</text>

  <!-- ============================================ -->
  <!-- SVG BRAND DOMAINS (3 — right side below canonical) -->
  <!-- ============================================ -->
  <text x="850" y="500" text-anchor="middle" font-size="13" font-weight="bold" fill="#7c3aed">SVG Brand Domains (3)</text>
  <text x="850" y="516" text-anchor="middle" font-size="9" fill="#64748b">Company name variants — brand protection</text>

  <rect x="750" y="530" width="200" height="28" rx="5" fill="#ede9fe" stroke="#7c3aed" stroke-width="1"/>
  <text x="850" y="549" text-anchor="middle" font-size="10" fill="#5b21b6">svgwv.com</text>

  <rect x="750" y="564" width="200" height="28" rx="5" fill="#ede9fe" stroke="#7c3aed" stroke-width="1"/>
  <text x="850" y="583" text-anchor="middle" font-size="10" fill="#5b21b6">shenandoahvalleygrp.com</text>

  <rect x="750" y="598" width="200" height="28" rx="5" fill="#ede9fe" stroke="#7c3aed" stroke-width="1"/>
  <text x="850" y="617" text-anchor="middle" font-size="10" fill="#5b21b6">shenvalleygroup.com</text>

  <!-- Arrows: SVG brand → canonical -->
  <line x1="800" y1="530" x2="650" y2="450" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#arrow-purple)"/>
  <text x="730" y="490" font-size="9" fill="#7c3aed">301 redirects (all 3)</text>

  <!-- ============================================ -->
  <!-- HEALTHCARE (medsavings.org) — center below -->
  <!-- ============================================ -->
  <rect x="475" y="530" width="200" height="28" rx="5" fill="#fef3c7" stroke="#d97706" stroke-width="1"/>
  <text x="575" y="549" text-anchor="middle" font-size="10" fill="#92400e">medsavings.org</text>
  <text x="575" y="570" text-anchor="middle" font-size="9" fill="#64748b">Healthcare related</text>

  <!-- Arrow: medsavings → canonical -->
  <line x1="575" y1="530" x2="555" y2="450" stroke="#d97706" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#arrow-orange)"/>

  <!-- ============================================ -->
  <!-- SEPARATE: briarvalleyproperties.com -->
  <!-- ============================================ -->
  <rect x="470" y="780" width="260" height="70" rx="10" fill="#fef2f2" stroke="#dc2626" stroke-width="2" stroke-dasharray="6,4"/>
  <text x="600" y="808" text-anchor="middle" font-size="13" font-weight="bold" fill="#991b1b">briarvalleyproperties.com</text>
  <text x="600" y="825" text-anchor="middle" font-size="10" fill="#b91c1c">SEPARATE — Real Estate branch</text>
  <text x="600" y="840" text-anchor="middle" font-size="9" fill="#dc2626">Different CTB node. Does NOT redirect to II.</text>

  <!-- X mark between canonical and BVP -->
  <line x1="550" y1="455" x2="590" y2="775" stroke="#dc2626" stroke-width="1" stroke-dasharray="3,6" opacity="0.4"/>
  <text x="585" y="720" font-size="22" fill="#dc2626" font-weight="bold">&#x2717;</text>
  <text x="610" y="730" font-size="9" fill="#dc2626">No redirect</text>

  <!-- ============================================ -->
  <!-- LEGEND -->
  <!-- ============================================ -->
  <rect x="20" y="760" width="380" height="130" rx="8" fill="white" stroke="#e2e8f0" stroke-width="1"/>
  <text x="35" y="782" font-size="12" font-weight="bold" fill="#0f172a">Legend</text>

  <line x1="35" y1="798" x2="65" y2="798" stroke="#2563eb" stroke-width="2.5"/>
  <text x="75" y="802" font-size="10" fill="#334155">Y-Fork (core domains — authority donors)</text>

  <line x1="35" y1="818" x2="65" y2="818" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="75" y="822" font-size="10" fill="#334155">II Domain Family (Mailgun sending + brand protection)</text>

  <line x1="35" y1="838" x2="65" y2="838" stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="75" y="842" font-size="10" fill="#334155">SVG Brand Domains (company name variants)</text>

  <line x1="35" y1="858" x2="65" y2="858" stroke="#d97706" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="75" y="862" font-size="10" fill="#334155">Healthcare (medsavings.org)</text>

  <rect x="35" y="870" width="30" height="12" rx="3" fill="#fef2f2" stroke="#dc2626" stroke-width="1" stroke-dasharray="3,2"/>
  <text x="75" y="880" font-size="10" fill="#334155">Separate business — no redirect</text>

  <!-- Infrastructure note -->
  <text x="550" y="875" text-anchor="middle" font-size="10" fill="#64748b">All 18 domains on Cloudflare nameservers (jill + rocky) | All zones active</text>
  <text x="550" y="892" text-anchor="middle" font-size="10" fill="#64748b">14 of 18 are Mailgun verified sending domains for outreach email</text>
</svg>
```

---

## Domain Registry

All 18 domains. Cloudflare-managed. Active zones.

| # | Domain | Zone ID | Category | Purpose | Action | Registrar |
|---|--------|---------|----------|---------|--------|-----------|
| 1 | **insuranceinformatics.com** | `5178b290420b9279430dc584b77c29c6` | Canonical | THE primary domain. 9-page site. SEO authority sink. | CF Pages custom domain | Cloudflare |
| 2 | **svg.agency** | `ff27b7f80b1e65df50916230c2e09932` | Y-Fork (Insurance) | Insurance license, E&O, compliance shell. Email domain (dbarton@svg.agency). | Custom domain (minimal page) | Cloudflare |
| 3 | **weewee.me** | `7e4337469e4644a0d564a0c66d994b1d` | Y-Fork (IT) | Technology infrastructure credibility. CIO/CTO-facing. | Custom domain (tech page) | Cloudflare |
| 4 | insuranceinformatic.agency | `c5cb461aabe86ae5635ab9cfa773d249` | II Family | Sending domain (Mailgun) + brand protection | 301 → insuranceinformatics.com | Cloudflare |
| 5 | insuranceinformatic.com | `691b2f86f89ac6032a4d5bd621d7f88c` | II Family | Sending domain (Mailgun) + typo protection (no 's') | 301 → insuranceinformatics.com | Cloudflare |
| 6 | insuranceinformatics.agency | `c1050911091a5e1a9c1dfb326a6083a2` | II Family | Sending domain (Mailgun) + TLD protection | 301 → insuranceinformatics.com | Cloudflare |
| 7 | insuranceinformatics.club | `84ae15fa9c029404d115d1b4edbca783` | II Family | Sending domain (Mailgun) + TLD protection | 301 → insuranceinformatics.com | Cloudflare |
| 8 | insurance-informatics.com | `9dfa6520d5b1629ec1366a8b5b82573e` | II Family | Sending domain (Mailgun) + hyphenated variant protection | 301 → insuranceinformatics.com | Cloudflare |
| 9 | insuranceinformatics.info | `c2ae2f64b4752ee8a741e9603870a970` | II Family | Sending domain (Mailgun) + TLD protection | 301 → insuranceinformatics.com | Cloudflare |
| 10 | insuranceinformatics.net | `4d830503d0ba1c742c2f0a2a7cd4d84e` | II Family | Sending domain (Mailgun) + TLD protection | 301 → insuranceinformatics.com | Cloudflare |
| 11 | insuranceinformatics.online | `3e6743fd83bb99bb31560b9b30f9b6d5` | II Family | Sending domain (Mailgun) + TLD protection | 301 → insuranceinformatics.com | Cloudflare |
| 12 | insuranceinformatics.shop | `412970ca32e7723e887599a5dced34ec` | II Family | Sending domain (Mailgun) + TLD protection | 301 → insuranceinformatics.com | Cloudflare |
| 13 | insuranceinformatics.xyz | `2a2d09a90840a0ac4fc09295f93d6847` | II Family | Sending domain (Mailgun) + TLD protection | 301 → insuranceinformatics.com | Cloudflare |
| 14 | svgwv.com | `4039afb5f104919d9edb4adae82cde3b` | SVG Brand | Existing brand abbreviation | 301 → insuranceinformatics.com | Cloudflare |
| 15 | shenandoahvalleygrp.com | `3bb282fbff01a899578e6e85e53663a4` | SVG Brand | Full company name variant | 301 → insuranceinformatics.com | Cloudflare |
| 16 | shenvalleygroup.com | `b720f100f177f35102576c7d16c78764` | SVG Brand | Abbreviated company name variant | 301 → insuranceinformatics.com | Cloudflare |
| 17 | medsavings.org | `3b624b914c45044b84a6f95ebb482acc` | Healthcare | Healthcare/savings related domain | 301 → insuranceinformatics.com | Cloudflare |
| 18 | briarvalleyproperties.com | `c5f75baac481860f7aa3f1476a629670` | Real Estate | Briar Valley Properties — SEPARATE business | Separate site (no redirect) | Cloudflare |

---

## Domain Categories Explained

### Category 1: The Y-Fork (3 domains)

The Y-fork is the architectural spine. Two specialized domains merge into one canonical.

| Domain | Fork | What It Contributes |
|--------|------|-------------------|
| svg.agency | Insurance | Licensed entity identity, E&O coverage, regulatory compliance, email domain |
| weewee.me | IT | Technology infrastructure credibility, 38-node architecture story, data architecture |
| insuranceinformatics.com | Merge Point | Insurance + IT = Insurance Informatics. The named discipline. The authority. |

**svg.agency and weewee.me are PROTECTED domains.** DNS modifications require Dave's explicit approval. They are authority donors — links FROM these domains flow TO insuranceinformatics.com.

### Category 2: II Domain Family (10 domains)

These serve two purposes simultaneously:

1. **Mailgun sending domains** — used for email outreach campaigns (HAMMER). Having 10+ sending domains means higher daily email volume capacity and better deliverability (spread reputation across domains).

2. **Brand protection** — every reasonable typo, TLD variant, and spelling variation is owned. No competitor can register `insuranceinformatic.com` (missing 's') or `insurance-informatics.com` (hyphenated) and intercept traffic.

All 10 domains 301-redirect to insuranceinformatics.com. This consolidates any direct-navigation traffic AND tells search engines that all these domains defer authority to the canonical.

### Category 3: SVG Brand Domains (3 domains)

Company name variants. Anyone searching for "Shenandoah Valley Group" or "SVG WV" lands at the canonical.

| Domain | Protects |
|--------|----------|
| svgwv.com | "SVG WV" abbreviation |
| shenandoahvalleygrp.com | Full "Shenandoah Valley Group" (with abbreviation) |
| shenvalleygroup.com | Common shortening "Shen Valley Group" |

### Category 4: Healthcare (1 domain)

**medsavings.org** — healthcare savings related. Redirects to insuranceinformatics.com. Captures anyone searching for medical savings in the SVG context.

### Category 5: Real Estate (1 domain — SEPARATE)

**briarvalleyproperties.com** — Briar Valley Properties. This is a DIFFERENT business on a DIFFERENT CTB branch (`barton-enterprises/briar-valley-properties`). It does NOT redirect to insuranceinformatics.com. It gets its own site, its own content, its own SEO.

---

## 301 Redirect Implementation

All redirects are implemented via Cloudflare Page Rules or Bulk Redirects.

### Redirect Configuration Per Domain

```
# For each II Family + SVG Brand + medsavings domain:
#
# Cloudflare Page Rule:
#   URL match: *domain.tld/*
#   Setting: Forwarding URL (301 Permanent)
#   Destination: https://insuranceinformatics.com/$1
#
# This preserves the path after the domain, so:
#   insuranceinformatics.net/about → insuranceinformatics.com/about
#   insurance-informatics.com/book → insuranceinformatics.com/book
```

### DNS Requirements

Each redirecting domain needs:
1. An A record or CNAME pointing to Cloudflare (proxied)
2. SSL/TLS set to Full or Full (Strict)
3. Page Rule or Bulk Redirect configured for 301

### Verification Checklist

- [ ] All 13 redirecting domains return HTTP 301 to insuranceinformatics.com
- [ ] Redirect preserves path (e.g., `/book` stays `/book`)
- [ ] HTTPS enforced on all domains (Cloudflare automatic)
- [ ] No redirect loops
- [ ] briarvalleyproperties.com does NOT redirect to II
- [ ] svg.agency serves its own content (not a blind redirect)
- [ ] weewee.me serves its own content (not a blind redirect)

---

## SEO Authority Flow

```
                              AUTHORITY FLOW
                              ══════════════

   svg.agency ──────────────────────┐
   (insurance license, E&O,         │
    compliance, email domain)        │
                                     ▼
                          ┌─────────────────────┐
   10 II domains ────────►│                     │
   (sending + protection) │ insuranceinformatics │
                          │       .com           │
   3 SVG brands ────────►│                     │
   (company name variants)│  THE CANONICAL HUB  │
                          │                     │
   medsavings.org ───────►│  All domain authority│
   (healthcare)           │  consolidates HERE   │
                          └─────────────────────┘
   weewee.me ───────────────────────┘
   (IT infrastructure,
    data architecture)

   briarvalleyproperties.com ──► SEPARATE (Real Estate CTB branch)
```

Every 301 redirect passes ~90-99% of the source domain's link equity to the destination. With 15 domains redirecting (plus 2 linking), insuranceinformatics.com accumulates authority from the entire portfolio.

---

## Mailgun Sending Domain Status

14 of the 18 domains are verified Mailgun sending domains used for outreach email campaigns.

| Domain | Mailgun Verified | Warmup Status |
|--------|-----------------|---------------|
| insuranceinformatic.agency | Yes | Active |
| insuranceinformatic.com | Yes | Active |
| insuranceinformatics.agency | Yes | Active |
| insuranceinformatics.club | Yes | Active |
| insurance-informatics.com | Yes | Active |
| insuranceinformatics.com | Yes | Active |
| insuranceinformatics.info | Yes | Active |
| insuranceinformatics.net | Yes | Active |
| insuranceinformatics.online | Yes | Active |
| insuranceinformatics.shop | Yes | Active |
| insuranceinformatics.xyz | Yes | Active |
| svgwv.com | Yes | Active |
| shenandoahvalleygrp.com | Yes | Active |
| shenvalleygroup.com | Yes | Active |

**Note:** Sending domains and redirects are not mutually exclusive. A domain can have Mailgun MX/TXT records for email AND a Cloudflare Page Rule for web redirect. Email routing (MX records) and web routing (A/CNAME + Page Rules) are independent DNS functions.

---

## Infrastructure Constants

| Constant | Value |
|----------|-------|
| DNS Provider | Cloudflare (all 18 zones) |
| Nameservers | jill.ns.cloudflare.com + rocky.ns.cloudflare.com |
| SSL/TLS | Cloudflare automatic (Universal SSL) |
| Hosting (canonical) | CF Pages (content-pages project) |
| Email (sending) | Mailgun (14 domains verified) |
| Email (receiving) | Google Workspace (dbarton@svg.agency) |
| Redirect Method | Cloudflare Page Rules / Bulk Redirects (301 permanent) |

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-04-28 |
| Last Modified | 2026-04-28 |
| BAR | BAR-347 (domain consolidation), BAR-302 (website) |
| Version | 1.0.0 |
| Status | BUILD |
| Authority | Dave Barton |
| Parent | `fleet/content/FCE-007-WEBSITE-MASTERY.md` |
| CTB Node | barton-enterprises/svg-agency/insurance-informatics/domains |
