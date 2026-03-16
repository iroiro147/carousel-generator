import type { ThemeId, ImageProviderConfig } from '../types/theme'

import darkMuseum from './dark_museum.json'
import nytOpinion from './nyt_opinion.json'
import sicToile from './sic_toile.json'

// Theme registry
const THEMES: Record<ThemeId, object> = {
  dark_museum: darkMuseum,
  nyt_opinion: nytOpinion,
  sic_toile: sicToile,
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
    nyt_opinion: 'NYT Opinion',
    sic_toile: 'SIC Toile',
  }
  return names[themeId]
}

// Provider routing — GPT-Image-1.5 primary for ALL styles (Architecture Decision #14)
const THEME_PROVIDER_MAP: Record<ThemeId, ImageProviderConfig> = {
  dark_museum:  { provider: 'openai_gpt_image', model: 'gpt-image-1.5' },
  nyt_opinion:  { provider: 'openai_gpt_image', model: 'gpt-image-1.5' },
  sic_toile:    { provider: 'openai_gpt_image', model: 'gpt-image-1.5' },
}

export function getImageProvider(themeId: ThemeId): ImageProviderConfig {
  return THEME_PROVIDER_MAP[themeId]
}

// Format routing — NYT Opinion is short-form (3-4 slides); all others are long-form (14 slides)
export function isShortForm(themeId: ThemeId): boolean {
  return themeId === 'nyt_opinion'
}
