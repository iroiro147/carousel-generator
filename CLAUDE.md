# Juno Carousel Engine — Vercel + Supabase Deployment

## Architecture

Monorepo deployed to Vercel:
- `app/` — React 19 + Vite 7 + Tailwind v4 frontend (SPA)
- `api/` — Vercel Serverless Functions (Node.js)
- `api/_lib/` — Shared server code (providers, content gen, pipeline)
- `api/_lib/pipeline/` — Two-stage image generation pipeline
- `api/_lib/styles/` — Self-contained style packs (one directory per theme)

## Two-Stage Pipeline

All cover variant generation uses the two-stage pipeline:

```
Brief → orchestrator.ts
  Stage 1: Gemini 2.5 Flash → XML visual decision (8s timeout, 2 attempts)
  Stage 2: GPT-Image-1.5 → JPEG image (35s timeout)
  Global backstop: 50s AbortController
  Fallback: Nano Banana 2 if GPT fails
```

Each style pack defines: `stage1SystemPrompt`, `parseVisualDecision()`, `validateVisualDecision()`, `buildStage2Prompt()`.

The pipeline returns a `GenerationResult` containing `imageBase64`, `visualDecision` (Stage 1 metadata), `stage2Prompt`, `provider`, `headline`, and `mimeType`. These flow through the `CoverVariant` → `Carousel` → Editor Info tab for full traceability.

## Style Pack System

```
api/_lib/styles/{id}/
  config.ts              — StylePack implementation (angles, parser, validator, builder)
  stage1-system.md       — Gemini Flash system prompt
  stage2-template.ts     — GPT Image prompt builder
  tokens.json            — Visual constants
  decision-tree.json     — Metaphor routing logic
  evals.json             — Eval pairs (populate from production)
```

Active styles: `dark-museum`, `nyt-opinion`, `sic-toile`, `radial-departure` (cover-only), `editorial-minimal` (conditional)
Stub: `dispatch`

## Build & Dev

```bash
cd app && npm install && npm run dev   # Frontend dev server
cd app && npx vitest run               # Run tests
```

Vercel handles API functions automatically in production.

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/health | Health check |
| POST | /api/content/generate | Generate slide copy (long-form or short-form) |
| POST | /api/content/regenerate-slide | Regenerate single slide |
| POST | /api/images/generate-slide | Generate single body slide image (routes through style pack) |
| POST | /api/images/generate-carousel | Batch generate all body slide images (routes through style pack) |
| POST | /api/variants/generate-one | Generate single cover variant (all themes via pipeline) |
| POST | /api/variants/generate | Generate batch cover variants (all themes via pipeline) |
| POST | /api/feedback/submit | Submit thumbs up/down feedback on a variant |
| GET | /api/styles/angles?id={themeId} | Get angle definitions for a style pack |
| POST | /api/color/derive | NYT 8-step color derivation (Gemini Flash vision → HSL tone math) |

## Provider Mapping

- **GPT-Image-1.5**: Primary image provider for ALL themes
- **Nano Banana 2**: Fallback if GPT fails
- **Gemini 2.5 Flash**: Stage 1 text reasoning (analyzeContent.ts)
- **Claude**: All content generation (longForm + shortForm)

All images returned as JPEG (not PNG).

## Environment Variables

- `OPENAI_API_KEY` — GPT Image generation
- `GOOGLE_API_KEY` — Gemini Flash (Stage 1) + Nano Banana 2 (fallback)
- `ANTHROPIC_API_KEY` / `ANTHROPIC_API_KEY_NEW` — Claude content generation
- `SUPABASE_URL` — Server-side Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side Supabase service role key
- `VITE_SUPABASE_URL` — Frontend Supabase project URL (optional)
- `VITE_SUPABASE_ANON_KEY` — Frontend Supabase anon key (optional)

## Key Patterns

