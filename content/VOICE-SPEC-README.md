# Voice Spec README

## What this is

`fleet/content/VOICE-SPEC.yaml` is the machine layer for Dave Barton voice and Insurance Informatics positioning.
It extracts the locked voice rules from `law/VOICE-LIBRARY.md` and the brand-positioning anchors from the brand-story and CTB docs into a single parseable spec.
`scripts/gen-voice-spec.mjs` turns that YAML into checked-in worker bridges at `workers/*/src/voice-spec.generated.ts`.

The purpose is simple: Email, LinkedIn, and Website writers should all consume the same voice constants instead of re-reading prose and improvising tone.

## How downstream consumers should use it

1. Run `npm run voice:gen` or the worker `prebuild`/`predeploy` hook to refresh the generated bridges.
2. Load the generated worker module for the consumer you are writing.
3. Read `brand.positioning_anchors` first. Those anchors define the category, the domain claim, and the merger story.
4. Read `voice_constants`. Those fields define tone, sentence shape, required phrases, and forbidden phrases.
5. Read the relevant `channel_rules` block for the channel you are writing.
6. Validate the draft before publish.
7. Fail closed on any forbidden phrase or channel mismatch.

## Channel-specific consumption pattern

### Email

The email compiler should use the spec as the gate before send:

- apply `voice_constants.persona` and `voice_constants.posture`
- keep sentences short and direct
- require one fact, one insight, one ask
- include the brand signature
- reject drafts containing forbidden phrases

Practical example:

```ts
import { VOICE_SPEC as EMAIL_VOICE_SPEC } from './voice-spec.generated';

const draft = buildEmailDraft(input);

assertChannel(draft, EMAIL_VOICE_SPEC.channel_rules.email);
assertNoForbiddenPhrases(draft, EMAIL_VOICE_SPEC.voice_constants.forbidden_phrases);
assertHasRequiredPhrases(draft, EMAIL_VOICE_SPEC.voice_constants.required_phrases);
```

### LinkedIn

The LinkedIn writer should use the same spec, but with public-facing education cadence:

- one concept per post
- no corporate filler
- no soft asks
- CTA or follow prompt at the end

The voice is the same voice. The fill is shorter and more public.

### Website

The website writer should use the same spec for hero copy, explainer copy, and CTA copy:

- lead with the category
- keep the explanation plain
- keep the CTA singular
- avoid brand drift into generic marketing language

## Relationship to existing docs

- `law/VOICE-LIBRARY.md` remains the prose source of truth.
- `fleet/content/logos/BRAND-STORY.md` supplies the merger story and domain proof.
- `fleet/content/INSURANCE-INFORMATICS-CTB.md` supplies the altitude and positioning structure.
- This README explains how to consume the spec.

## Fallback rule

If `VOICE-SPEC.yaml` is missing, the generator cannot refresh the checked-in bridges and the build should stop.
Direct runtime reads of `VOICE-SPEC.yaml` are not the normal path. The normal path is to consume the generated worker bridge.

## Do not do this

- Do not rewrite the spec per channel.
- Do not let a writer invent new tone markers.
- Do not silently ignore forbidden phrases.
- Do not let website, LinkedIn, and email drift apart.

The point of the spec is consistency.
