import type { ThemeId, CarouselFormat, ArchetypeKey, ContentType } from './theme'
import type { CoverVariant } from './variant'

export interface Carousel {
  carousel_id: string
  brief_id: string
  theme_id: ThemeId
  format: CarouselFormat
  slide_count: number
  archetype_system: 'nyt_archetypes' | 'standard_archetypes'

  // Short-form only
  argument?: CarouselArgument
  signature_color?: string | null
  signature_color_source?: 'derived' | 'manual' | 'fallback' | null
  tonal_variant?: string | null
  tone_a?: string | null
  tone_b?: string | null
  alternation_range?: 'wide' | 'medium' | 'narrow' | 'minimal' | null
  color_derivation_path?: string | null
  color_sentiment?: string | null

  slides: Slide[]
  cover_variants?: CoverVariant[]
  selected_variant_id?: string

  // Pipeline metadata (from selected cover variant)
  visual_decision?: Record<string, unknown> | null
  stage2_prompt?: string | null
  image_provider?: string | null
}

export type ArgumentType =
  | 'hard_fact' | 'counterintuitive' | 'escalation'
  | 'solution_declaration' | 'process_as_experience' | 'cta_parenthetical'

export interface CarouselArgument {
  thesis: string
  evidence: string | null
  landing: string
  argument_type: ArgumentType
}

export interface Slide {
  slide_id: string
  carousel_id: string
  slide_index: number
  archetype: ArchetypeKey
  content_type: ContentType

  // Long-form fields
  object_name?: string | null
  object_state?: string | null
  object_domain?: string | null
  image_url?: string | null
  image_prompt?: string | null

  // Short-form fields
  quote_text?: string | null
  quote_word_count?: number | null
  quote_rhetorical_structure?: string | null
  illustration_url?: string | null
  illustration_mode?: string | null
  signature_color?: string | null
  headline_band_hex?: string | null

  // Editorial Minimal fields
  slide_type?: string | null

  // Shared text fields
  headline: string
  headline_size: number
  body_text?: string | null
  dialogue?: string | null
  cta_text?: string | null
  annotation_label?: string | null
  byline?: string

  // Generation metadata
  generation_model?: string
  generation_attempt?: number
  validation_errors?: string[]
  needs_review?: boolean

  // Edit tracking
  headline_edited?: boolean
  body_text_edited?: boolean
  last_edited_at?: string | null
}
