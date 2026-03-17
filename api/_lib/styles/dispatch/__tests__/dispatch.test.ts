import { describe, it, expect } from 'vitest'
import { extractTag, extractBlock } from '../../../pipeline/xmlParser'
import {
  hexToHsl,
  hslToHex,
  deriveDispatchColors,
  type DispatchPathway,
} from '../colorEngine'

// ─── Inline parse + validate (mirrors config.ts logic without fs/import side effects) ───

const VALID_PATHWAYS = [
  'name-archaeology',
  'experience-capture',
  'symbol-literalization',
  'product-elevation',
] as const

function parseVisualDecision(xmlString: string) {
  const xml = extractBlock(xmlString, 'visual_decision')
  const pathway = extractTag(xml, 'pathway').trim().toLowerCase()
  return {
    rawXml: xmlString,
    pathway: VALID_PATHWAYS.includes(pathway as typeof VALID_PATHWAYS[number])
      ? pathway
      : 'product-elevation',
    pathway_rationale: extractTag(xml, 'pathway_rationale').trim(),
    subject: extractTag(xml, 'subject').trim(),
    scene_description: extractTag(xml, 'scene_description').trim(),
    color_direction: extractTag(xml, 'color_direction').trim(),
    era_style: extractTag(xml, 'era_style').trim(),
    composition: extractTag(xml, 'composition').trim(),
    wit_layer: extractTag(xml, 'wit_layer').trim(),
    quote: extractTag(xml, 'quote').trim(),
    negative_prompt: extractTag(xml, 'negative_prompt').trim(),
  }
}

function validateVisualDecision(decision: Record<string, unknown>) {
  const errors: string[] = []
  const pathway = decision.pathway as string
  if (!VALID_PATHWAYS.includes(pathway as typeof VALID_PATHWAYS[number])) {
    errors.push(`Invalid pathway: "${pathway}"`)
  }
  const subject = decision.subject as string
  if (!subject || subject.length < 5) errors.push('subject too short')
  const scene = decision.scene_description as string
  if (!scene || scene.split(/\s+/).length < 15) errors.push('scene_description too short')
  const colorDir = decision.color_direction as string
  if (!colorDir || colorDir.length < 3) errors.push('color_direction missing')
  const eraStyle = decision.era_style as string
  if (!eraStyle || eraStyle.length < 5) errors.push('era_style too short')
  if (pathway === 'name-archaeology') {
    const wit = decision.wit_layer as string
    if (!wit || wit === 'none' || wit.length < 5) errors.push('wit_layer required for name-archaeology')
  }
  if (pathway === 'experience-capture') {
    const q = decision.quote as string
    if (!q || q === 'none' || q.length < 5) errors.push('quote required for experience-capture')
  }
  return { valid: errors.length === 0, errors }
}

// ─── Test Data ───────────────────────────────────────────────────────────────

const VALID_XML = `<visual_decision>
  <pathway>name-archaeology</pathway>
  <pathway_rationale>Robinhood carries the legend of Robin Hood, the folk hero who stole from the rich.</pathway_rationale>
  <subject>A fox archer in Elizabethan period costume drawing a longbow in a moonlit forest clearing</subject>
  <scene_description>A red fox standing upright in Lincoln green doublet draws a yew longbow under cold moonlight filtering through ancient oak canopy. Scattered gold coins glint on the forest floor. Crosshatch engraving linework with monochromatic forest green tint throughout the oval vignette frame.</scene_description>
  <color_direction>Deep forest green matching Robinhood brand palette</color_direction>
  <era_style>19th century steel engraving with crosshatch linework</era_style>
  <composition>Centered in oval vignette frame, 60% canvas height, bottom 15% darker for footer</composition>
  <wit_layer>Fox archer substitution — the animal embodies the trickster archetype more precisely than a human Robin Hood</wit_layer>
  <quote>none</quote>
  <negative_prompt>No text, no logos, no UI elements, no modern clothing</negative_prompt>
</visual_decision>`

