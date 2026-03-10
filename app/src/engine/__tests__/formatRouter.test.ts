import { describe, it, expect } from 'vitest'
import { routeToFormat } from '../formatRouter'
import {
  getArchetypeSequence,
  getContentType,
  decideShortFormSlideCount,
} from '../archetypeSequencer'

describe('routeToFormat', () => {
  it('returns short_form for nyt_opinion', () => {
    expect(routeToFormat('nyt_opinion').format).toBe('short_form')
  })

  it('returns long_form for dark_museum', () => {
    expect(routeToFormat('dark_museum').format).toBe('long_form')
  })

  it('returns long_form for all non-NYT themes', () => {
    const longFormThemes = [
      'dark_museum',
      'product_elevation',
      'experience_capture',
      'sic_toile',
      'name_archaeology',
    ] as const
    for (const theme of longFormThemes) {
      expect(routeToFormat(theme).format).toBe('long_form')
    }
  })

  it('returns correct slide count range for long_form', () => {
    expect(routeToFormat('sic_toile').slide_count_range.max).toBe(14)
    expect(routeToFormat('sic_toile').slide_count_range.min).toBe(14)
  })

  it('returns correct slide count range for short_form', () => {
    const config = routeToFormat('nyt_opinion')
    expect(config.slide_count_range.min).toBe(3)
    expect(config.slide_count_range.max).toBe(4)
  })

  it('returns correct cover_variants_mode', () => {
    expect(routeToFormat('nyt_opinion').cover_variants_mode).toBe('illustration_mode_variants')
    expect(routeToFormat('dark_museum').cover_variants_mode).toBe('composition_angle_variants')
  })
})

describe('getArchetypeSequence', () => {
  it('returns 14 archetypes for long-form', () => {
    const seq = getArchetypeSequence(routeToFormat('dark_museum'))
    expect(seq).toHaveLength(14)
  })

  it('starts with cover_hook for long-form', () => {
    const seq = getArchetypeSequence(routeToFormat('dark_museum'))
    expect(seq[0]).toBe('cover_hook')
  })

  it('ends with cta_close for long-form', () => {
    const seq = getArchetypeSequence(routeToFormat('dark_museum'))
    expect(seq[13]).toBe('cta_close')
  })

  it('returns 3-slide NYT sequence by default', () => {
    const seq = getArchetypeSequence(routeToFormat('nyt_opinion'), 3)
    expect(seq).toEqual(['cover_hook', 'thesis', 'landing'])
  })

  it('returns 4-slide NYT sequence when slideCount is 4', () => {
    const seq = getArchetypeSequence(routeToFormat('nyt_opinion'), 4)
    expect(seq).toHaveLength(4)
    expect(seq[2]).toBe('evidence')
  })

  it('defaults to 3-slide for short_form when no slideCount', () => {
    const seq = getArchetypeSequence(routeToFormat('nyt_opinion'))
    expect(seq).toHaveLength(3)
  })
})

describe('getContentType', () => {
  it('returns text_only for pivot_question', () => {
    expect(getContentType('pivot_question')).toBe('text_only')
  })

  it('returns text_only for cta_close', () => {
    expect(getContentType('cta_close')).toBe('text_only')
  })

  it('returns illustration for cover_hook', () => {
    expect(getContentType('cover_hook')).toBe('illustration')
  })

  it('returns object for standard body archetypes', () => {
    expect(getContentType('context_setter')).toBe('object')
    expect(getContentType('problem_setup')).toBe('object')
    expect(getContentType('solution_introduction')).toBe('object')
  })

  it('returns quote for NYT body archetypes', () => {
    expect(getContentType('thesis')).toBe('quote')
    expect(getContentType('evidence')).toBe('quote')
    expect(getContentType('landing')).toBe('quote')
  })
})

describe('decideShortFormSlideCount', () => {
  it('returns 4 when evidence is distinct and claim is long', () => {
    expect(
      decideShortFormSlideCount({
        evidence: 'stat here',
        landing: 'different point',
        claimWordCount: 50,
      }),
    ).toBe(4)
  })

  it('returns 3 when evidence is null', () => {
    expect(
      decideShortFormSlideCount({
        evidence: null,
        landing: 'x',
        claimWordCount: 30,
      }),
    ).toBe(3)
  })

  it('returns 3 when claim is too short', () => {
    expect(
      decideShortFormSlideCount({
        evidence: 'some evidence',
        landing: 'different landing',
        claimWordCount: 20,
      }),
    ).toBe(3)
  })

  it('returns 3 when evidence matches landing', () => {
    expect(
      decideShortFormSlideCount({
        evidence: 'same text',
        landing: 'same text',
        claimWordCount: 50,
      }),
    ).toBe(3)
  })
})
