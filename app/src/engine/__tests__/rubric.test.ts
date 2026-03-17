import { test, expect, describe } from 'vitest'
import { runRubric } from '../rubric'
import type { Brief } from '../../types/brief'

// Helper to create a full Brief with defaults
function makeBrief(overrides: Partial<Brief>): Brief {
  return {
    brief_id: 'test',
    created_at: new Date().toISOString(),
    topic: 'Test topic for a carousel about something',
    goal: 'build_authority',
    claim: 'This is a sufficiently long claim for testing purposes that meets the minimum requirements.',
    audience: 'cold_b2b',
    tone: ['authoritative_confident'],
    brand_name: 'TestBrand',
    brand_color: null,
    content_notes: null,
    content_category: 'technical_explanation',
    format_preference: 'engine_decides',
    ...overrides,
  }
}

// ─── Worked Example 1: Passkey Checkout — dark_museum for educate/explain ────
describe('Example 1: Passkey Checkout — dark_museum wins for technical product', () => {
  const brief = makeBrief({
    topic: 'How passkey authentication makes checkout faster and frictionless for consumers on mobile',
    goal: 'product_awareness',
    claim: 'Passkey checkout is the fastest, most secure way to pay on mobile — and consumers love it once they try it.',
    audience: 'warm_consumer',
    tone: ['aspirational_elevated'],
    brand_name: 'Juspay',
    content_category: 'product_feature',
    content_notes: 'Show the checkout UX flow. Mention 40% improvement in conversion.',
  })

  const result = runRubric(brief)

  test('recommends dark_museum', () => {
    expect(result.recommended_theme).toBe('dark_museum')
  })

  test('confidence is HIGH or MEDIUM', () => {
    expect(['HIGH', 'MEDIUM']).toContain(result.confidence)
  })
})

// ─── Worked Example 2: Cross-Border Authority ─────────────────────────────
describe('Example 2: Cross-Border Authority — sic_toile HIGH', () => {
  const brief = makeBrief({
    topic: 'Juspay entering three new international cross-border markets — UAE, Malaysia, Singapore',
    goal: 'build_authority',
    claim: 'Juspay has built the payment infrastructure that serves 400 million users. The next frontier is cross-border — and we are already there.',
    audience: 'cold_b2b',
    tone: ['authoritative_confident', 'heritage_institutional'],
    brand_name: 'Juspay',
    content_category: 'cross_border_global',
    content_notes: 'Focus on the institutional credibility angle. UAE corridor, Malaysia corridor, Singapore corridor.',
  })

  const result = runRubric(brief)

  test('recommends sic_toile', () => {
    expect(result.recommended_theme).toBe('sic_toile')
  })

  test('confidence is HIGH', () => {
    expect(result.confidence).toBe('HIGH')
  })
})

// ─── Worked Example 3: OTP Security Argument ──────────────────────────────
describe('Example 3: OTP Security Argument — nyt_opinion or dark_museum', () => {
  const brief = makeBrief({
    topic: 'Why OTPs are security theater and passkeys are actually secure',
    goal: 'shift_belief',
    claim: 'OTPs create the illusion of security while being trivially easy to phish. Passkeys are actually secure — but the industry is too comfortable with the status quo to admit it.',
    audience: 'warm_b2b',
    tone: ['provocative_challenging'],
    brand_name: 'Juspay',
    content_category: 'opinion_argument',
    content_notes: 'Must mention phishing vulnerability stats. Show the gap between perceived and actual security. At least 6 distinct points to cover.',
  })

  const result = runRubric(brief)

  test('recommends nyt_opinion or dark_museum', () => {
    expect(['nyt_opinion', 'dark_museum']).toContain(result.recommended_theme)
  })

  test('nyt_opinion and dark_museum score above sic_toile', () => {
    const { nyt_opinion, dark_museum, sic_toile } = result.scores
    expect(Math.max(nyt_opinion, dark_museum)).toBeGreaterThan(sic_toile)
  })
})

