// ─── Content Validation ────────────────────────────────────────────────────────
// Validates LLM-generated slide content against quality rules.

export interface SlideContent {
  slide_index: number
  archetype: string
  headline: string
  body_text: string | null
  cta_text: string | null
  annotation_label: string | null
  dialogue: string | null
  quote_text: string | null
  word_counts?: {
    headline: number
    body_text: number | null
    dialogue: number | null
  }
  needs_review?: boolean
  validation_errors?: string[]
}

// AI voice markers — these betray machine-generated copy
const FORBIDDEN_WORDS = [
  'leverage',
  'unlock',
  'seamless',
  'empower',
  'transform',
  'revolutionize',
  'game-changing',
  'cutting-edge',
  'innovative',
  'robust',
  'comprehensive',
  'holistic',
  'synergy',
  'ecosystem',
]

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Map title font size → maximum headline word count.
 * Larger type means fewer words fit. Shorter is almost always better.
 */
export function getMaxWordCount(titleSize: number): number {
  if (titleSize >= 100) return 6
  if (titleSize >= 88) return 8
  if (titleSize >= 80) return 10
  if (titleSize >= 76) return 12
  if (titleSize >= 72) return 14
  return 16
}

/**
 * Validate a single slide's generated content.
 * Returns an array of error strings — empty means the slide is clean.
 */
export function validateSlideContent(
  content: SlideContent,
  _archetype: string,
  titleSize: number,
): string[] {
  const errors: string[] = []

  // ── Headline word count ───────────────────────────────────────────────
  if (content.headline) {
    const maxWords = getMaxWordCount(titleSize)
    const wc = wordCount(content.headline)
    if (wc > maxWords) {
      errors.push(`HEADLINE_TOO_LONG: ${wc} words, max ${maxWords}`)
    }
  }

  // ── Forbidden words (AI voice markers) ────────────────────────────────
  const allText = [content.headline, content.body_text, content.quote_text, content.cta_text]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const found = FORBIDDEN_WORDS.filter((w) => allText.includes(w))
  if (found.length > 0) {
    errors.push(`FORBIDDEN_WORDS: ${found.join(', ')}`)
  }

  // ── Experience Capture dialogue must have speech-rhythm breaks ────────
  if (content.dialogue && !content.dialogue.includes('\\n')) {
    errors.push('DIALOGUE_MISSING_SPEECH_BREAKS')
  }

  // ── NYT Opinion quote word count (30–80 range) ───────────────────────
  if (content.quote_text) {
    const wc = wordCount(content.quote_text)
    if (wc < 30 || wc > 80) {
      errors.push(`QUOTE_WORD_COUNT_OUT_OF_RANGE: ${wc}`)
    }
  }

  return errors
}