// ─── parseVisualDecision ─────────────────────────────────────────────────────

describe('parseVisualDecision', () => {
  it('parses valid XML with all fields', () => {
    const d = parseVisualDecision(VALID_XML)
    expect(d.pathway).toBe('name-archaeology')
    expect(d.subject).toContain('fox archer')
    expect(d.scene_description).toContain('red fox')
    expect(d.color_direction).toContain('forest green')
    expect(d.era_style).toContain('steel engraving')
    expect(d.wit_layer).toContain('Fox archer substitution')
    expect(d.quote).toBe('none')
  })

  it('defaults to product-elevation for invalid pathway', () => {
    const xml = VALID_XML.replace('name-archaeology', 'invalid-pathway')
    const d = parseVisualDecision(xml)
    expect(d.pathway).toBe('product-elevation')
  })

  it('handles missing tags gracefully (returns empty strings)', () => {
    const xml = '<visual_decision><pathway>product-elevation</pathway></visual_decision>'
    const d = parseVisualDecision(xml)
    expect(d.pathway).toBe('product-elevation')
    expect(d.subject).toBe('')
    expect(d.scene_description).toBe('')
  })

  it('handles XML not wrapped in visual_decision block', () => {
    const raw = '<pathway>product-elevation</pathway><subject>A floating iPhone</subject>'
    const d = parseVisualDecision(raw)
    expect(d.pathway).toBe('product-elevation')
    expect(d.subject).toBe('A floating iPhone')
  })
})

// ─── validateVisualDecision ──────────────────────────────────────────────────

describe('validateVisualDecision', () => {
  it('validates a complete name-archaeology decision', () => {
    const d = parseVisualDecision(VALID_XML)
    const result = validateVisualDecision(d)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects name-archaeology without wit_layer', () => {
    const xml = VALID_XML.replace(
      /<wit_layer>.*<\/wit_layer>/s,
      '<wit_layer>none</wit_layer>'
    )
    const d = parseVisualDecision(xml)
    const result = validateVisualDecision(d)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('wit_layer'))).toBe(true)
  })

  it('rejects experience-capture without quote', () => {
    const xml = VALID_XML
      .replace('name-archaeology', 'experience-capture')
      .replace(/<quote>.*<\/quote>/s, '<quote>none</quote>')
    const d = parseVisualDecision(xml)
    const result = validateVisualDecision(d)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('quote'))).toBe(true)
  })

  it('rejects missing subject', () => {
    const xml = VALID_XML.replace(
      /<subject>.*<\/subject>/s,
      '<subject></subject>'
    )
    const d = parseVisualDecision(xml)
    const result = validateVisualDecision(d)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('subject'))).toBe(true)
  })

  it('rejects scene_description under 15 words', () => {
    const xml = VALID_XML.replace(
      /<scene_description>.*<\/scene_description>/s,
      '<scene_description>A fox in a forest</scene_description>'
    )
    const d = parseVisualDecision(xml)
    const result = validateVisualDecision(d)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('scene_description'))).toBe(true)
  })

  it('allows product-elevation without wit_layer or quote', () => {
    const xml = VALID_XML
      .replace('name-archaeology', 'product-elevation')
      .replace(/<wit_layer>.*<\/wit_layer>/s, '<wit_layer>none</wit_layer>')
      .replace(/<quote>.*<\/quote>/s, '<quote>none</quote>')
    const d = parseVisualDecision(xml)
    const result = validateVisualDecision(d)
    expect(result.valid).toBe(true)
  })
})

// ─── colorEngine: hexToHsl / hslToHex ────────────────────────────────────────

