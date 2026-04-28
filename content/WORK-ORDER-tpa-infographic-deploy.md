# Work Order — TPA Partnership Infographic → CF Pages Deploy

## Role
MECHANIC

## Task
Wire the new TPA Partnership Fit infographic into `workers/content-pages` as a new content page and deploy to Cloudflare Pages. The PNG asset is already in place. This is a pure config + deploy task.

## Read First
1. `AGENTS.md` — mechanic operating manual
2. `workers/content-pages/MANUAL.md` — how the content-pages worker is structured
3. `workers/content-pages/src/App.tsx` — the content config pattern (topic routing)
4. `workers/content-pages/src/components/ContentPage.tsx` — the 9-slot page renderer
5. `workers/content-pages/wrangler.toml` — deployment config
6. `workers/content-pages/public/content/5500/` — existing example (infographic.png + podcast.m4a + slides.pdf)

## Context

We already have:
- `workers/content-pages/public/content/tpa-partnership-fit/infographic.png` — the PNG is already saved (1200px wide, ~1700px tall, dark theme)
- `fleet/content/tpa-partnership-infographic.html` — the source HTML (stays in fleet/content as the master)

We need to:
- Wire `tpa-partnership-fit` into the App config as a new topic/route alongside the existing `5500` topic
- Use only the infographic slot — no audio, no video, no slides, no report (for now). Other slots stay empty or hidden.
- Brand slot should use SVG Agency branding (the default — check how 5500 is set up for reference).
- Deploy to CF Pages via `npx wrangler pages deploy` so we get a live URL back.

## Steps

1. **Read** the existing App.tsx and ContentPage.tsx to understand the content config pattern.
2. **Add a new topic entry** for `tpa-partnership-fit` with:
   - Title: `TPA Partnership Fit`
   - Subtitle: `A compatibility check, not an interrogation. Three questions. Three answers.`
   - Brand: SVG Agency
   - Infographic slot: `/content/tpa-partnership-fit/infographic.png`
   - All other slots (video, audio, slides, report, quiz, flashcards, mind map, data table): disabled or omitted
3. **Verify** the route (should be something like `/tpa-partnership-fit` based on the 5500 precedent)
4. **Run the build**: `cd workers/content-pages && npm run build`
5. **Deploy**: `npx wrangler pages deploy dist` from `workers/content-pages/`
6. **Capture the deployed URL** from wrangler output and report it back.

## Acceptance Criteria

- [ ] New topic entry added to App config without breaking the existing 5500 topic
- [ ] Build succeeds (no TypeScript errors, no missing asset errors)
- [ ] Deploy succeeds and returns a live URL
- [ ] URL loads and shows the infographic with SVG Agency branding
- [ ] Infographic displays at correct aspect ratio (not stretched or cropped)
- [ ] Report the deployed URL at the end

## Constraints

- Do NOT modify any of the nine locked constants
- Do NOT touch the existing 5500 topic config
- Do NOT convert the HTML to anything else — the PNG is the asset
- Do NOT enable slots we don't have content for yet
- Do NOT rename the infographic.png file — it's already at the right path
- If the App.tsx pattern doesn't support multiple topics cleanly, report it and stop — don't hack around it
- Report P=1 (success with deployed URL) or P=0 (with specific blocker)
