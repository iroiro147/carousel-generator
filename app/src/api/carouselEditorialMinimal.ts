import type { Brief } from '../types/brief'
import type { Carousel, Slide } from '../types/carousel'
import type { CoverVariant } from '../types/variant'

// ─── Editorial Minimal slide type specs ─────────────────────────────────────
// Stage 1 decides the recommended_sequence (e.g., ["F","C","A","D","B"]).
// These specs define the archetype metadata for each type letter.

const SLIDE_TYPE_SPECS: Record<string, {
  name: string
  description: string
  notes: string
  title_size: number
  body_size: number
  has_photo: boolean
}> = {
  A: {
    name: 'A',
    description: 'Minimal White — DM Sans 300 on white. The quietest slide.',
    notes: 'Clear, measured statement. 8-12 words. Optional body.',
    title_size: 76,
    body_size: 38,
    has_photo: false,
  },
  B: {
    name: 'B',
    description: 'Dark Mode — DM Sans 300 on near-black (#1A1A1A).',
    notes: 'Same register as A but inverted. Slight edge.',
    title_size: 76,
    body_size: 38,
    has_photo: false,
  },
  C: {
    name: 'C',
    description: 'Flat Blue — DM Sans 300 on #1669D3.',
    notes: 'A claim that deserves emphasis. Required body, 1-2 sentences.',
    title_size: 76,
    body_size: 38,
    has_photo: false,
  },
  D: {
    name: 'D',
    description: 'Card Frame — DM Sans 400 on light grey with photo in card.',
    notes: 'Descriptive headline, names what the photo shows. Caption-like body.',
    title_size: 52,
    body_size: 38,
    has_photo: true,
  },
  E: {
    name: 'E',
    description: 'Split Editorial — EB Garamond 400, dark olive header, photo below.',
    notes: 'Serif register. More literary. Required body, 2 sentences.',
    title_size: 84,
    body_size: 38,
    has_photo: true,
  },
  F: {
    name: 'F',
    description: 'Full-Bleed Bold — DM Sans 800 uppercase over photo. #EEFF88 accent.',
    notes: 'The boldest statement. UPPERCASE. Maximum 5 words. NO body text.',
    title_size: 96,
    body_size: 0,
    has_photo: true,
  },
  G: {
    name: 'G',
    description: 'Photo Overlay — EB Garamond 400 over photo with gradient.',
    notes: 'The reflective close. A sentence that lingers. Optional body.',
    title_size: 84,
    body_size: 38,
    has_photo: true,
  },
}

// ─── Default sequences by emotional register (from decision-tree.json) ──────
const DEFAULT_SEQUENCES: Record<string, string[]> = {
  contemplative: ['G', 'A', 'B', 'D', 'E'],
  analytical: ['F', 'C', 'A', 'D', 'B'],
  travel: ['F', 'G', 'A', 'D', 'E'],
  urgent: ['F', 'C', 'B', 'A', 'E'],
}

const FALLBACK_SEQUENCE = ['F', 'C', 'A', 'B', 'E']

/**
 * Determines the slide type sequence.
 * Uses the recommended_sequence from propagation_metadata (set by Stage 1 XML),
 * or falls back to a default sequence based on emotional register.
 */
function resolveSequence(
  propagationMetadata?: Record<string, unknown>,
): string[] {
  // Stage 1 XML puts recommended_sequence into propagation_metadata
  const recommended = propagationMetadata?.recommended_sequence as string[] | undefined
  if (recommended && recommended.length >= 5 && recommended.length <= 7) {
    // Validate all letters are valid
    const valid = recommended.every((l) => SLIDE_TYPE_SPECS[l])
    if (valid) return recommended
  }

  // Fall back to register-based sequence
  const register = propagationMetadata?.emotional_register as string | undefined
  if (register && DEFAULT_SEQUENCES[register]) {
    return DEFAULT_SEQUENCES[register]
  }

  return FALLBACK_SEQUENCE
}

// ─── Main assembly ──────────────────────────────────────────────────────────

/**
 * Assembles a 5–7 slide Editorial Minimal carousel.
 * Uses long-form content generator with a variable sequence of slide types A-G.
 * Image generation is conditional — only if sequence includes photo-bearing types (D, E, F, G).
 */
export async function assembleEditorialMinimalCarousel(
  brief: Brief,
  selectedVariant: CoverVariant,
): Promise<Carousel> {
  const { propagation_metadata } = selectedVariant
  const sequence = resolveSequence(propagation_metadata)

  // Build archetype specs from sequence
  const archetypeSpecs = sequence.map((letter) => {
    const spec = SLIDE_TYPE_SPECS[letter]!
    return {
      name: spec.name,
      description: spec.description,
      notes: spec.notes,
      title_size: spec.title_size,
      body_size: spec.body_size,
    }
  })

  // Step 1: Generate all slide texts
  const contentResponse = await fetch('/api/content/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brief,
      theme_id: 'editorial_minimal',
      archetype_sequence: archetypeSpecs,
      propagation_metadata,
    }),
  })

  if (!contentResponse.ok) {
    throw new Error(`Content generation failed: ${contentResponse.statusText}`)
  }

  const { slides: slideContent } = await contentResponse.json()

  // Step 2: Check if we need photo generation
  const photoTypes = new Set(['D', 'E', 'F', 'G'])
  const needsPhoto = sequence.some((l) => photoTypes.has(l))

  // Step 3: Build slides
  const carouselId = crypto.randomUUID()

  const slides: Slide[] = sequence.map((letter, i) => {
    const spec = SLIDE_TYPE_SPECS[letter]!
    const content = slideContent[i] ?? {}

    return {
      slide_id: crypto.randomUUID(),
      carousel_id: carouselId,
      slide_index: i + 1,
      archetype: letter as any,
      content_type: spec.has_photo ? 'illustration' : 'text_only',
      slide_type: letter,
      // Photo-bearing slides get the variant cover image (will be treated by renderer)
      image_url: spec.has_photo ? (selectedVariant.cover_slide.thumbnail_url ?? null) : null,
      image_prompt: null,
      headline: (content.headline as string) ?? '',
      headline_size: spec.title_size,
      body_text: letter === 'F' ? null : ((content.body_text as string) ?? null),
      cta_text: (content.cta_text as string) ?? null,
      annotation_label: null,
      needs_review: (content.needs_review as boolean) ?? false,
      validation_errors: (content.validation_errors as string[]) ?? [],
      headline_edited: false,
      body_text_edited: false,
    }
  })

  // First slide uses variant's headline if available
  if (selectedVariant.cover_slide.headline) {
    slides[0].headline = selectedVariant.cover_slide.headline
  }

  const carousel: Carousel = {
    carousel_id: carouselId,
    brief_id: brief.brief_id ?? '',
    theme_id: 'editorial_minimal',
    format: 'short_form',
    slide_count: sequence.length as any,
    archetype_system: 'standard_archetypes',
    slides,
    selected_variant_id: selectedVariant.variant_id,
  }

  return carousel
}
