import { test, expect } from 'vitest'
import { getTheme, getImageProvider, isShortForm, getThemeDisplayName } from '../index'

const THEME_IDS = [
  'dark_museum', 'nyt_opinion', 'sic_toile', 'dispatch',
  'radial_departure', 'editorial_minimal',
] as const

test('all themes load without error', () => {
  THEME_IDS.forEach(id => expect(() => getTheme(id)).not.toThrow())
})

test('all themes have required top-level keys', () => {
  THEME_IDS.forEach(id => {
    const theme = getTheme(id) as Record<string, unknown>
    expect(theme).toHaveProperty('name')
    expect(theme).toHaveProperty('canvas')
    const hasColors = 'colors' in theme || 'color_system' in theme
    expect(hasColors).toBe(true)
  })
})

test('provider routing is correct', () => {
  THEME_IDS.forEach(id => {
    expect(getImageProvider(id).provider).toBe('openai_gpt_image')
  })
})

test('all providers use gpt-image-1.5', () => {
  THEME_IDS.forEach(id => {
    expect(getImageProvider(id).model).toBe('gpt-image-1.5')
  })
})

test('format routing is correct', () => {
  expect(isShortForm('nyt_opinion')).toBe(true)
  expect(isShortForm('dispatch')).toBe(true)
  expect(isShortForm('radial_departure')).toBe(true)
  expect(isShortForm('editorial_minimal')).toBe(true)
  expect(isShortForm('dark_museum')).toBe(false)
  expect(isShortForm('sic_toile')).toBe(false)
})

test('all themes have display names', () => {
  THEME_IDS.forEach(id => {
    expect(getThemeDisplayName(id)).toBeTruthy()
  })
})