// ─── Worked Example 4: Series C Fundraise ─────────────────────────────────
describe('Example 4: Series C Fundraise — sic_toile wins', () => {
  const brief = makeBrief({
    topic: 'Juspay company story for Series C fundraise — the infrastructure company for the next century of payments',
    goal: 'strategic_narrative',
    claim: 'Juspay is not a payments startup. It is the infrastructure layer that the next century of commerce will run on — just as the railways were to the industrial age.',
    audience: 'institutional_investors',
    tone: ['heritage_institutional'],
    brand_name: 'Juspay',
    content_category: 'institutional_narrative',
    content_notes: 'Frame as civilizational infrastructure. Reference the heritage of payment systems from Silk Road to UPI.',
  })

  const result = runRubric(brief)

  test('recommends sic_toile', () => {
    expect(result.recommended_theme).toBe('sic_toile')
  })

  test('sic_toile scores well above other themes', () => {
    const { sic_toile, dark_museum, nyt_opinion } = result.scores
    expect(sic_toile).toBeGreaterThan(dark_museum)
    expect(sic_toile).toBeGreaterThan(nyt_opinion)
  })
})

// ─── Worked Example 5: Checkout Drop-Off ──────────────────────────────────
describe('Example 5: Checkout Drop-Off — dark_museum or nyt_opinion', () => {
  const brief = makeBrief({
    topic: 'How we reduced checkout abandonment by 40% for a major ecommerce partner',
    goal: 'direct_response',
    claim: 'Real checkout moments from real customers show the difference. Before: 3 steps, 12 seconds, 60% abandonment. After: one tap, done.',
    audience: 'warm_b2b',
    tone: ['empathetic_human', 'aspirational_elevated'],
    brand_name: 'Juspay',
    content_category: 'customer_story',
    content_notes: 'Co-branded with partner. Show real checkout flow before/after. 40% drop-off reduction stat is the hero number.',
  })

  const result = runRubric(brief)

  test('recommends one of the active themes', () => {
    expect(['dark_museum', 'nyt_opinion', 'sic_toile', 'radial_departure', 'editorial_minimal']).toContain(result.recommended_theme)
  })
})

// ─── Gate Tests ───────────────────────────────────────────────────────────
describe('Gate checks', () => {
  test('Flat claim with no tension → NYT Opinion soft_fail with -3 penalty', () => {
    const brief = makeBrief({
      goal: 'educate_explain',
      claim: 'Here is how our payment gateway processes transactions in real time across multiple markets.',
    })
    const result = runRubric(brief)
    expect(result.gate_results.nyt_opinion).toBe('soft_fail')
  })

  test('Tension language in claim → NYT Opinion gate passes', () => {
    const brief = makeBrief({
      goal: 'shift_belief',
      claim: 'Most people think OTPs are secure, but actually they are trivially easy to phish.',
    })
    const result = runRubric(brief)
    expect(result.gate_results.nyt_opinion).toBe('passed')
  })
})

// ─── Structure tests ──────────────────────────────────────────────────────
describe('Result structure', () => {
  const brief = makeBrief({})
  const result = runRubric(brief)

  test('has all required fields', () => {
    expect(result).toHaveProperty('scores')
    expect(result).toHaveProperty('recommended_theme')
    expect(result).toHaveProperty('confidence')
    expect(result).toHaveProperty('alternative_theme')
    expect(result).toHaveProperty('gate_results')
    expect(result).toHaveProperty('eliminated_themes')
    expect(result).toHaveProperty('score_explanation')
  })

  test('scores has all 5 themes', () => {
    expect(result.scores).toHaveProperty('dark_museum')
    expect(result.scores).toHaveProperty('nyt_opinion')
    expect(result.scores).toHaveProperty('sic_toile')
    expect(result.scores).toHaveProperty('radial_departure')
    expect(result.scores).toHaveProperty('editorial_minimal')
  })

  test('confidence is HIGH, MEDIUM, or LOW', () => {
    expect(['HIGH', 'MEDIUM', 'LOW']).toContain(result.confidence)
  })

  test('recommended_theme is a valid theme', () => {
    const validThemes = ['dark_museum', 'nyt_opinion', 'sic_toile', 'radial_departure', 'editorial_minimal']
    expect(validThemes).toContain(result.recommended_theme)
  })

  test('score_explanation is a non-empty string', () => {
    expect(result.score_explanation.length).toBeGreaterThan(0)
  })
})
