import type { ThemeId, ImageProviderConfig } from '../types/theme'

import darkMuseum from './dark_museum.json'
import nytOpinion from './nyt_opinion.json'
import sicToile from './sic_toile.json'
import dispatch from './dispatch.json'
import radialDeparture from './radial_departure.json'
import editorialMinimal from './editorial_minimal.json'

// Theme registry
const THEMES: Record<ThemeId, object> = {
  dark_museum: darkMuseum,
  nyt_opinion: nytOpinion,
  sic_toile: sicToile,
  dispatch: dispatch,
  radial_departure: radialDeparture,
  editorial_minimal: editorialMinimal,
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
    dispatch: 'Dispatch',
    radial_departure: 'Radial Departure',
    editorial_minimal: 'Editorial Minimal',
  }
  return names[themeId]
}

// Provider routing — GPT-Image-1.5 primary for ALL styles (Architecture Decision #14)
const THEME_PROVIDER_MAP: Record<ThemeId, ImageProviderConfig> = {
  dark_museum:        { provider: 'openai_gpt_image', model: 'gpt-image-1.5' },
  nyt_opinion:        { provider: 'openai_gpt_image', model: 'gpt-image-1.5' },
  sic_toile:          { provider: 'openai_gpt_image', model: 'gpt-image-1.5' },
  dispatch:           { provider: 'openai_gpt_image', model: 'gpt-image-1.5' },
  radial_departure:   { provider: 'openai_gpt_image', model: 'gpt-image-1.5' },
  editorial_minimal:  { provider: 'openai_gpt_image', model: 'gpt-image-1.5' },
}

export function getImageProvider(themeId: ThemeId): ImageProviderConfig {
  return THEME_PROVIDER_MAP[themeId]
}

// Format routing — short-form themes: nyt_opinion (3-4), radial_departure (7), editorial_minimal (5-7)
export function isShortForm(themeId: ThemeId): boolean {
  return themeId === 'nyt_opinion' || themeId === 'dispatch' || themeId === 'radial_departure' || themeId === 'editorial_minimal'
}
