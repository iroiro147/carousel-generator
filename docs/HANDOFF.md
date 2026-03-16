# Carousel Generator — Complete Handoff Document

**Author:** Sarthak Singh (Juspay)
**Date:** March 16, 2026
**Status:** Functional — image generation fix deployed, awaiting production verification

---

## Table of Contents

1. [Project Identity & Current Status](#1-project-identity--current-status)
2. [Three Repositories](#2-three-repositories)
3. [Architecture Overview](#3-architecture-overview)
4. [Monorepo Structure & File Map](#4-monorepo-structure--file-map)
5. [User Flow — End to End](#5-user-flow--end-to-end)
6. [State Management](#6-state-management)
7. [Theme System](#7-theme-system)
8. [Theme Selection Rubric Engine](#8-theme-selection-rubric-engine)
9. [Image Generation Pipeline](#9-image-generation-pipeline)
10. [Prompt Factory — Complete Reference](#10-prompt-factory--complete-reference)
11. [Headline Generation](#11-headline-generation)
12. [Content Generation Pipeline](#12-content-generation-pipeline)
13. [Multi-Model Selector & Midjourney-Style Stacking](#13-multi-model-selector--midjourney-style-stacking)
14. [Editor Architecture](#14-editor-architecture)
15. [Type System](#15-type-system)
16. [Environment & Deployment](#16-environment--deployment)
17. [Design Decisions & Rationale](#17-design-decisions--rationale)
18. [Bugs Fixed — Do Not Regress](#18-bugs-fixed--do-not-regress)
19. [Known Issues & Unverified](#19-known-issues--unverified)
20. [What's Planned](#20-whats-planned)
21. [Prompt System Documentation](#21-prompt-system-documentation)
22. [Testing Checklist](#22-testing-checklist)
23. [Key Functions Reference](#23-key-functions-reference)

---

## 1. Project Identity & Current Status

### What This Is

A full-stack web application that generates LinkedIn carousel slides from a structured creative brief. The system:

1. Collects a structured brief (topic, claim, brand, audience, tone, content category)
2. Runs a client-side rubric engine to recommend one of 6 visual themes
3. Generates 3 AI cover variant options (each with a different creative angle)
4. Assembles a full carousel (14 slides long-form, or 3-4 slides short-form) using the selected variant's propagation metadata
5. Drops the user into an interactive editor for refinement, per-slide image regeneration, and export

### Deployment

| Item | Value |
|------|-------|
| URL | `https://carousel-generator-lake.vercel.app/` |
| Platform | Vercel (serverless functions + static frontend) |
| Database | Supabase (configured but not wired into primary flow) |
| Frontend | React 19 + Vite 7 + Tailwind CSS v4 |
| State | Zustand 5 |
| Image Gen | OpenAI GPT-Image-1.5 + Google Nano Banana 2 |
| Content Gen | Anthropic Claude |
| Routing | React Router 7 |

### Current Status (as of March 16, 2026)

- Brief intake → theme rubric → theme confirmation: **Working**
- Cover variant generation with model selector: **Deployed, unverified on production** (last fix: commit `e0854c6`)
- Full carousel assembly (copy + images for all slides): **Untested end-to-end on deployed instance**
- Editor (slide editing, export): **Working**
- Supabase persistence: **Infrastructure ready, not wired**

---

## 2. Three Repositories

The project exists across 3 directories on disk:

| Directory | Type | Status | Purpose |
|-----------|------|--------|---------|
| `carousel-generator/` | Python + single-file HTML | Reference only | Original prototype. Pure stdlib Python engine + single HTML editor file. No build tools, no npm. |
| `carousel-generator-deploy/` | Vercel monorepo (React + serverless) | **Production** | The deployed application. Git repo with 10 commits. |
| `carousel-generator-v2/` | Vite + React + Express | Experimental | Local dev variant using Express instead of Vercel functions. Not deployed. |

### Git History (carousel-generator-deploy)

```
e0854c6 | 2026-03-13 | fix: defensive null checks on brief fields in generate-one API
f0c8f97 | 2026-03-13 | feat: GPT-Image-1.5 + Nano Banana 2 with model selector
c4ec1bd | 2026-03-12 | fix: lazy-load Google provider to prevent module crash
f5e2212 | 2026-03-12 | fix: remove dead import crashing API + redesign CoverVariants UX
a786c35 | 2026-03-12 | fix: make Continue button always visible (disabled when incomplete)
73a8a06 | 2026-03-12 | fix: add default content_category so Continue button appears
3bf46fc | 2026-03-10 | Add app/package-lock.json for Vercel build
99b1a8f | 2026-03-10 | Add Supabase integration, fix build, add migration SQL
cb1b6eb | 2026-03-10 | Initial commit: carousel-generator monorepo for Vercel
```

### Evolution Path

```
Python prototype (carousel-generator/)
  └── Single-file HTML editor, stdlib-only engine
  └── 3 themes (Dark Museum, NYT Opinion, SIC Toile)
  └── Client-side JS engine mirrors Python for runtime theme switching

      ↓ Rewritten as full-stack web app

Vercel deployment (carousel-generator-deploy/)
  └── React SPA + Vercel Serverless Functions
  └── 6 themes (added Product Elevation, Experience Capture, Name Archaeology)
  └── AI-driven theme selection rubric
  └── Cover variant generation with 2 image models
  └── Propagation metadata system for design coherence
```

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VERCEL DEPLOYMENT                            │
│                                                                     │
│  ┌──────────────────────────────┐  ┌─────────────────────────────┐ │
│  │     FRONTEND (app/)          │  │    API (api/)                │ │
│  │                              │  │                              │ │
│  │  React 19 + Vite 7           │  │  Vercel Serverless Functions │ │
│  │  Tailwind CSS v4             │  │  Node.js runtime             │ │
│  │  Zustand state management    │  │                              │ │
│  │  React Router v7             │  │  /api/variants/generate-one  │ │
│  │                              │  │  /api/content/generate       │ │
│  │  Screens:                    │  │  /api/images/generate-*      │ │
│  │  1. BriefIntake              │  │                              │ │
│  │  2. ThemeConfirmation        │  │  _lib/providers/             │ │
│  │  3. CoverVariants            │  │  ├── openai.ts (GPT-Image)  │ │
│  │  4. Editor                   │  │  ├── google.ts (Nano Banana) │ │
│  │                              │  │  ├── anthropic.ts (Claude)   │ │
│  │  Engine:                     │  │  └── index.ts (router)       │ │
│  │  - rubric.ts (theme select)  │  │                              │ │
│  │  - formatRouter.ts           │  │  _lib/content/               │ │
│  │  - archetypeSequencer.ts     │  │  ├── longForm.ts             │ │
│  │  - colorSystem.ts            │  │  └── shortForm.ts            │ │
│  └──────────────────────────────┘  └─────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────┐  ┌─────────────────────────────┐ │
│  │  DATA (static JSON)          │  │  SUPABASE (optional)         │ │
│  │                              │  │                              │ │
│  │  cover_variants_data.json    │  │  URL + anon key configured   │ │
│  │  theme_suggestion_rubric.json│  │  Client initialized          │ │
│  │  6 × theme JSON files        │  │  Not wired into flows        │ │
│  └──────────────────────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Monorepo, not micro-services.** Frontend and API in one repo. Vercel deploys both from the same push.

2. **Serverless functions, not a server.** Each API endpoint is a standalone function. No persistent state between requests. No Express, no middleware chain.

3. **Static JSON for angle definitions.** `cover_variants_data.json` contains all 18 angle definitions (6 themes × 3 each). Loaded via `readFileSync` on the server, imported directly on the client.

4. **Client-side rubric engine.** Theme selection runs entirely in the browser (`app/src/engine/rubric.ts`). No API call needed. The rubric scores the brief across multiple passes and recommends a theme.

5. **Lazy-loaded Google provider.** The Google SDK (`@google/genai`) is dynamically imported only when needed, via `await import('./google.js')`. This prevents module-level crashes from blocking the entire provider system (including OpenAI). This was a hard-won fix — see Bug #1 in Section 18.

6. **Base64 image embedding.** Generated images are returned as data URIs (base64 encoded in the JSON response). No separate image hosting, no S3, no CDN. The tradeoff: larger response payloads, but zero infrastructure complexity.

7. **Propagation metadata.** The cover variant selection isn't just cosmetic — each variant carries `propagation_metadata` that shapes the entire carousel's creative direction (narrative frame, slide tone, headline style, object domain progression). This is the core creative framework.

---

## 4. Monorepo Structure & File Map

### Root

```
carousel-generator-deploy/
├── api/                          # Vercel Serverless Functions
├── app/                          # React frontend (SPA)
├── docs/                         # Documentation
│   └── prompts/                  # 7 prompt system reference docs
├── vercel.json                   # Deployment config
├── package.json                  # Root dependencies (API-side: openai, @google/genai, @anthropic-ai/sdk)
├── package-lock.json
├── .env                          # Environment variables (API keys)
├── .gitignore
├── CLAUDE.md                     # AI development context
└── tsconfig.json                 # Root TS config
```

### API Layer (`api/`)

```
api/
├── health.ts                     # GET /api/health
├── content/
│   ├── generate.ts               # POST — Claude generates all slide copy
│   └── regenerate-slide.ts       # POST — Regenerate single slide text
├── images/
│   ├── generate-slide.ts         # POST — Generate single slide image
│   └── generate-carousel.ts      # POST — Batch generate all slide images
├── variants/
│   ├── generate-one.ts           # POST — Generate single cover variant (PRIMARY endpoint)
│   └── generate.ts               # POST — Generate batch cover variants
├── color/
│   └── derive.ts                 # POST — Derive brand color (stub)
├── debug/
│   └── providers.ts              # GET — Provider diagnostics
└── _lib/                         # Shared code (underscore = not exposed as routes)
    ├── providers/
    │   ├── index.ts              # Provider router: model → provider + fallback
    │   ├── openai.ts             # OpenAI GPT-Image-1.5 integration
    │   ├── google.ts             # Google Nano Banana 2 integration
    │   └── anthropic.ts          # Anthropic Claude integration
    ├── content/
    │   ├── longForm.ts           # 14-slide content generation
    │   ├── shortForm.ts          # 3-4 slide content generation
    │   └── validate.ts           # Input validation
    ├── images/
    │   └── promptBuilder.ts      # Image prompt construction helpers
    └── data/
        └── cover_variants_data.json  # 18 angle definitions (3 per theme × 6 themes)
```

### Frontend (`app/src/`)

```
app/src/
├── App.tsx                       # Router: 4 routes (/, /theme-confirmation, /cover-variants, /editor)
├── main.tsx                      # Entry point
├── index.css                     # Tailwind + custom styles
│
├── screens/
│   ├── BriefIntake/
│   │   ├── index.tsx             # Main form with progressive disclosure (126 lines)
│   │   ├── Section1_Brief.tsx    # Topic, Goal, Claim (110 lines)
│   │   ├── Section2_Audience.tsx # Audience, Tone (76 lines)
│   │   ├── Section3_Brand.tsx    # Brand Name, Color, Notes (105 lines)
│   │   ├── Section4_Constraints.tsx # Content Category, Format Preference (69 lines)
│   │   └── components/
│   │       ├── FormField.tsx
│   │       ├── CardSelect.tsx
│   │       └── MultiCardSelect.tsx
│   ├── ThemeConfirmation/
│   │   └── index.tsx             # Theme selection with rubric results (285 lines)
│   ├── CoverVariants/
│   │   └── index.tsx             # Variant generation & selection (563 lines)
│   └── Editor/
│       └── index.tsx             # Full carousel editor (1093 lines)
│
├── store/
│   ├── briefStore.ts             # Brief state + rubric integration (222 lines)
│   ├── carouselStore.ts          # Carousel + variant state (305 lines)
│   └── index.ts                  # Store exports
│
├── api/
│   ├── imageGen.ts               # Cover variant generation client (114 lines)
│   ├── carousel.ts               # Long-form carousel assembly
│   ├── carouselShortForm.ts      # Short-form (NYT Opinion) assembly
│   ├── slideRegeneration.ts      # Single slide regeneration
│   └── export.ts                 # PNG/JSON export
│
├── engine/
│   ├── rubric.ts                 # Theme selection rubric engine
│   ├── formatRouter.ts           # Long/short format routing
│   ├── archetypeSequencer.ts     # Archetype assignment for slides
│   ├── colorSystem.ts            # Brand color derivation
│   ├── contrastCheck.ts          # Text/background contrast validation
│   └── __tests__/
│       ├── formatRouter.test.ts
│       └── rubric.test.ts
│
├── renderer/
│   ├── index.ts                  # Main slide renderer
│   ├── cartoucheRenderer.ts      # Cartouche overlay rendering
│   └── overlayCompositor.ts      # Layer composition
│
├── themes/
│   ├── index.ts                  # Theme loader + helpers (62 lines)
│   ├── dark_museum.json
│   ├── product_elevation.json
│   ├── experience_capture.json
│   ├── nyt_opinion.json
│   ├── sic_toile.json
│   ├── name_archaeology.json
│   └── __tests__/
│       └── loader.test.ts
│
├── types/
│   ├── brief.ts                  # Brief, Goal, Audience, Tone, etc. (75 lines)
│   ├── carousel.ts               # Carousel, Slide types (76 lines)
│   ├── theme.ts                  # ThemeId, Format, Archetype (36 lines)
│   ├── variant.ts                # CoverVariant, ImageModel, PropagationMetadata (46 lines)
│   └── index.ts                  # Type exports
│
├── data/
│   ├── cover_variants_data.json  # Mirror of api/_lib/data/ (for client-side angle lookup)
│   ├── theme_suggestion_rubric.json # Rubric scoring config
│   └── index.ts
│
├── components/
│   └── index.ts                  # Shared UI components
│
├── lib/
│   ├── data.ts                   # Data utilities
│   └── supabase.ts               # Supabase client init (12 lines)
│
└── assets/                       # Static assets
```

---

## 5. User Flow — End to End

### Flow Diagram

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐     ┌────────────┐
│   BriefIntake    │ ──→ │  ThemeConfirmation   │ ──→ │  CoverVariants   │ ──→ │   Editor   │
│       /          │     │ /theme-confirmation  │     │ /cover-variants  │     │  /editor   │
│                  │     │                      │     │                  │     │            │
│ 4-section form   │     │ Rubric result +      │     │ 3 AI-generated   │     │ Full slide │
│ (progressive     │     │ theme recommendation │     │ cover variants   │     │ editor     │
│  disclosure)     │     │ + manual override    │     │ per model        │     │ + export   │
└──────────────────┘     └─────────────────────┘     └──────────────────┘     └────────────┘
       │                          │                           │                       │
       ▼                          ▼                           ▼                       ▼
  briefStore              briefStore.rubricResult      carouselStore.variants   carouselStore.carousel
  .brief                  briefStore.selectedTheme     .selectedVariantId       .slides[]
```

### Screen 1: BriefIntake (`/`)

**File:** `app/src/screens/BriefIntake/index.tsx`

A multi-section form with **progressive disclosure** — each section reveals only after the previous is complete. This prevents overwhelming the user and ensures required fields are filled in order.

**Section 1: Core Brief** (required first)
- **Topic** — min 8 chars. What the carousel is about.
- **Goal** — 7 options:
  - `shift_belief` | `build_authority` | `educate_explain` | `product_awareness` | `emotional_connection` | `strategic_narrative` | `direct_response`
- **Claim** — min 20 chars. The central argument.

**Section 2: Audience & Tone** (reveals when Section 1 complete)
- **Audience** — 8 options:
  - `cold_consumer` | `warm_consumer` | `cold_b2b` | `warm_b2b` | `industry_peers` | `institutional_investors` | `board_executive` | `product_technical`
- **Tone** — pick 1-2 from 8 options:
  - `authoritative_confident` | `provocative_challenging` | `aspirational_elevated` | `empathetic_human` | `technical_precise` | `heritage_institutional` | `mythological_epic` | `documentary_real`

**Section 3: Brand** (reveals when Sections 1-2 complete)
- **Brand Name** — min 1 char. Required.
- **Brand Color** — hex value, optional.
- **Content Notes** — freeform, optional.

**Section 4: Constraints** (reveals when Sections 1-3 complete)
- **Content Category** — 10 options:
  - `product_feature` | `market_analysis` | `customer_story` | `institutional_narrative` | `technical_explanation` | `opinion_argument` | `industry_trend` | `event_milestone` | `cross_border_global` | `security_trust`
- **Format Preference** — 3 options:
  - `engine_decides` | `prefer_short` | `prefer_long`

**On Submit:** Calls `briefStore.runThemeRubric()` → navigates to `/theme-confirmation`.

### Screen 2: ThemeConfirmation (`/theme-confirmation`)

**File:** `app/src/screens/ThemeConfirmation/index.tsx` (285 lines)

Displays the rubric engine's recommendation with confidence level (HIGH/MEDIUM/LOW). If confidence is ≤ MEDIUM, shows an alternative theme.

**6 Available Themes:**

| Theme | Visual Identity | Format |
|-------|----------------|--------|
| Dark Museum | Near-black canvas, museum spotlight, photorealistic 3D objects | Long (14) |
| Product Elevation | Platinum white, luxury product photography | Long (14) |
| Experience Capture | Documentary POV photography, cinematic night | Long (14) |
| NYT Opinion | Bold editorial illustration, broadsheet aesthetic | Short (3-4) |
| SIC Toile | Warm cream, copper-plate engraving, Diderot plates | Long (14) |
| Name Archaeology | Aged parchment, steel engraving, mythological scenes | Long (14) |

**Theme Gates** (hard disqualification):
- `name_archaeology` — fails if brand name has no mythological resonance (checked via `getBrandNameMythScore()`)
- `nyt_opinion` — fails if claim lacks tension language (checked via `hasTensionLanguage()`)

**On Theme Selection:** Sets `briefStore.selectedTheme` → navigates to `/cover-variants`.

### Screen 3: CoverVariants (`/cover-variants`)

**File:** `app/src/screens/CoverVariants/index.tsx` (563 lines)

The core creative decision point. Generates 3 AI cover variants per model run.

**On Mount:**
1. Fires initial generation run with GPT-Image-1.5
2. Creates 3 stub variant cards (shimmer loading state)
3. Parallel API calls to `/api/variants/generate-one` (one per angle)
4. Each card resolves independently (complete, failed, or pending)

**User Actions:**
- Select a model from the segmented control (GPT-Image-1.5 | Nano Banana 2)
- Switch model → appends 3 MORE variants below existing (Midjourney-style stacking)
- Click a variant card to select/deselect
- Click "Try again" on failed variants to retry
- Click "Regenerate" to reset all runs (max 3 regeneration cycles)
- Click "Build Carousel →" to confirm selection

**On Confirm:**
1. `confirmVariant()` — saves selected variant's propagation_metadata to store
2. `setAssembling(true)` — shows progress overlay
3. Calls `assembleLongFormCarousel()` or `assembleShortFormCarousel()` depending on theme format
4. Assembly makes API calls: content generation + image generation for all body slides
5. On completion: `setCarousel(carousel)` → navigates to `/editor`

### Screen 4: Editor (`/editor`)

**File:** `app/src/screens/Editor/index.tsx` (1093 lines)

Full interactive carousel editor. Three-column grid layout.

**Left Panel (220px) — Slide Navigator:**
- Vertical list of all slides with number badge + headline + archetype label
- Click to select, right-click for context menu (Move Up/Down, Duplicate, Delete)
- "+ New Slide" button
- Export buttons (PNG, JSON)

**Center — Canvas:**
- 1080×1350px slide canvas on dot grid background
- Zoom controls (0.25x to 2x)
- Contenteditable text (click headlines/body to edit inline)
- Object placeholders with "Generate Image" buttons

**Right Panel (320px) — Properties:**
- **Design tab:** Font family, size, weight, case, color
- **Image tab:** Image prompt display, model selector, API key input, generate button
- **Info tab:** Archetype name/description, metaphor domain, layout details

**Export:** PNG (html2canvas at 2x), JSON (full carousel state)

---

## 6. State Management

### Two Zustand Stores

#### `briefStore` (`app/src/store/briefStore.ts`, 222 lines)

Manages the creative brief and theme selection.

```typescript
interface BriefStore {
  brief: Partial<Brief>

  // Section setters
  setTopic, setGoal, setClaim, setAudience, setTone,
  setBrandName, setBrandColor, setContentNotes,
  setContentCategory, setFormatPreference

  // Completion checks (progressive disclosure)
  isSection1Complete() → boolean  // topic ≥ 8 chars, goal set, claim ≥ 20 chars
  isSection2Complete() → boolean  // audience set, tone has ≥ 1 selection
  isSection3Complete() → boolean  // brand_name ≥ 1 char
  isSection4Complete() → boolean  // content_category and format_preference set
  isFormComplete() → boolean      // all 4 sections complete

  // Derived signals (used by rubric)
  hasTensionLanguage() → boolean       // Checks claim for tension markers
  getKeywordMatches() → string[]       // Matches topic+claim against keyword clusters
  getBrandNameMythScore() → 'strong' | 'weak' | 'none'  // Mythological resonance

  // Rubric
  rubricResult: RubricResult | null
  runThemeRubric() → void              // Executes rubric engine, sets result

  // Theme
  selectedTheme: ThemeId | null
  setSelectedTheme(themeId) → void
}
```

**Tension language markers:**
```
but, actually, despite, the problem is, most people think, the truth is,
isn't, aren't, wrong, myth, hidden, overlooked, contrary, misunderstood
```

**Brand name myth scoring:**
- `strong` — direct myth keyword match (prometheus, atlas, oracle, phoenix, etc.) or archetype match (explorer, hero, sage, etc.)
- `weak` — root match (jus→justice, forge, quest, ark, neo, gen, sol, nova, terra, etc.)
- `none` — no mythological resonance detected

#### `carouselStore` (`app/src/store/carouselStore.ts`, 305 lines)

Manages variants, selection, carousel assembly, and editor state.

```typescript
interface CarouselStore {
  // Cover variants (CoverVariants screen)
  variants: CoverVariant[]
  selectedVariantId: string | null
  variantsLoading: boolean
  regenerationCount: number              // max 3

  // Variant lifecycle
  initVariantStubs(count) → void         // Create empty cards for initial load
  appendVariantStubs(count, model) → number  // Append cards for second model run
  setVariantComplete(index, variant) → void
  setVariantFailed(index) → void
  selectVariant(id) → void               // Toggle: re-clicking deselects
  retryVariant(index) → void

  // Selection confirmation
  selectedPropagationMetadata: PropagationMetadata | null
  confirmVariant() → void                // Locks propagation metadata for assembly

  // Carousel (Editor screen)
  carousel: Carousel | null
  assembling: boolean
  setCarousel(c) → void
  setAssembling(v) → void

  // Slide editing
  selectedSlideIndex: number
  selectSlide(index) → void
  moveSlide(index, direction: 'up' | 'down') → void
  duplicateSlide(index) → void           // Deep clone with new ID
  deleteSlide(index) → void              // Min: 3 (short-form), 1 (long-form)
  updateSlide(index, updates) → void
  getSlide(index) → Slide | undefined

  // NYT Opinion specific
  addEvidenceSlide() → void              // Insert at index 2, max 4 slides
  removeEvidenceSlide() → void           // Remove evidence slide
}
```

---

## 7. Theme System

### 6 Themes — Visual Identities

#### Dark Museum (`dark_museum`)
| Property | Value |
|----------|-------|
| Canvas | `#0A0A0A` (near-black) |
| Text | `#FFFFFF` primary, `#E0E0E0` secondary |
| Accent | `#C4A44A` (gold) |
| Headline Font | Playfair Display Black (900) |
| Body Font | DM Sans Regular (400) |
| Image Style | Photorealistic 3D-rendered antique objects under museum spotlight |
| Format | Long-form (14 slides) |

#### Product Elevation (`product_elevation`)
| Property | Value |
|----------|-------|
| Canvas | `#F8F5F0` (platinum white) |
| Image Style | Luxury studio product photography, three-point lighting |
| Format | Long-form (14 slides) |

#### Experience Capture (`experience_capture`)
| Property | Value |
|----------|-------|
| Canvas | Cinematic dark (night, urban interior) |
| Image Style | First-person POV documentary photography, practical light only |
| Format | Long-form (14 slides) |

#### NYT Opinion (`nyt_opinion`)
| Property | Value |
|----------|-------|
| Canvas | Bold saturated color field (varies per carousel) |
| Text | `#1A1A1A` (near-black) |
| Headline Font | Lora Bold (700) |
| Body Font | Libre Franklin Bold (700) |
| Image Style | 3 different modes: editorial cartoon / fine art etching / conceptual photography |
| Format | **Short-form (3-4 slides)** — the only short-form theme |

#### SIC Toile (`sic_toile`)
| Property | Value |
|----------|-------|
| Canvas | `#F5F0E8` (warm cream) |
| Accent | `#2A2ECD` (indigo) |
| Headline Font | Playfair Display UPPERCASE (900) |
| Image Style | Single-color copper-plate engraving in indigo, Encyclopedie Diderot aesthetic |
| Format | Long-form (14 slides) |

#### Name Archaeology (`name_archaeology`)
| Property | Value |
|----------|-------|
| Canvas | Aged parchment background |
| Image Style | 19th century steel engraving, mythological/folkloric/historical scenes |
| Format | Long-form (14 slides) |
| Special | Only theme that injects `brand_name` into image prompt |

### Theme JSON Files

Each theme has a JSON definition in `app/src/themes/`. These contain:
- Color palette (primary, secondary, accents)
- Typography (fonts, sizes, weights)
- Layout presets (object positions, text alignment zones)
- Image prompt templates
- Archetype-specific tones and object states
- Metaphor domains and curated object libraries

### Format Routing

| Format | Themes | Slide Count | Archetype System |
|--------|--------|-------------|-----------------|
| Long-form | dark_museum, product_elevation, experience_capture, sic_toile, name_archaeology | 14 | standard_archetypes (14 types) |
| Short-form | nyt_opinion | 3-4 | nyt_archetypes (thesis, evidence, landing) |

Routing logic: `app/src/engine/formatRouter.ts`

---

## 8. Theme Selection Rubric Engine

**File:** `app/src/engine/rubric.ts`

Runs entirely client-side. No API call. The rubric scores the brief across multiple passes to recommend a theme.

### Rubric Data

**File:** `app/src/data/theme_suggestion_rubric.json`

Contains scoring passes with keyword clusters, tone-to-theme mappings, audience-to-theme weights, and content category signals.

### Scoring Dimensions

The rubric produces a score per theme (0-100) by evaluating:

1. **Goal alignment** — which themes fit the user's stated goal
2. **Audience fit** — B2B audiences lean institutional, consumer audiences lean emotional
3. **Tone mapping** — `heritage_institutional` → SIC Toile, `mythological_epic` → Name Archaeology, etc.
4. **Content category** — `opinion_argument` → NYT Opinion, `institutional_narrative` → SIC Toile
5. **Keyword signals** — topic + claim text matched against keyword clusters
6. **Brand name mythology check** — does the brand name carry mythological resonance? (gates Name Archaeology)
7. **Tension language check** — does the claim contain argumentative markers? (gates NYT Opinion)

### Derived Signals (from briefStore)

```typescript
hasTensionLanguage() → boolean
// Scans claim for markers: "but", "actually", "despite", "the problem is",
// "most people think", "the truth is", "wrong", "myth", "hidden", etc.

getKeywordMatches() → string[]
// Matches topic + claim against rubric keyword clusters
// Returns cluster IDs that had hits

getBrandNameMythScore() → 'strong' | 'weak' | 'none'
// Direct match: prometheus, atlas, oracle, phoenix, amazon, etc. → 'strong'
// Archetype match: explorer, hero, sage, creator, sovereign → 'strong'
// Root match: jus, forge, quest, ark, neo, gen, sol, nova, terra → 'weak'
// No match → 'none'
```

### Gate Results

```typescript
interface GateResults {
  name_archaeology: 'passed' | 'failed' | 'bonus'
  nyt_opinion: 'passed' | 'failed' | 'soft_fail'
}
```

- `name_archaeology` fails → theme hidden from recommendations
- `nyt_opinion` fails → theme shown but with "weak fit" warning

### Confidence Levels

| Level | Meaning |
|-------|---------|
| HIGH | Top theme scores 20+ points above second place |
| MEDIUM | Top theme leads by 10-19 points |
| LOW | Top theme leads by < 10 points |

---

## 9. Image Generation Pipeline

### Architecture

```
User selects variant → Frontend calls API → Server builds prompt → Provider generates image → Base64 response

┌──────────────┐     ┌────────────────────┐     ┌──────────────────┐     ┌───────────────┐
│   Frontend    │────→│  /api/variants/    │────→│  Provider Router │────→│  OpenAI API   │
│  imageGen.ts  │     │  generate-one.ts   │     │  providers/      │     │  GPT-Image-1.5│
│               │     │                    │     │  index.ts        │     └───────────────┘
│ POST {        │     │ 1. buildCoverPrompt│     │                  │            or
│   brief,      │     │ 2. buildHeadline   │     │ model routing +  │     ┌───────────────┐
│   theme_id,   │     │ 3. generateImage() │     │ catch-fallback   │────→│  Google API   │
│   angle,      │     │ 4. bufferToDataURI │     │                  │     │  Nano Banana 2│
│   model       │     │ 5. Return variant  │     │                  │     └───────────────┘
│ }             │     └────────────────────┘     └──────────────────┘
└──────────────┘
```

### Provider Router (`api/_lib/providers/index.ts`)

```typescript
export type ImageModel = 'gpt-image-1.5' | 'nano-banana-2'

export async function generateImage(
  prompt: string,
  themeId: string,
  model: ImageModel = 'gpt-image-1.5',
): Promise<Buffer> {
  if (model === 'gpt-image-1.5') {
    // Try OpenAI first, fall back to Google
    if (isOpenAIAvailable()) {
      try { return (await callGPTImage(prompt)).buffer }
      catch { /* fall through */ }
    }
    if (isGoogleKeySet()) {
      const { callNanoBanana } = await loadGoogleProvider()  // lazy import!
      return (await callNanoBanana(prompt)).buffer
    }
    throw new Error('No image provider available')
  }

  if (model === 'nano-banana-2') {
    // Try Google first, fall back to OpenAI
    if (isGoogleKeySet()) {
      try {
        const { callNanoBanana } = await loadGoogleProvider()
        return (await callNanoBanana(prompt)).buffer
      } catch { /* fall through */ }
    }
    if (isOpenAIAvailable()) {
      return (await callGPTImage(prompt)).buffer
    }
    throw new Error('No image provider available')
  }
}
```

**Critical design: Google is lazy-loaded.** `loadGoogleProvider()` uses `await import('./google.js')`. This is not a style choice — it's a stability fix. See Bug #1 in Section 18.

### OpenAI Provider (`api/_lib/providers/openai.ts`)

```typescript
export async function callGPTImage(prompt: string): Promise<GeneratedImage> {
  const response = await getClient().images.generate({
    model: 'gpt-image-1.5',
    prompt,
    n: 1,
    size: '1024x1536',         // Portrait orientation for carousel slides
    quality: 'high',
    response_format: 'b64_json',
  })
  const b64 = response.data[0].b64_json!
  return { buffer: Buffer.from(b64, 'base64'), provider: 'openai_gpt_image', model: 'gpt-image-1.5' }
}
```

### Google Provider (`api/_lib/providers/google.ts`)

```typescript
export async function callNanoBanana(prompt: string): Promise<GeneratedImage> {
  const response = await getClient().models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: prompt,
    config: { responseModalities: ['IMAGE'] },  // Image-only response
  })
  // Extract from candidates[0].content.parts → find part.inlineData.data
  for (const part of candidates[0].content.parts) {
    if (part.inlineData?.data) {
      return { buffer: Buffer.from(part.inlineData.data, 'base64'), ... }
    }
  }
}
```

**Important:** Nano Banana 2 uses `generateContent()` API, NOT the deprecated `generateImages()` API. The old `imagen-3.0-generate-002` model returned 404. See Bug #2 in Section 18.

### Response Format

Images are embedded as base64 data URIs in the JSON response:

```typescript
function bufferToDataURI(buffer: Buffer, mimeType = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}
```

The `thumbnail_url` field in the variant response is a full `data:image/png;base64,...` string. No external image hosting needed.

---

## 10. Prompt Factory — Complete Reference

### Location

`api/variants/generate-one.ts` → `buildCoverPrompt()` function (lines 120-153)

### Topic Tokenization

All themes extract `topicNoun` the same way:

```typescript
const topicWords = topic.split(/\s+/).filter(w => w.length > 3)
const topicNoun = topicWords[0] ?? topic.split(/\s+/)[0] ?? 'object'
```

First word longer than 3 characters from the topic. Falls back to the first word, then `'object'`.

### Theme Prompts

#### Dark Museum
```
{topicNoun} rendered as a luxury museum specimen — precision-machined metal
and glass, {object_state_preference} state, suspended in absolute darkness
with a single overhead spotlight creating a precise cone of warm light (3200K),
deep shadow falling directly below, micro-scratches visible on surface,
photorealistic 3D render, studio product photography quality, no background
elements, object positioned center-canvas, object fills 70% of frame,
ultra-high detail, 8K render quality, composition mode: {composition_mode}
```

#### Product Elevation
```
{topicNoun} product in {object_state_preference} state — luxury studio product
photography, precision metal and glass surface with mirror-polished finish,
three-point studio lighting with key light at 45° upper-left fill at 30%
power right rim light creating thin white highlight on upper edge, pure
platinum white #F8F5F0 background, shot on medium format camera 85mm
equivalent f/4 shallow depth of field, {composition_mode} composition,
commercial product photography, aspirational register, clean isolated product
```

#### Experience Capture
```
First-person POV photograph from {pov_preference} — looking at {topicNoun}
interaction, practical light sources only: screen glow and ambient room light,
silhouette of user visible, {scene_domain} environment, cinematic color grade,
crushed blacks with color retained only in practical light sources, anonymous
perspective, night, urban interior, documentary photography aesthetic, no
faces visible, no studio lighting
```

#### NYT Opinion (BRANCHING — 3 different prompts)

```typescript
const mode = angle.illustration_mode ?? 'editorial_cartoon'
```

**Mode: `editorial_cartoon`** (The Metaphor angle)
```
Flat vector editorial illustration of {topicNoun} as a commentary — bold
saturated colors in a limited palette of 2-3 colors, clean confident outlines
with no gradients, flat color fills only, mid-century editorial illustration
aesthetic — Ben Shahn meets Push Pin Studios, centered scene composition,
white or light background, black outlines throughout, no photographic
elements, no gradients, no shadows — pure flat vector aesthetic
```

**Mode: `fine_art_expressive`** (The Figure angle)
```
Drypoint etching of a figure contemplating {topicNoun} — haunted emotional
register, heavy texture throughout from drypoint burr, figure partially
visible in shadow, muted palette dominated by warm ochre, atmospheric and
expressive rather than precise, somber mood, the mark-making is the emotional
content, museum-quality fine art print aesthetic
```

**Mode: `conceptual_photography`** (The Scene angle, default)
```
Studio chiaroscuro photograph of {topicNoun} as symbolic object — single
dramatic light source from upper left, isolated against pure black background,
strong specular highlight on edges, cinematic and slightly uncomfortable
register, photorealistic, high material quality surface detail
```

#### SIC Toile
```
Single-color copper-plate engraving illustration of a {scene_domain} scene
related to {topicNoun} — rendered entirely in indigo (#2A2ECD) on
white/transparent ground, fine parallel hatching for mid-tone areas,
cross-hatching for deep shadows, stippling for soft textures, clean confident
contour lines, 18th-century French engraving aesthetic — Encyclopedie Diderot
plates register, full narrative scene with ground plane and architectural
setting, {scene_preference}, elaborate but legible at carousel scale, no color
other than this single indigo — no fills, no gradients, pure line and mark work
```

#### Name Archaeology (CONDITIONAL + brand_name injection)
```
19th century steel engraving of {figure_type} scene related to {topicNoun}
and {brand_name} — [IF wit_layer === 'full_anthropomorphized_animal':
  'anthropomorphized animal in period clothing'
ELSE:
  'human figures in historically accurate costume'],
{scene_rule}, crosshatching technique for deep shadows, fine line work on
figures, monochromatic sepia tint on aged parchment background, no color fills
— pure line and mark work, high detail centered composition, encyclopedic
plate aesthetic
```

**Name Archaeology is the only theme that injects `brand_name` into the image prompt.** This connects the visual to the brand's etymological mythology.

### Variable Reference

| Variable | Source | Used In |
|----------|--------|---------|
| `topicNoun` | First word >3 chars from brief.topic | All themes |
| `angle.composition_mode` | Angle definition | dark_museum, product_elevation |
| `angle.object_state_preference` | Angle definition | dark_museum, product_elevation |
| `angle.pov_preference` | Angle definition | experience_capture |
| `angle.scene_domain` | Angle definition | experience_capture, sic_toile |
| `angle.scene_preference` | Angle definition | sic_toile |
| `angle.illustration_mode` | Angle definition | nyt_opinion (branching) |
| `angle.figure_type` | Angle definition | name_archaeology |
| `angle.wit_layer` | Angle definition | name_archaeology (conditional) |
| `angle.scene_rule` | Angle definition | name_archaeology |
| `brief.brand_name` | User brief | name_archaeology only |

---

## 11. Headline Generation

### Location

`api/variants/generate-one.ts` → `buildHeadline()` function (lines 39-118)

### How It Works

Each angle defines a `headline_structure` template with bracket tokens. The function:

1. Extracts `topicNoun`, `brandName`, `shortClaim` from the brief
2. Pattern-matches the `headline_structure` against known templates
3. Substitutes tokens with brief-derived values
4. Falls back to `angle.headline_example` if no pattern matches

### Template Patterns (14 total)

| Pattern Match | Substitution | Example |
|---------------|-------------|---------|
| `[Object name]` + `[Single declarative claim.]` | topicNoun + shortClaim | "Passkeys. The end of the stolen credential." |
| `[Old state]` + `[New state]` | "The old {topic} fails" + "{brand} doesn't." | "The old passkey fails. Juspay doesn't." |
| `[Scope]` | 3× scopes joined | "Every passkey. Every device. Every market." |
| `Before [state]` / `After, [better state]` | brandName / shortClaim | "Before Juspay. After, frictionless payments." |
| `[Number/precision]` / `[Absence]` | "One {topic}" / "No friction" / "No compromise." | "One passkey. No friction. No compromise." |
| `In [context]` / `On [context]` | "In every {topic}" / "On every device." | "In every passkey. On every device." |
| `[The moment named...]` | Dynamic phrase | "The passkey that almost didn't go through." |
| `[The unexpected speed...]` | Dynamic phrase | "Faster than you expected passkey to be." |
| `[The same story...]` | Dynamic phrase | "What it looks like from the other side of passkey." |
| `The [Unexpected Adj]` | "The Invisible Cost of the Familiar {topic}." | "The Invisible Cost of the Familiar Passkeys." |
| `What We Don't Understand About [X]` | topicNoun substitution | "What We Don't Understand About Passkeys." |
| `[Question]? [Answer].` | "Is Your {topic} Secure? {shortClaim}." | "Is Your Passkeys Secure? The end of OTPs." |
| `[Activity]` / `[Historical claim.]` | topicNoun / "The oldest infrastructure." | "Passkeys. The oldest infrastructure." |
| `Built to [purpose]` | Dynamic | "Built to endure. As the great systems of passkeys were." |
| `[routes/territory]` | Dynamic | "The routes of passkeys are being drawn now." |
| `[Hero's act]` | Dynamic | "The passkeys given freely. The Juspay advantage." |
| `[animal archetype noun]` | Dynamic | "The fox always finds a way through passkeys." |
| `[beneficiary]` | Dynamic | "Every user. Every passkey. Every market." |

---

## 12. Content Generation Pipeline

### How Carousel Assembly Works

After the user selects a cover variant and clicks "Build Carousel →":

1. **Frontend** calls the appropriate assembly function:
   - `assembleLongFormCarousel(brief, themeId, selectedVariant)` for 5 of 6 themes
   - `assembleShortFormCarousel(brief, selectedVariant)` for NYT Opinion

2. **Assembly function** makes two API calls:
   - `POST /api/content/generate` → Claude generates copy for all slides
   - `POST /api/images/generate-carousel` → generates images for all slides

3. **Content generation** uses the selected variant's `propagation_metadata`:

```typescript
interface PropagationMetadata {
  creative_angle: string        // e.g., "technical_authority"
  narrative_frame: string       // e.g., "examination_reveals_truth"
  body_slide_tone?: string      // e.g., "methodical_escalation"
  object_domain_lock?: string   // e.g., "match_cover_domain"
  headline_style?: string       // e.g., "declarative_technical"
  state_progression?: string[]  // e.g., ["failing", "outdated", "broken", "opportunity", ...]
  scene_domain_arc?: string[]   // For toile/archaeology themes
  quote_structure_preference?: string[]  // For NYT Opinion
  wit_layer_consistency?: string // For name_archaeology
}
```

4. **The metadata shapes everything:**
   - `creative_angle` → determines the rhetorical strategy for all headlines
   - `narrative_frame` → determines the story arc across 14 slides
   - `body_slide_tone` → sets the emotional progression
   - `state_progression` → sequence of object states (failing → outdated → broken → innovative → gleaming)
   - `object_domain_lock` → whether body slides use the same metaphor domain as the cover or alternate

### The Core Insight

**Choosing a cover variant isn't cosmetic — it's choosing the entire creative direction.** Two users with the same brief who choose different cover angles will get fundamentally different carousels. The propagation metadata is the creative framework that ensures design coherence from cover to CTA.

---

## 13. Multi-Model Selector & Midjourney-Style Stacking

### UI Design

The CoverVariants screen has a **segmented control** (ModelSelector component):

```
┌──────────────────────────────────────┐
│  [GPT-Image-1.5] │ Nano Banana 2    │
└──────────────────────────────────────┘
```

- Active model: dark background, white text
- Already-ran model: grayed out with checkmark, disabled
- Disabled during generation

### Multi-Run Architecture

```typescript
interface Run {
  model: ImageModel
  startIndex: number  // Position in variants[] array
  count: number       // Always 3
}
```

**State:** `runs: Run[]` — tracks all generation runs

**Flow:**
1. On mount → `fireRun('gpt-image-1.5', isInitial: true)` → creates 3 stubs at index 0-2
2. User clicks Nano Banana 2 → `fireRun('nano-banana-2', isInitial: false)` → appends 3 stubs at index 3-5
3. Each run renders with a `RunHeader` showing colored dot + model label:
   - Green dot (`.bg-emerald-400`) = GPT-Image-1.5
   - Violet dot (`.bg-violet-400`) = Nano Banana 2
4. Variant cards within each run use `staggered entry` animation (150ms delay between cards)
5. Selection works across ALL runs — user can pick from any run

### `appendVariantStubs()` (store method)

```typescript
appendVariantStubs: (count, model) => {
  const existing = get().variants
  const startIndex = existing.length
  const stubs: CoverVariant[] = Array.from({ length: count }, (_, i) => ({
    variant_id: `stub-${startIndex + i}-${Date.now()}`,
    generation_status: 'pending',
    model,
    // ... stub fields
  }))
  set({ variants: [...existing, ...stubs], variantsLoading: true })
  return startIndex  // Caller needs this for callback routing
}
```

### Retry Logic

When a variant fails and user clicks "Try again":

```typescript
async function handleRetry(globalIndex: number) {
  // Find which run this variant belongs to
  const run = runs.find(r => globalIndex >= r.startIndex && globalIndex < r.startIndex + r.count)
  const model = run?.model ?? 'gpt-image-1.5'
  const angleIndex = run ? globalIndex - run.startIndex : globalIndex

  // Retry with correct model for that run
  const result = await retrySingleVariant(brief, themeId, angleIndex, model)
  // ...
}
```

This ensures retries use the same model as the original run, not the currently-active model selector state.

---

## 14. Editor Architecture

### Grid Layout

```css
grid-template-columns: 220px 1fr 320px;
height: 100dvh;
```

### Left Panel — Slide Navigator (220px)

- White background, right border (`#e5e7eb`)
- Active slide: blue left border + subtle blue bg
- Slide items: number badge (pill) + headline (truncated) + archetype label
- Right-click: context menu (Move Up, Move Down, Duplicate, Delete)
- Bottom: Export PNG, Export JSON buttons

### Center — Canvas

- Dot grid background (`#f7f8fa` with blue dots)
- 1080×1350px slide canvas, absolute positioned, scaled by zoom
- Contenteditable text (click to edit)
- Object placeholders with generate buttons
- Floating zoom bar at bottom

### Right Panel — Properties (320px)

- 3-tab interface with animated underline
- **Design:** Typography controls (font family, size, weight, case, color)
- **Image:** Prompt display, model selector (per-slide), API key input, generate button
- **Info:** Read-only archetype details, metaphor domain, layout metadata

### Export System

- **PNG:** Uses html2canvas at 2x scale → downloads `.png`
- **JSON:** Serializes full carousel state (slides + metadata) → downloads `.json`
- **Import:** Load JSON → restore carousel + brief into stores

---

## 15. Type System

### Brief (`app/src/types/brief.ts`)

```typescript
interface Brief {
  brief_id: string
  created_at: string

  // Section 1
  topic: string
  goal: GoalKey               // 7 options
  claim: string

  // Section 2
  audience: AudienceKey       // 8 options
  tone: [ToneKey] | [ToneKey, ToneKey]  // 1-2 selections from 8

  // Section 3
  brand_name: string
  brand_color: string | null
  content_notes: string | null

  // Section 4
  content_category: ContentCategoryKey  // 10 options
  format_preference: FormatPreferenceKey  // 3 options

  // Engine outputs
  rubric_scores?: RubricScores
  recommended_theme?: ThemeId
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW'
  gate_results?: GateResults
  selected_theme?: ThemeId
  format?: CarouselFormat
}
```

### CoverVariant (`app/src/types/variant.ts`)

```typescript
type ImageModel = 'gpt-image-1.5' | 'nano-banana-2'

interface CoverVariant {
  variant_id: string
  brief_id: string
  theme: string
  angle_key: string
  angle_name: string
  angle_description: string
  cover_slide: VariantCoverSlide
  propagation_metadata: PropagationMetadata
  generation_status: 'pending' | 'complete' | 'failed'
  selected: boolean
  created_at: string
  model?: ImageModel
}

interface VariantCoverSlide {
  composition_mode: string
  headline: string
  headline_size: number
  text_position: string
  image_prompt: string
  thumbnail_url?: string      // base64 data URI
  // ... optional fields
}

interface PropagationMetadata {
  creative_angle: string
  narrative_frame: string
  body_slide_tone?: string
  object_domain_lock?: string
  headline_style?: string
  state_progression?: string[]
  scene_domain_arc?: string[]
  quote_structure_preference?: string[]
  wit_layer_consistency?: string
}
```

### Angle Definitions (18 total)

Stored in `api/_lib/data/cover_variants_data.json` and `app/src/data/cover_variants_data.json` (mirrors):

| Theme | Angle 1 | Angle 2 | Angle 3 |
|-------|---------|---------|---------|
| dark_museum | The Specimen (`the_specimen`) | The Contrast (`the_contrast`) | The Consequence (`the_consequence`) |
| product_elevation | The Arrival (`the_arrival`) | The Detail (`the_detail`) | The Scale (`the_scale`) |
| experience_capture | The Friction Moment (`the_friction_moment`) | The Relief Moment (`the_relief_moment`) | The Merchant Side (`the_merchant_side`) |
| nyt_opinion | The Metaphor (`the_metaphor`) | The Figure (`the_figure`) | The Scene (`the_scene`) |
| sic_toile | The Commerce Hall (`the_commerce_hall`) | The Institution (`the_institution`) | The Navigation (`the_navigation`) |
| name_archaeology | The Literal Hero (`the_literal_hero`) | The Unexpected Vessel (`the_unexpected_vessel`) | The Consequence (`the_consequence`) |

---

## 16. Environment & Deployment

### Required Environment Variables

| Variable | Purpose | Required? | Used Where |
|----------|---------|-----------|-----------|
| `OPENAI_API_KEY` | GPT-Image-1.5 image generation | Yes (for image gen) | Server-side only |
| `GOOGLE_API_KEY` | Nano Banana 2 image generation | Yes (for image gen) | Server-side only |
| `ANTHROPIC_API_KEY` | Claude content generation | Yes (for carousel assembly) | Server-side only |
| `VITE_SUPABASE_URL` | Supabase project URL | No (optional) | Frontend |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | No (optional) | Frontend |

### Vercel Configuration (`vercel.json`)

```json
{
  "buildCommand": "cd app && npm install && npm run build",
  "outputDirectory": "app/dist",
  "installCommand": "npm install && cd app && npm install",
  "framework": "vite",
  "functions": {
    "api/**/*.ts": { "maxDuration": 60 }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

**Key detail:** `maxDuration: 60` seconds for API functions. Image generation can take 5-15 seconds per call, and the batch endpoint generates multiple images in parallel.

### Dependencies

**Root `package.json` (API-side):**
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.78.0",
    "@google/genai": "^1.44.0",
    "@vercel/node": "^5.1.8",
    "openai": "^6.25.0"
  }
}
```

**`app/package.json` (frontend):**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.49.1",
    "@tailwindcss/vite": "^4.2.1",
    "html2canvas": "^1.4.1",
    "jszip": "^3.10.1",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.13.1",
    "tailwindcss": "^4.2.1",
    "zustand": "^5.0.11"
  }
}
```

### Local Development

```bash
# Frontend only (API won't work locally — needs Vercel runtime)
cd carousel-generator-deploy/app
npm install
npm run dev
```

API functions require Vercel's serverless runtime. To test API changes, push to Vercel or use the `carousel-generator-v2` Express variant.

---

## 17. Design Decisions & Rationale

### Why Vercel Serverless (not Express server)?

The original v2 used Express. Moved to Vercel serverless because:
- Zero server management
- Auto-scaling for image generation (each call takes 5-15s)
- Same-origin deployment (frontend + API on one domain, no CORS)
- Push-to-deploy workflow

### Why Zustand (not Redux, Context, etc.)?

- Minimal boilerplate — store is just a function
- No providers needed — `useStore()` anywhere
- Supports computed values and middleware
- Tiny bundle size (~2KB)

### Why base64 data URIs for images (not URLs)?

- No image hosting infrastructure needed
- No S3, no CDN, no signed URLs
- Images travel with the variant data
- Trade-off: larger payloads, but zero infrastructure complexity
- Works offline once loaded

### Why client-side rubric (not API call)?

- Zero latency — scores appear instantly
- No API cost for theme selection
- Rubric logic is deterministic — no AI needed for scoring
- Easier to iterate on scoring weights

### Why 3 angles per theme (not more/fewer)?

- 3 is the Goldilocks number for creative decisions
- Enough variety to offer genuine choice
- Not so many that selection becomes paralysis
- Each angle represents a genuinely different creative strategy (not just aesthetic variation)

### Why propagation metadata?

The biggest design decision in the system. When a user selects a cover variant, they're not just picking an image — they're choosing:
- How the story unfolds (narrative_frame)
- What emotional arc the slides follow (body_slide_tone)
- What visual domain the objects come from (object_domain_lock)
- What headline style carries through (headline_style)
- What sequence of object states appears (state_progression)

Without propagation, body slides would have no creative coherence with the cover. The cover variant would be decoration, not direction.

### Why two image models?

- GPT-Image-1.5 produces more photorealistic output (better for dark_museum, product_elevation)
- Nano Banana 2 produces more illustrative output (better for editorial themes)
- Model comparison gives users agency and variety
- Fallback ensures generation doesn't fail if one provider is down

---

## 18. Bugs Fixed — Do Not Regress

### Bug 1: Module crash from top-level Google import (CRITICAL)

**Commit:** `c4ec1bd` (2026-03-12)

**What happened:** `api/_lib/providers/index.ts` had a static import:
```typescript
// BROKEN — if @google/genai fails to load, ENTIRE module crashes
import { callNanoBanana } from './google.js'
```
If the Google SDK failed to initialize (missing key, module error, etc.), the entire provider module crashed. This blocked ALL image generation — including OpenAI, which had nothing to do with Google.

**Fix:** Made Google provider lazy-loaded via dynamic `import()`:
```typescript
async function loadGoogleProvider() {
  const mod = await import('./google.js')
  return { callNanoBanana: mod.callNanoBanana, isGoogleAvailable: mod.isGoogleAvailable }
}
```

**Why it matters:** Provider isolation. One broken provider must never take down another.

### Bug 2: Deprecated Google Imagen model returning 404

**Commit:** `f0c8f97` (2026-03-13)

**What happened:** Original code used `models.generateImages()` with `imagen-3.0-generate-002`. This model was deprecated and returned 404 errors.

**Fix:** Complete rewrite of `google.ts` to use `models.generateContent()` with `gemini-3.1-flash-image-preview` and `responseModalities: ['IMAGE']`.

**Key distinction:** `generateContent()` (correct) vs `generateImages()` (old, broken).

### Bug 3: `import ... with { type: 'json' }` unsupported on Vercel

**Commit:** `f5e2212` (2026-03-12)

**What happened:** Code used ES import assertions:
```typescript
import data from './data.json' with { type: 'json' }  // BROKEN on Vercel
```

**Fix:** Replaced with:
```typescript
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
const data = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), './data.json'), 'utf-8'))
```

### Bug 4: `.trim()` on undefined brief fields crashing variants 2 & 3

**Commit:** `e0854c6` (2026-03-13)

**What happened:** `buildHeadline()` and `buildCoverPrompt()` called `.trim()` on `brief.topic`, `brief.claim`, and `brief.brand_name`. The frontend sends `Partial<Brief>` — these fields could be undefined.

**Fix:** Two-layer defense:
1. **Runtime validation:** Return 400 if required fields missing
2. **Defensive defaults:** `(brief.topic ?? '').trim() || 'Product'`

### Bug 5-8: Original Python-era bugs

5. **Cover slide had 4 objects** → `cover_hook.object_count` now `1`
6. **"SWIPE →" CTA on cover** → suppressed when `archetype.key === 'cover_hook'`
7. **"OTPs" → "Otps"** → `smart_title_case()` preserves acronyms + plurals
8. **Pixel positions broke layout** → Fixed with CSS Grid zones

---

## 19. Known Issues & Unverified

### CRITICAL: Image Generation Unverified on Production

The `.trim()` fix was pushed (commit `e0854c6`, March 13) but **no one has verified that image generation actually works on production** after this fix. This is the single most important item to test.

**What needs verification:**
- [ ] GPT-Image-1.5 generates images for dark_museum
- [ ] GPT-Image-1.5 generates images for product_elevation
- [ ] GPT-Image-1.5 generates images for experience_capture
- [ ] Nano Banana 2 generates images for nyt_opinion
- [ ] Nano Banana 2 generates images for sic_toile
- [ ] Nano Banana 2 generates images for name_archaeology
- [ ] All 3 variants generate (not just variant 1)
- [ ] Retry button works on failed variants
- [ ] Model selector stacking works (append second model's results below first)
- [ ] Fallback works (if primary provider fails, secondary takes over)

### Content Generation Untested

Claude-powered copy generation (`/api/content/generate`) has NOT been tested end-to-end on the deployed instance. The full flow: CoverVariants → "Build Carousel →" → Editor with populated slides — is untested.

### Supabase Not Wired

- Client initialized in `app/src/lib/supabase.ts`
- URL + anon key configured in `.env`
- Migration SQL exists
- **Not used in any production flow.** All state is in-memory Zustand.

### No Local API Development

Vercel serverless functions don't run locally with `npm run dev`. Testing API changes requires:
- Pushing to Vercel (slow feedback loop)
- OR using the `carousel-generator-v2` Express variant (which may drift from the deploy version)

### No Error Recovery for Assembly

If carousel assembly fails midway (content gen succeeds but image gen fails), there's no partial recovery. The user must start over from CoverVariants.

---

## 20. What's Planned

| Priority | Feature | Status | Notes |
|----------|---------|--------|-------|
| **P0** | Verify image generation on production | Not done | Most critical item |
| **P0** | End-to-end flow test | Not done | Brief → Theme → Variants → Assembly → Editor |
| **P1** | Supabase persistence | Infra ready | Wire carousel save/load to DB |
| **P1** | Figma export | Not started | Engine generates `figma_layers` but nothing consumes them |
| **P1** | Undo/redo | Not started | History stack for editor |
| **P2** | Drag-and-drop slide reorder | Not started | Currently right-click → Move Up/Down |
| **P2** | Real logo upload | Not started | Currently "LOGO" placeholder text |
| **P2** | Batch image regeneration | Not started | Currently one image at a time in editor |
| **P3** | Responsive editor | Not started | Fixed grid, needs 1200px+ |
| **P3** | Cloud persistence beyond Supabase | Not started | — |

---

## 21. Prompt System Documentation

Complete per-theme prompt reference docs exist at `docs/prompts/`:

| File | Theme | Contents |
|------|-------|----------|
| `prompt-system-architecture.md` | Overview | Data flow, topic tokenization, model routing, theme summary |
| `dark-museum.md` | Dark Museum | 3 angles, example prompts, propagation metadata |
| `product-elevation.md` | Product Elevation | 3 angles, example prompts, legacy template |
| `experience-capture.md` | Experience Capture | 3 angles, POV preferences, scene domains |
| `nyt-opinion.md` | NYT Opinion | 3 branching prompts, illustration modes |
| `sic-toile.md` | SIC Toile | 3 angles, scene domains, Diderot references |
| `name-archaeology.md` | Name Archaeology | 3 angles, conditional logic, animal selection, brand_name |

Each doc includes:
- Visual identity description
- Full prompt template with variable placeholders
- Variable reference table (source, fallback)
- All 3 angles with field values and example prompts
- Headline structure and examples
- Propagation metadata table
- Legacy template comparison (from Python v1)
- Notes on special behavior

---

## 22. Testing Checklist

### Image Generation (UNVERIFIED — TOP PRIORITY)

- [ ] Navigate to CoverVariants with a complete brief
- [ ] Wait for 3 GPT-Image-1.5 variants to generate
- [ ] Verify all 3 show thumbnail images (not error states)
- [ ] Click Nano Banana 2 model → verify 3 more variants appear below
- [ ] Click "Try again" on a failed variant → verify retry works
- [ ] Select a variant → click "Build Carousel →" → verify assembly completes

### Full User Flow

- [ ] Fill complete brief on BriefIntake → "Find My Theme →" button enables
- [ ] ThemeConfirmation shows rubric result with confidence level
- [ ] Select theme → navigate to CoverVariants
- [ ] CoverVariants generates 3 variants on mount
- [ ] Select variant → "Build Carousel →" → assembly overlay appears
- [ ] Assembly completes → Editor loads with populated slides
- [ ] Editor: click slide in navigator → canvas updates
- [ ] Editor: click text on canvas → contenteditable activates
- [ ] Editor: Export PNG → downloads valid PNG
- [ ] Editor: Export JSON → downloads valid JSON

### Theme-Specific Tests

- [ ] Dark Museum: photorealistic 3D object in darkness
- [ ] Product Elevation: luxury product on white background
- [ ] Experience Capture: first-person POV, night, no faces
- [ ] NYT Opinion: varies by angle (flat vector / etching / photography)
- [ ] SIC Toile: indigo engraving on cream
- [ ] Name Archaeology: steel engraving with brand name context

### Edge Cases

- [ ] Brief with very short topic (exactly 8 chars) → topicNoun extraction works
- [ ] Brief with no brand color → generation still succeeds
- [ ] Brief with tension language → NYT Opinion gate passes
- [ ] Brief with mythological brand name → Name Archaeology gate passes
- [ ] Regenerate 3 times → "Max regenerations reached" appears
- [ ] Select variant from second model run → correct propagation metadata used

---

## 23. Key Functions Reference

### API — Image Generation

```
api/variants/generate-one.ts
├── buildCoverPrompt(angle, brief, themeId) → string     # Theme-specific prompt factory
├── buildHeadline(angle, brief) → string                  # Template-based headline generator
└── handler(req, res)                                     # POST endpoint

api/_lib/providers/index.ts
├── generateImage(prompt, themeId, model) → Buffer        # Model router + fallback
├── bufferToDataURI(buffer, mimeType) → string            # Base64 data URI conversion
└── loadGoogleProvider() → { callNanoBanana, ... }        # Lazy dynamic import

api/_lib/providers/openai.ts
└── callGPTImage(prompt) → GeneratedImage                 # OpenAI images.generate()

api/_lib/providers/google.ts
└── callNanoBanana(prompt) → GeneratedImage               # Google models.generateContent()
```

### Frontend — State & API

```
app/src/store/briefStore.ts
├── setBrief, setTopic, setGoal, setClaim, ...            # Field setters
├── isSection1Complete ... isFormComplete                  # Validation
├── hasTensionLanguage() → boolean                        # Rubric signal
├── getKeywordMatches() → string[]                        # Rubric signal
├── getBrandNameMythScore() → 'strong'|'weak'|'none'      # Rubric signal
├── runThemeRubric() → void                               # Execute rubric engine
└── setSelectedTheme(themeId) → void

app/src/store/carouselStore.ts
├── initVariantStubs(count) → void                        # Create empty cards
├── appendVariantStubs(count, model) → number             # Append for second model
├── setVariantComplete(index, variant) → void
├── setVariantFailed(index) → void
├── selectVariant(id) → void                              # Toggle selection
├── confirmVariant() → void                               # Lock propagation metadata
├── setCarousel(carousel) → void
├── moveSlide, duplicateSlide, deleteSlide                # Editor operations
└── addEvidenceSlide, removeEvidenceSlide                 # NYT Opinion only

app/src/api/imageGen.ts
├── generateCoverVariants(brief, themeId, model, callbacks)  # Parallel 3-variant generation
├── generateOneVariant(brief, themeId, angle, index, model)  # Single variant API call
└── retrySingleVariant(brief, themeId, angleIndex, model)    # Retry failed variant

app/src/engine/rubric.ts
└── runRubric(brief) → RubricResult                       # Client-side theme scoring
```

---

*End of handoff document. Last updated: March 16, 2026.*
