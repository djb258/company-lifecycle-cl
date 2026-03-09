---
name: cl-lovable
description: >
  Lovable.dev platform usage, configuration, and constraints for the Company Lifecycle hub
  (HUB-CL-001). This repo was scaffolded with Lovable and exported to GitHub for ongoing
  development with Claude Code. Covers the lovable-tagger dev dependency, Vite plugin
  integration, Supabase client for UI data access, Radix UI component library, and the
  one-way Lovable-to-GitHub export pattern. Trigger on: Lovable, lovable.dev, lovable-tagger,
  componentTagger, Vite plugin, Supabase client, Radix UI, UI scaffold, prototype export,
  or any reference to the frontend generation origin of this repo. Also trigger when evaluating
  UI component patterns, discussing the React/Vite/Tailwind stack, or when someone asks how
  this frontend was built.
---

# cl-lovable — Company Lifecycle Lovable Skill

Company Lifecycle (HUB-CL-001) was scaffolded using Lovable.dev and exported to GitHub.
All ongoing development happens in Claude Code / Cursor. Lovable is no longer in the
active development loop -- it was Step 1 only.

**Master skill reference:** `IMO-Creator/skills/lovable/SKILL.md`

## What This Repo Uses From Lovable

| Component | Detail |
|-----------|--------|
| Origin | Lovable.dev (AI app builder) |
| Export | Lovable -> GitHub -> Claude Code |
| Dev dependency | `lovable-tagger` ^1.1.13 |
| Vite plugin | `componentTagger()` in development mode only |
| UI framework | React ^18.3.1 + Vite ^5.4.19 |
| CSS | Tailwind ^3.4.17 + tailwindcss-animate |
| Component library | Radix UI (26+ primitives) |
| Data access (UI) | `@supabase/supabase-js` ^2.89.0 |
| State management | `@tanstack/react-query` ^5.83.0 |
| Routing | `react-router-dom` ^6.30.1 |
| Forms | `react-hook-form` ^7.61.1 + zod ^3.25.76 |
| Charts | recharts ^2.15.4 |
| Dev server | Port 8080, host `::` |

## Vite Configuration

```typescript
// vite.config.ts
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: { host: "::", port: 8080 },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
}));
```

The `componentTagger` plugin is active in development mode only. It tags components
for Lovable's visual editor. In production builds, it is stripped out.

## Lovable's Role in This Repo

| Phase | Status | Description |
|-------|--------|-------------|
| Initial scaffold | COMPLETE | Lovable generated the React + Radix + Tailwind base |
| GitHub export | COMPLETE | Code exported, Lovable no longer the source of truth |
| Ongoing development | Claude Code / Cursor | All new features, fixes, and architecture work |
| Lovable re-import | NOT POSSIBLE | Lovable cannot import from existing GitHub repos |

## UI Component Stack (Lovable-Generated)

Radix UI primitives used (from package.json):
- Accordion, Alert Dialog, Aspect Ratio, Avatar, Checkbox
- Collapsible, Context Menu, Dialog, Dropdown Menu
- Hover Card, Label, Menubar, Navigation Menu
- Popover, Progress, Radio Group, Scroll Area
- Select, Separator, Slider, Slot, Switch
- Tabs, Toast, Toggle, Toggle Group, Tooltip

Additional UI: `cmdk` (command palette), `vaul` (drawer), `embla-carousel-react`,
`input-otp`, `sonner` (toasts), `react-resizable-panels`, `react-day-picker`.

## Backend Connection

The UI uses `@supabase/supabase-js` as the data access layer. The actual database
is Neon PostgreSQL (see `cl-neon` skill). Supabase provides the client SDK for
auth and real-time features, while Neon holds all canonical data.

## LCS Delivery Adapter

Lovable also appears as a delivery adapter in the LCS pipeline:
- `src/app/lcs/adapters/lovable-delivery-adapter.ts` -- adapter for UI-based delivery flows
- Registered in adapter resolver alongside Mailgun (MG) and HeyReach (HR)

## Constraints

| Constraint | Impact |
|-----------|--------|
| No Lovable re-import | Cannot push changes back to Lovable |
| lovable-tagger is dev-only | Zero production impact |
| Supabase client in UI | Data reads go through Supabase SDK, writes go through pipeline |
| Radix UI locked to Lovable versions | May need manual version bumps for security patches |

## Cost Profile

| Item | Value |
|------|-------|
| Lovable subscription | Not active (export complete) |
| lovable-tagger | Free (npm dev dependency) |
| Runtime cost | $0 (dev-only plugin) |