describe('hexToHsl', () => {
  it('converts pure red', () => {
    const [h, s, l] = hexToHsl('#FF0000')
    expect(h).toBeCloseTo(0, 0)
    expect(s).toBeCloseTo(100, 0)
    expect(l).toBeCloseTo(50, 0)
  })

  it('converts pure white', () => {
    const [h, s, l] = hexToHsl('#FFFFFF')
    expect(s).toBeCloseTo(0, 0)
    expect(l).toBeCloseTo(100, 0)
  })

  it('converts pure black', () => {
    const [h, s, l] = hexToHsl('#000000')
    expect(s).toBeCloseTo(0, 0)
    expect(l).toBeCloseTo(0, 0)
  })

  it('handles hex without hash', () => {
    const [h, s, l] = hexToHsl('00FF00')
    expect(h).toBeCloseTo(120, 0)
    expect(s).toBeCloseTo(100, 0)
    expect(l).toBeCloseTo(50, 0)
  })
})

describe('hslToHex', () => {
  it('converts red HSL back to hex', () => {
    expect(hslToHex(0, 100, 50).toLowerCase()).toBe('#ff0000')
  })

  it('converts green HSL back to hex', () => {
    expect(hslToHex(120, 100, 50).toLowerCase()).toBe('#00ff00')
  })

  it('roundtrips through hexToHsl → hslToHex', () => {
    const original = '#3A7BDA'
    const [h, s, l] = hexToHsl(original)
    const result = hslToHex(h, s, l)
    expect(result.toLowerCase()).toBe(original.toLowerCase())
  })
})

// ─── colorEngine: deriveDispatchColors ───────────────────────────────────────

describe('deriveDispatchColors', () => {
  const ROBINHOOD_GREEN = '#00C805'
  const FERRARI_RED = '#FF2800'

  it('returns valid structure for all pathways', () => {
    const pathways: DispatchPathway[] = [
      'name-archaeology',
      'experience-capture',
      'symbol-literalization',
      'product-elevation',
    ]
    for (const p of pathways) {
      const result = deriveDispatchColors(ROBINHOOD_GREEN, p)
      expect(result.seed).toMatch(/^#[0-9a-f]{6}$/i)
      expect(result.toneA).toMatch(/^#[0-9a-f]{6}$/i)
      expect(result.toneB).toMatch(/^#[0-9a-f]{6}$/i)
      expect(result.textPrimary).toBe('#FFFFFF')
      expect(result.textSecondary).toMatch(/^#[0-9a-f]{6}$/i)
      expect(result.accentHex).toMatch(/^#[0-9a-f]{6}$/i)
      expect(result.pathway).toBe(p)
      expect(result.seedHsl).toHaveLength(3)
    }
  })

  it('name-archaeology preserves hue of brand color', () => {
    const result = deriveDispatchColors(ROBINHOOD_GREEN, 'name-archaeology')
    const [brandH] = hexToHsl(ROBINHOOD_GREEN)
    const seedH = result.seedHsl[0]
    expect(Math.abs(seedH - brandH)).toBeLessThan(15)
  })

  it('product-elevation uses warm near-black regardless of brand hue', () => {
    const result = deriveDispatchColors(ROBINHOOD_GREEN, 'product-elevation')
    // Seed should be very dark (L < 15)
    expect(result.seedHsl[2]).toBeLessThan(15)
  })

  it('experience-capture produces very dark seed', () => {
    const result = deriveDispatchColors(FERRARI_RED, 'experience-capture')
    expect(result.seedHsl[2]).toBeLessThan(15)
  })

  it('seed is always darker than toneA', () => {
    const result = deriveDispatchColors(FERRARI_RED, 'name-archaeology')
    const [, , seedL] = result.seedHsl
    const [, , toneAL] = hexToHsl(result.toneA)
    expect(toneAL).toBeGreaterThanOrEqual(seedL)
  })

  it('handles black input without crashing', () => {
    const result = deriveDispatchColors('#000000', 'product-elevation')
    expect(result.seed).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('handles white input without crashing', () => {
    const result = deriveDispatchColors('#FFFFFF', 'name-archaeology')
    expect(result.seed).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
