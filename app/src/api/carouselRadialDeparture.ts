import type { Brief } from '../types/brief'
import type { Carousel, Slide } from '../types/carousel'
import type { CoverVariant } from '../types/variant'

// ─── 7-slide fixed archetype sequence for Radial Departure ──────────────────

const RADIAL_DEPARTURE_SEQUENCE = [
  {
    name: 'cover',
    description: 'Immersive zoom-burst entry point. DM Sans 800 uppercase.',
    notes: 'The arrival — kinetic, forward-moving. Maximum 6 words.',
    title_size: 96,
    body_size: 28,
  },
  {
    name: 'content_claim',
    description: 'Primary argument with motion strip crop on the right.',
    notes: 'Bold assertion. 1-2 supporting lines.',
    title_size: 72,
    body_size: 28,
  },
  {
    name: 'content_data',
    description: 'Key statistic on flat color background. Headline IS the number.',
    notes: 'Hero stat as large display text. body_text is the metric label (max 8 words).',
    title_size: 140,
    body_size: 28,
  },
  {
    name: 'content_narrative',
    description: 'Story development on midtone background.',
    notes: 'Core argument in 2-3 sentences. The narrative heart.',
    title_size: 72,
    body_size: 28,
  },
  {
    name: 'content_quote',
    description: 'Expert quote or source attribution with corner photo accent.',
    notes: 'headline = quote text. body_text = attribution.',
    title_size: 64,
    body_size: 28,
  },
  {
    name: 'content_claim_2',
    description: 'Secondary argument or consequence with motion strip.',
    notes: 'Builds on the primary claim. Different angle.',
    title_size: 72,
    body_size: 28,
  },
  {
    name: 'end_cta',
    description: 'Call to action with vignette overlay.',
    notes: 'headline = CTA statement. cta_text = brand URL or action.',
    title_size: 72,
    body_size: 0,
  },
]

// ─── Main assembly ──────────────────────────────────────────────────────────

/**
 * Assembles a 7-slide Radial Departure carousel.
 * Uses long-form content generator with a fixed 7-slide archetype sequence.
 * Image: cover-only — content slides use CSS crops of the cover photograph.
 */
export async function assembleRadialDepartureCarousel(
  brief: Brief,
  selectedVariant: CoverVariant,
): Promise<Carousel> {
  const { propagation_metadata } = selectedVariant

  // Step 1: Generate all 7 slide texts (single batch Claude call via longForm generator)
  const contentResponse = await fetch('/api/content/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brief,
      theme_id: 'radial_departure',
      archetype_sequence: RADIAL_DEPARTURE_SEQUENCE,
      propagation_metadata,
    }),
  })

  if (!contentResponse.ok) {
    throw new Error(`Content generation failed: ${contentResponse.statusText}`)
  }

  const { slides: slideContent } = await contentResponse.json()

  // Step 2: Build slides — cover-only image, no per-slide image gen
  const carouselId = crypto.randomUUID()

  const slides: Slide[] = RADIAL_DEPARTURE_SEQUENCE.map((archetype, i) => {
    const content = slideContent[i] ?? {}

    return {
      slide_id: crypto.randomUUID(),
      carousel_id: carouselId,
      slide_index: i + 1,
      archetype: archetype.name as any,
      content_type: i === 0 ? 'illustration' : 'text_only',
      // Cover slide gets the variant image; content slides inherit via CSS crops
      image_url: i === 0 ? (selectedVariant.cover_slide.thumbnail_url ?? null) : null,
      image_prompt: null,
      headline: (content.headline as string) ?? '',
      headline_size: archetype.title_size,
      body_text: (content.body_text as string) ?? null,
      cta_text: (content.cta_text as string) ?? null,
      annotation_label: null,
      needs_review: (content.needs_review as boolean) ?? false,
      validation_errors: (content.validation_errors as string[]) ?? [],
      headline_edited: false,
      body_text_edited: false,
    }
  })

  // Use variant's headline for cover if available
  if (selectedVariant.cover_slide.headline) {
    slides[0].headline = selectedVariant.cover_slide.headline
  }

  const carousel: Carousel = {
    carousel_id: carouselId,
    brief_id: brief.brief_id ?? '',
    theme_id: 'radial_departure',
    format: 'short_form',
    slide_count: 7,
    archetype_system: 'standard_archetypes',
    slides,
    selected_variant_id: selectedVariant.variant_id,
  }

  return carousel
}
