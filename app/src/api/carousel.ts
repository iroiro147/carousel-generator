import type { Brief } from '../types/brief'
import type { ThemeId } from '../types/theme'
import type { Carousel, Slide } from '../types/carousel'
import type { CoverVariant } from '../types/variant'
import { routeToFormat } from '../engine/formatRouter'
import { getArchetypeSequence, getContentType } from '../engine/archetypeSequencer'

/**
 * Assembles a full 14-slide long-form carousel.
 * Orchestrates: archetype sequence → content generation → image generation → merge.
 *
 * Called when user confirms a cover variant on the /cover-variants screen.
 * Takes 15–30 seconds (content gen + 14 image gen calls).
 */
export async function assembleLongFormCarousel(
  brief: Brief,
  themeId: ThemeId,
  selectedVariant: CoverVariant,
): Promise<Carousel> {
  const formatConfig = routeToFormat(themeId)
  const archetypes = getArchetypeSequence(formatConfig)
  const { propagation_metadata } = selectedVariant

  // Step 1: Generate all slide text content (single batch Claude call)
  const contentResponse = await fetch('/api/content/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brief,
      theme_id: themeId,
      archetype_sequence: archetypes.map((key) => ({
        name: key,
        title_size: 76,
        body_size: 18,
      })),
      propagation_metadata,
    }),
  })

  if (!contentResponse.ok) {
    throw new Error(`Content generation failed: ${contentResponse.statusText}`)
  }

  const { slides: slideContent } = await contentResponse.json()

  // Step 2: Generate all slide images (batch API call)
  // Build slide specs with object info from content
  const imageSlideSpecs = slideContent.map(
    (content: Record<string, unknown>, i: number) => ({
      slide_index: i,
      archetype: archetypes[i],
      content_type: getContentType(archetypes[i]),
      object_name: (content.object_name as string) ?? archetypes[i],
      object_state: (content.object_state as string) ?? 'gleaming',
      object_domain: content.object_domain as string | undefined,
      brief_context: brief.topic,
    }),
  )

  const imageResponse = await fetch('/api/images/generate-carousel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slides: imageSlideSpecs,
      theme_id: themeId,
    }),
  })

  const imageData = imageResponse.ok ? await imageResponse.json() : { images: [] }
  const images = imageData.images as Array<{
    slide_index: number
    image_url: string | null
    prompt_used: string
  }>

  // Step 3: Merge content + images into Slide objects
  const carouselId = crypto.randomUUID()

  const slides: Slide[] = archetypes.map((archetype, i) => {
    const content = slideContent[i] ?? {}
    const img = images.find((im) => im.slide_index === i)

    return {
      slide_id: crypto.randomUUID(),
      carousel_id: carouselId,
      slide_index: i + 1,
      archetype,
      content_type: getContentType(archetype),
      image_url: img?.image_url ?? null,
      image_prompt: img?.prompt_used ?? null,
      object_name: (content.object_name as string) ?? null,
      object_state: (content.object_state as string) ?? null,
      headline: (content.headline as string) ?? '',
      headline_size: (content.headline_size as number) ?? 76,
      body_text: (content.body_text as string) ?? null,
      dialogue: (content.dialogue as string) ?? null,
      cta_text: (content.cta_text as string) ?? null,
      annotation_label: (content.annotation_label as string) ?? null,
      needs_review: (content.needs_review as boolean) ?? false,
      validation_errors: (content.validation_errors as string[]) ?? [],
      headline_edited: false,
      body_text_edited: false,
    }
  })

  // Slide 1 (cover_hook) uses the selected variant's image
  if (selectedVariant.cover_slide.thumbnail_url) {
    slides[0].image_url = selectedVariant.cover_slide.thumbnail_url
  }

  // Use variant's headline for cover if available
  if (selectedVariant.cover_slide.headline) {
    slides[0].headline = selectedVariant.cover_slide.headline
  }

  const carousel: Carousel = {
    carousel_id: carouselId,
    brief_id: brief.brief_id ?? '',
    theme_id: themeId,
    format: 'long_form',
    slide_count: 14,
    archetype_system: 'standard_archetypes',
    slides,
    selected_variant_id: selectedVariant.variant_id,
  }

  return carousel
}
