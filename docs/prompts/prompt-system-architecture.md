# Image Generation Prompt System — Architecture

> Last updated: March 2026
> Source of truth: `api/variants/generate-one.ts` → `buildCoverPrompt()`

---

## Overview

The carousel generator produces **cover slide images** for LinkedIn carousels across 6 visual themes. Each theme has 3 "angles" (creative directions), producing 3 variant cover images per generation run.

The prompt system is **template-based with variable substitution** — not LLM-generated. Prompts are deterministic: same inputs always produce the same prompt string.

---

## Data Flow

```
User Brief                    Angle Definition                Theme ID
(topic, claim, brand_name)    (from cover_variants_data.json) (dark_museum, etc.)
         \                        |                          /
          \                       |                         /
           ↓                      ↓                        ↓
      ┌─────────────────────────────────────────────────────┐
      │            buildCoverPrompt(angle, brief, themeId)  │
      │                                                     │
      │  1. Extract topicNoun from brief.topic              │
      │  2. switch(themeId) → select template               │
      │  3. Substitute angle fields into template           │
      │  4. Return final prompt string                      │
      └──────────────────────┬──────────────────────────────┘
                             │
                    (prompt is a plain string)
                             │
                    ┌────────┴────────┐
                    ↓                 ↓
             GPT-Image-1.5     Nano Banana 2
             (OpenAI)          (Google Gemini)
                    │                 │
                    ↓                 ↓
              Same prompt.     Same prompt.
              No modification. No modification.
```

---

## Topic Tokenization

The user's `topic` field is the primary input to all prompts:

```typescript
const topic = (brief.topic ?? '').trim() || 'Product'
const topicWords = topic.split(/\s+/).filter((w) => w.length > 3)
const topicNoun = topicWords[0] ?? topic.split(/\s+/)[0] ?? 'object'
```

**Example:** `"Passkey-based authentication for Indian payments"` → topicNoun = `"Passkey-based"`

This is crude but deterministic. The first word longer than 3 characters becomes the subject of the image prompt.

---

## User Input Usage

| Brief Field | Used in Image Prompt? | Where? |
|------------|----------------------|--------|
| `topic` | **Yes** | Tokenized → `topicNoun`, injected into every theme prompt |
| `claim` | **No** | Only used in `buildHeadline()` for text, not image generation |
| `brand_name` | **Partially** | Only in `name_archaeology` theme prompt |
| `brand_color` | **No** | Not used in any prompt |
| `content_notes` | **No** | Not used in any prompt |

---

## Angle System

Each theme defines 3 angles in `api/_lib/data/cover_variants_data.json`. Angles provide:

| Field | Used in Prompt? | Themes That Use It |
|-------|----------------|-------------------|
| `composition_mode` | Yes | dark_museum, product_elevation |
| `object_state_preference` | Yes | dark_museum, product_elevation |
| `pov_preference` | Yes | experience_capture |
| `scene_domain` | Yes | experience_capture, sic_toile |
| `illustration_mode` | Yes (switches entire prompt) | nyt_opinion |
| `scene_preference` | Yes | sic_toile |
| `figure_type` | Yes | name_archaeology |
| `wit_layer` | Yes (conditional logic) | name_archaeology |
| `scene_rule` | Yes | name_archaeology |

---

## Model Routing

```
User selects model on CoverVariants screen
         │
         ↓
┌─────────────────────────────────────┐
│  generateImage(prompt, theme, model) │
│  api/_lib/providers/index.ts         │
│                                      │
│  if model === 'gpt-image-1.5':      │
│    → OpenAI images.generate()        │
│    → fallback: Nano Banana 2         │
│                                      │
│  if model === 'nano-banana-2':       │
│    → Google generateContent()        │
│    → fallback: GPT-Image-1.5        │
└─────────────────────────────────────┘
```

**Neither provider modifies the prompt.** The exact string from `buildCoverPrompt()` is sent as-is.

- **OpenAI** (`api/_lib/providers/openai.ts`): `images.generate({ model: 'gpt-image-1.5', prompt, ... })`
- **Google** (`api/_lib/providers/google.ts`): `models.generateContent({ model: 'gemini-3.1-flash-image-preview', contents: prompt, config: { responseModalities: ['IMAGE'] } })`

---

## Theme Prompt Summary

| Theme | Aesthetic | Prompt Logic | Key Substitutions |
|-------|----------|-------------|-------------------|
| [dark_museum](./dark-museum.md) | Photorealistic 3D museum specimen | Single template | topicNoun, object_state, composition_mode |
| [product_elevation](./product-elevation.md) | Luxury studio product photography | Single template | topicNoun, object_state, composition_mode |
| [experience_capture](./experience-capture.md) | First-person POV documentary | Single template | topicNoun, pov_preference, scene_domain |
| [nyt_opinion](./nyt-opinion.md) | Editorial illustration (3 modes) | **Branching** on illustration_mode | topicNoun only |
| [sic_toile](./sic-toile.md) | Copper-plate engraving | Single template | topicNoun, scene_domain, scene_preference |
| [name_archaeology](./name-archaeology.md) | 19th century steel engraving | **Conditional** on wit_layer | topicNoun, brand_name, figure_type, scene_rule |

---

## Headline Generation (Separate System)

`buildHeadline()` generates text headlines — **not image prompts**. It uses:
- `angle.headline_structure` (template with bracket placeholders)
- `brief.topic` → topicNoun
- `brief.brand_name`
- `brief.claim` → shortClaim

14 distinct headline patterns are matched via `.includes()` checks against the structure template. This is a text-only system that runs alongside image generation.

---

## Legacy Systems (Not in Production)

| System | Location | Status |
|--------|----------|--------|
| `image_prompt_template` in theme JSONs | `app/src/themes/*.json` | Reference documentation only. Uses `{name}`, `{state}`, `{bg}`, `{material}` placeholders — different substitution system. |
| Python engine `generate_image_prompt()` | `engine/carousel_engine.py` | Original v1 engine. Not part of Vercel deployment. |

---

## File Map

| File | Role |
|------|------|
| `api/variants/generate-one.ts` | **buildCoverPrompt()** — the live prompt factory |
| `api/_lib/data/cover_variants_data.json` | Angle definitions for all 6 themes (3 angles each) |
| `api/_lib/providers/index.ts` | Model router (GPT-Image-1.5 / Nano Banana 2) |
| `api/_lib/providers/openai.ts` | OpenAI provider — sends prompt unchanged |
| `api/_lib/providers/google.ts` | Google provider — sends prompt unchanged |
| `app/src/themes/*.json` | Legacy theme prompt templates (reference only) |
