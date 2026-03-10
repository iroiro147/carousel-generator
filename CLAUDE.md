# Carousel Generator — Vercel + Supabase Deployment

## Architecture

Monorepo deployed to Vercel:
- `app/` — React 19 + Vite 7 + Tailwind v4 frontend (SPA)
- `api/` — Vercel Serverless Functions (Node.js)
- `api/_lib/` — Shared server code (providers, content gen, prompt building)

## Build & Dev

```bash
cd app && npm install && npm run dev   # Frontend dev server
```

Vercel handles API functions automatically in production.

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/health | Health check |
| POST | /api/content/generate | Generate slide copy (long-form or short-form) |
| POST | /api/content/regenerate-slide | Regenerate single slide |
| POST | /api/images/generate-slide | Generate single slide image |
| POST | /api/images/generate-carousel | Batch generate all slide images |
| POST | /api/variants/generate-one | Generate single cover variant |
| POST | /api/variants/generate | Generate batch cover variants |
| POST | /api/color/derive | Derive brand color (stub) |

## Provider Mapping

- **OpenAI GPT Image**: dark_museum, product_elevation, experience_capture
- **Google Imagen 3**: nyt_opinion, sic_toile, name_archaeology
- **Claude**: All content generation (longForm + shortForm)

Fallback: if preferred provider key is missing, tries the other.

## Environment Variables

- `OPENAI_API_KEY` — GPT Image generation
- `GOOGLE_API_KEY` — Imagen 3 generation
- `ANTHROPIC_API_KEY` — Claude content generation
- `VITE_SUPABASE_URL` — Supabase project URL (optional)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key (optional)

## Key Patterns

- Frontend fetch calls use `/api/...` paths — works on both Vite dev (proxy) and Vercel (same origin)
- `api/_lib/` underscore prefix prevents Vercel from exposing as routes
- JSON data imports use `with { type: 'json' }` syntax
- No sharp dependency — images returned at provider native resolution
