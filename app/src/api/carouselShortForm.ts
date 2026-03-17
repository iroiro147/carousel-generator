import type { Brief } from '../types/brief'
import type { Carousel, Slide } from '../types/carousel'
import type { CoverVariant } from '../types/variant'
import { deriveSignatureColor } from '../engine/colorSystem'
import type { ColorDerivationResult } from '../engine/colorSystem'
import { getTheme } from '../themes'

// NYT Opinion theme fallback colors for when color derivation fails
const nytTheme = getTheme('nyt_opinion') as Record<string, any>
const NYT_FALLBACK_SIG = nytTheme.color_system?.constants?.fallback_signature ?? '#C2185B'

// ─── Slide builders ─────────────────────────────────────────────────────────

function buildNYTCoverSlide(
  carouselId: string,
  variant: CoverVariant,
  signatureColor: string,
): Slide {
  return {
    slide_id: crypto.randomUUID(),
    carousel_id: carouselId,
    slide_index: 1,
    archetype: 'cover_hook',
    content_type: 'illustration',
    // BUG FIX: Use thumbnail_url (where base64 is actually stored), not illustration_url
    illustration_url: variant.cover_slide.thumbnail_url ?? null,
    illustration_mode: variant.cover_slide.illustration_mode ?? null,
    headline: variant.cover_slide.headline,
    headline_size: 76,
    signature_color: signatureColor,
    headline_edited: false,
    body_text_edited: false,
  }
}

function buildNYTQuoteSlide(
  carouselId: string,
  quoteContent: { quote_text?: string; rhetorical_structure_used?: string },
  slideIndex: number,
  totalSlides: number,
  signatureColor: string,
  brandName: string,
  toneA: string,
  toneB: string,
): Slide {
  const quoteText = quoteContent.quote_text ?? ''

  // Determine archetype from position: slide 2 = thesis, last = landing, middle = evidence
  const archetype =
    slideIndex === 2
      ? 'thesis'
      : slideIndex === totalSlides
        ? 'landing'
        : 'evidence'

  // Step 8: Assign tone based on slide position
  // Even text slides (2, 4, 6, 8, 10) → Tone A, Odd text slides (3, 5, 7, 9) → Tone B
  const backgroundColor = slideIndex % 2 === 0 ? toneA : toneB

  return {
    slide_id: crypto.randomUUID(),
    carousel_id: carouselId,
    slide_index: slideIndex,
    archetype,
    content_type: 'quote',
    quote_text: quoteText,
    quote_word_count: quoteText.split(/\s+/).filter(Boolean).length,
    quote_rhetorical_structure: quoteContent.rhetorical_structure_used ?? null,
    signature_color: backgroundColor,
    headline: '',
    headline_size: 0,
    byline: `— ${brandName}`,
    headline_edited: false,
    body_text_edited: false,
  }
}

// ─── Main assembly ──────────────────────────────────────────────────────────

/**
 * Assembles a 3–4 slide NYT Opinion carousel.
 * Orchestrates: content generation → color derivation → slide assembly.
 *
 * Called when user confirms a cover variant with theme_id === 'nyt_opinion'.
 */
export async function assembleShortFormCarousel(
  brief: Brief,
  selectedVariant: CoverVariant,
): Promise<Carousel> {
  const { propagation_metadata } = selectedVariant

  // Step 1: Generate content (argument extraction + quote generation)
  const contentResponse = await fetch('/api/content/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brief,
      theme_id: 'nyt_opinion',
      propagation_metadata,
    }),
  })

  if (!contentResponse.ok) {
    throw new Error(`Content generation failed: ${contentResponse.statusText}`)
  }

  const contentData = await contentResponse.json()
  const { slides: slideContent, argument, slide_count: slideCount } = contentData as {
    slides: Array<Record<string, unknown>>
    argument: {
      thesis: string
      evidence: string | null
      landing: string
      argument_type: string
      has_tension: boolean
    }
    slide_count: number
  }

  // Step 2: Derive colors from cover illustration via 8-step pipeline
  // BUG FIX: Use thumbnail_url (where base64 is actually stored), not illustration_url
  const imageBase64 = selectedVariant.cover_slide.thumbnail_url
  let signatureColor = NYT_FALLBACK_SIG
  let toneA = '#E8D5D0'   // Fallback Tone A (soft warm)
  let toneB = '#C2785B'   // Fallback Tone B (bolder warm)
  let colorSource: 'derived' | 'fallback' = 'fallback'
  let alternationRange: 'wide' | 'medium' | 'narrow' | 'minimal' = 'medium'
  let derivationPath = 'fallback'
  let colorSentiment = 'standard'

  if (imageBase64) {
    try {
      const colorData: ColorDerivationResult = await deriveSignatureColor({
        imageBase64,
        topic: brief.topic,
        claim: argument?.thesis ?? brief.topic,
      })
      signatureColor = colorData.signature_color
      toneA = colorData.tone_a
      toneB = colorData.tone_b
      alternationRange = colorData.alternation_range
      derivationPath = colorData.derivation_path
      colorSentiment = colorData.sentiment
      colorSource = derivationPath === 'fallback' ? 'fallback' : 'derived'
    } catch {
      // Keep fallback colors — never crash carousel assembly
    }
  }

  // Step 3: Build slides
  const carouselId = crypto.randomUUID()

  // Quote slides are slides 2+ from content (index 1 onward — index 0 is cover_hook content)
  const quoteSlides = slideContent.filter(
    (s) => s.archetype !== 'cover_hook',
  )

  const slides: Slide[] = [
    // Slide 1: Cover with illustration
    buildNYTCoverSlide(carouselId, selectedVariant, signatureColor),
    // Slides 2–N: Quote cards with alternating tone backgrounds
    ...quoteSlides.map((quote, i) =>
      buildNYTQuoteSlide(
        carouselId,
        quote as { quote_text?: string; rhetorical_structure_used?: string },
        i + 2, // slide index starts at 2
        slideCount,
        signatureColor,
        brief.brand_name ?? brief.topic,
        toneA,
        toneB,
      ),
    ),
  ]

  // Step 4: Assemble carousel
  const carousel: Carousel = {
    carousel_id: carouselId,
    brief_id: brief.brief_id ?? '',
    theme_id: 'nyt_opinion',
    format: 'short_form',
    slide_count: slideCount,
    archetype_system: 'nyt_archetypes',
    slides,
    selected_variant_id: selectedVariant.variant_id,
    visual_decision: selectedVariant.visual_decision ?? null,
    stage2_prompt: selectedVariant.cover_slide.image_prompt ?? null,
    image_provider: selectedVariant.provider ?? null,
    argument: {
      thesis: argument.thesis,
      evidence: argument.evidence,
      landing: argument.landing,
      argument_type: argument.argument_type as 'hard_fact' | 'counterintuitive' | 'escalation' | 'solution_declaration' | 'process_as_experience' | 'cta_parenthetical',
    },
    signature_color: signatureColor,
    signature_color_source: colorSource,
    tone_a: toneA,
    tone_b: toneB,
    alternation_range: alternationRange,
    color_derivation_path: derivationPath,
    color_sentiment: colorSentiment,
  }

  return carousel
}
