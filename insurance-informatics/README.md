# Insurance Informatics — Brand, Website & Content Home

This is the canonical home for the Insurance Informatics brand, deployable website, content, and supporting doctrine.

## Subfolder Structure

| Folder | Contents |
|--------|----------|
| `website/` | Deployable Vite + React app (insuranceinformatics.com) |
| `docs/` | Strategy, UT docs, work orders, CTB, domain architecture |
| `voice/` | VOICE-SPEC.yaml + readme + UT |
| `platforms/` | Platform-specific content playbooks (Facebook, Instagram, LinkedIn, X) |
| `sales/` | Sales content library, SVG operating model, TPA evaluation framework |
| `videos/` | HeyGen render queue, video manifests, scripts, vendor briefings |
| `campaigns/` | Campaign drafts by launch batch (e.g., launch-01/) |
| `logos/` | Brand story, concept history (superseded/), locked final assets |
| `REPO-SUBJECT-MANIFEST.yaml` | Repo subject registry for LBB classification |

## Website Build

```bash
cd website
npm install
npm run build
```

Build output lands in `website/dist/`. Do NOT run `npm run deploy` from here — CF Pages deployment is wired to the repo directly. Contact Foreman before changing the deploy target.

**Note:** The `prebuild` / `predev` scripts that called `../../scripts/gen-voice-spec.mjs` have been stubbed out with `echo skipped at new location`. The generated file `src/voice-spec.generated.ts` is already present in the repo. If you need to regenerate it, run `voice:gen` from the original imo-creator-v2 workspace and copy the result.

## Live URL

https://insuranceinformatics.com

Hosted on Cloudflare Pages. Source is this folder (`insurance-informatics/website/`).

## Trunk Document

`docs/FCE-007-WEBSITE-MASTERY.md` — the trunk doc for all Insurance Informatics website work. Read this first before opening any work order in this folder.