- Frontend fetch calls use `/api/...` paths — works on both Vite dev (proxy) and Vercel (same origin)
- `api/_lib/` underscore prefix prevents Vercel from exposing as routes
- JSON data loaded via `readFileSync` + `JSON.parse` (NOT `import ... with { type: 'json' }` which is unsupported on Vercel)
- Google provider is lazy-loaded via dynamic `import()` to prevent module crashes from blocking OpenAI paths
- No sharp dependency — images returned at provider native resolution
- Style packs loaded via dynamic `import()` in `styleLoader.ts`, cached after first load
- Supabase generation logging is fire-and-forget (never crashes the response)
- Body slide image generation routes through style pack `buildBodySlidePrompt()` — same pattern as cover images but without Stage 1 reasoning
- Feedback UI (thumbs up/down) sends to `/api/feedback/submit` → Supabase `generation_feedback` table. Non-critical: silent on failure.
- `propagationMetadata` from the selected cover variant is injected into the content generation prompt as CREATIVE DIRECTION context (creative angle, narrative frame, body slide tone, etc.)

## Pipeline Files

| File | Purpose |
|------|---------|
| `api/_lib/pipeline/types.ts` | Core TypeScript interfaces (StylePack, VisualDecision, GenerationResult) |
| `api/_lib/pipeline/orchestrator.ts` | Stage 1 → validate → Stage 2 → generate, timeout management |
| `api/_lib/pipeline/analyzeContent.ts` | Gemini 2.5 Flash caller (text gen, not image) |
| `api/_lib/pipeline/xmlParser.ts` | Generic `extractTag()`, `extractAllTags()`, `extractBlock()` |
| `api/_lib/pipeline/xmlValidator.ts` | Delegates to stylePack.validateVisualDecision() |
| `api/_lib/pipeline/stage2Builder.ts` | Delegates to stylePack.buildStage2Prompt() |
| `api/_lib/pipeline/styleLoader.ts` | Dynamic import from /styles/{id}/config.js, caches |
| `api/_lib/pipeline/generationLogger.ts` | Fire-and-forget Supabase insert |
| `api/_lib/pipeline/zoomBurstPrompt.ts` | Shared zoom-burst photo prompt (Radial Departure + Editorial Minimal) |
| `api/_lib/pipeline/evalRunner.ts` | Skeleton: reads evals.json, runs Stage 1, compares output |
| `api/_lib/supabase.ts` | Server-side Supabase client (SERVICE_ROLE_KEY) |

## Per-Theme Assembly Functions

Each theme has its own carousel assembly function on the frontend:
- `assembleLongFormCarousel()` — dark_museum, sic_toile (14 slides)
- `assembleShortFormCarousel()` — nyt_opinion (3-4 slides)
- `assembleRadialDepartureCarousel()` — radial_departure (7 slides, cover-only image + CSS crops)
- `assembleEditorialMinimalCarousel()` — editorial_minimal (5-7 slides, conditional photo)

Routing is in `CoverVariants/index.tsx` → `assembleCarouselForTheme()`.

## Active Themes (5)

| Theme | Format | Slides | Image Strategy |
|-------|--------|--------|---------------|
| dark_museum | long_form | 14 | Per-slide images |
| nyt_opinion | short_form | 3-4 | Cover-only |
| sic_toile | long_form | 14 | Per-slide images |
| radial_departure | short_form | 7 | Cover-only, CSS crops for body |
| editorial_minimal | short_form | 5-7 | Conditional (photo if sequence includes D/E/F/G) |

## Editor Features

- **Info Tab**: "Why this image?" panel shows Stage 1 visual decision fields, image provider, and collapsible Stage 2 prompt. Blue dot indicator when visual decision data is available.
- **Design Tab**: Typography controls, layout switching, font size/weight/case adjustments.
- **Slide Navigator**: Left panel with slide thumbnails, reorder/duplicate/delete.
- **Canvas**: 1200×1500 center preview with zoom controls.

## Known Gaps

None. All pipeline migrations complete.
