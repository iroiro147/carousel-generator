import type { ThemeId, FormatConfig } from '../types/theme'

// Single check. Do not distribute this logic elsewhere.
// See Engine_Modifications_Spec.md §Format Router
export function routeToFormat(themeId: ThemeId): FormatConfig {
  if (themeId === 'nyt_opinion') {
    return {
      format: 'short_form',
      slide_count_range: { min: 3, max: 4 },
      archetype_system: 'nyt_archetypes',
      cover_variants_mode: 'illustration_mode_variants',
      image_generation: 'cover_only',
      content_generation: 'quote_primary',
    }
  }
  if (themeId === 'radial_departure') {
    return {
      format: 'short_form',
      slide_count_range: { min: 7, max: 7 },
      archetype_system: 'standard_archetypes',
      cover_variants_mode: 'composition_angle_variants',
      image_generation: 'cover_only',
      content_generation: 'object_primary',
    }
  }
  if (themeId === 'editorial_minimal') {
    return {
      format: 'short_form',
      slide_count_range: { min: 5, max: 7 },
      archetype_system: 'standard_archetypes',
      cover_variants_mode: 'composition_angle_variants',
      image_generation: 'cover_only',
      content_generation: 'quote_primary',
    }
  }
  return {
    format: 'long_form',
    slide_count_range: { min: 14, max: 14 },
    archetype_system: 'standard_archetypes',
    cover_variants_mode: 'composition_angle_variants',
    image_generation: 'per_slide',
    content_generation: 'object_primary',
  }
}
