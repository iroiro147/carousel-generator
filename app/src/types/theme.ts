export type ThemeId =
  | 'dark_museum'
  | 'nyt_opinion'
  | 'sic_toile'

export type CarouselFormat = 'short_form' | 'long_form'

export type ArchetypeKey =
  // Long-form (14)
  | 'cover_hook' | 'context_setter' | 'problem_setup' | 'problem_escalation'
  | 'turning_point' | 'pivot_question' | 'solution_introduction'
  | 'landscape_overview' | 'technical_foundation' | 'how_it_works_setup'
  | 'how_it_works_flow' | 'how_it_works_security'
  | 'company_positioning' | 'cta_close'
  // Short-form (NYT Opinion)
  | 'thesis' | 'evidence' | 'landing'

export type ContentType = 'illustration' | 'quote' | 'object' | 'text_only'

export interface FormatConfig {
  format: CarouselFormat
  slide_count_range: { min: number; max: number }
  archetype_system: 'nyt_archetypes' | 'standard_archetypes'
  cover_variants_mode: 'illustration_mode_variants' | 'composition_angle_variants'
  image_generation: 'cover_only' | 'per_slide'
  content_generation: 'quote_primary' | 'object_primary'
}

export interface ImageProviderConfig {
  provider: 'openai_gpt_image' | 'google_imagen'
  model: string
}
