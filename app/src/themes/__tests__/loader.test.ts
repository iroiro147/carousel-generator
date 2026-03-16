import { test, expect } from 'vitest'
import { getTheme, getImageProvider, isShortForm, getThemeDisplayName } from '../index'

const THEME_IDS = [
  'dark_museum', 'nyt_opinion', 'sic_toile'
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
  expect(getImageProvider('nyt_opinion').provider).toBe('openai_gpt_image')
  expect(getImageProvider('sic_toile').provider).toBe('openai_gpt_image')
})

test('all providers use gpt-image-1.5', () => {
  THEME_IDS.forEach(id => {
    expect(getImageProvider(id).model).toBe('gpt-image-1.5')
  })
})

test('format routing is correct', () => {
  expect(isShortForm('nyt_opinion')).toBe(true)
  expect(isShortForm('dark_museum')).toBe(false)
  expect(isShortForm('sic_toile')).toBe(false)
})
