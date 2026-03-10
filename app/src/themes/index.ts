import type { ThemeId, ImageProviderConfig } from '../types/theme'

import darkMuseum from './dark_museum.json'
import productElevation from './product_elevation.json'
import experienceCapture from './experience_capture.json'
import nytOpinion from './nyt_opinion.json'
import sicToile from './sic_toile.json'
import nameArchaeology from './name_archaeology.json'

// Theme registry
const THEMES: Record<ThemeId, object> = {
  dark_museum: darkMuseum,
  product_elevation: productElevation,
  experience_capture: experienceCapture,
  nyt_opinion: nytOpinion,
  sic_toile: sicToile,
  name_archaeology: nameArchaeology,
}

export function getTheme(themeId: ThemeId): object {
  const theme = THEMES[themeId]
  if (!theme) throw new Error(`Unknown theme: ${themeId}`)
  return theme
}

export function getAllThemes(): Record<ThemeId, object> {
  return THEMES
}

export function getThemeDisplayName(themeId: ThemeId): string {
  const names: Record<ThemeId, string> = {
    dark_museum: 'Dark Museum',
    product_elevation: 'Product Elevation',
    experience_capture: 'Experience Capture',
    nyt_opinion: 'NYT Opinion',
    sic_toile: 'SIC Toile',
    name_archaeology: 'Name Archaeology',
  }
  return names[themeId]
}

// Provider routing — hardcoded per spec
// See Image_Gen_Backend_Spec.md §Provider Router
const THEME_PROVIDER_MAP: Record<ThemeId, ImageProviderConfig> = {
  dark_museum:         { provider: 'openai_gpt_image',  model: 'gpt-image-1' },
  product_elevation:   { provider: 'openai_gpt_image',  model: 'gpt-image-1' },
  experience_capture:  { provider: 'openai_gpt_image',  model: 'gpt-image-1' },
  nyt_opinion:         { provider: 'google_imagen',     model: 'imagen-3.0-generate-002' },
  sic_toile:           { provider: 'google_imagen',     model: 'imagen-3.0-generate-002' },
  name_archaeology:    { provider: 'google_imagen',     model: 'imagen-3.0-generate-002' },
}

export function getImageProvider(themeId: ThemeId): ImageProviderConfig {
  return THEME_PROVIDER_MAP[themeId]
}

// Format routing — NYT Opinion is short-form (3-4 slides); all others are long-form (14 slides)
// See Engine_Modifications_Spec.md §Format Router
export function isShortForm(themeId: ThemeId): boolean {
  return themeId === 'nyt_opinion'
}
