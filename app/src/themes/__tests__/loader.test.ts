import { test, expect } from 'vitest'
import { getTheme, getImageProvider, isShortForm, getThemeDisplayName } from '../index'

const THEME_IDS = [
  'dark_museum', 'product_elevation', 'experience_capture',
  'nyt_opinion', 'sic_toile', 'name_archaeology'
] as const

test('all themes load without error', () => {
  THEME_IDS.forEach(id => expect(() => getTheme(id)).not.toThrow())
})

test('all themes have required top-level keys', () => {
  THEME_IDS.forEach(id => {
    const theme = getTheme(id) as Record<string, unknown>
    expect(theme).toHaveProperty('name')
    expect(theme).toHaveProperty('canvas')
    // Some themes use 'colors', others use 'color_system'
    const hasColors = 'colors' in theme || 'color_system' in theme
    expect(hasColors).toBe(true)
  })
})

test('provider routing is correct', () => {
  expect(getImageProvider('dark_museum').provider).toBe('openai_gpt_image')
  expect(getImageProvider('product_elevation').provider).toBe('openai_gpt_image')
  expect(getImageProvider('experience_capture').provider).toBe('openai_gpt_image')
  expect(getImageProvider('nyt_opinion').provider).toBe('google_imagen')
  expect(getImageProvider('sic_toile').provider).toBe('google_imagen')
  expect(getImageProvider('name_archaeology').provider).toBe('google_imagen')
})

test('format routing is correct', () => {
  expect(isShortForm('nyt_opinion')).toBe(true)
  expect(isShortForm('dark_museum')).toBe(false)
  expect(isShortForm('sic_toile')).toBe(false)
})
