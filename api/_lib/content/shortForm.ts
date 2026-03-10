// ─── Short-Form (NYT Opinion) Content Generation ───────────────────────────────
// 3-step process: argument extraction → slide count decision → quote generation.

import { callClaude } from '../providers/index.js'
import { MASTER_SYSTEM_PROMPT } from './longForm.js'
import { validateSlideContent } from './validate.js'
import type { SlideContent } from './validate.js'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface BriefPayload {
  topic: string
  brand_name: string
  claim: string
  audience?: string
  audience_display_label?: string
  content_notes?: string | null
}

interface ArgumentExtraction {
  thesis: string
  evidence: string | null
  landing: string
  argument_type: string
  has_tension: boolean
  tension_words: string[]
}

interface QuoteResult {
  quote_text: string
  word_count: number
  rhetorical_structure_used: string
  contains_surprise: boolean
  surprise_type: string
}

export interface ShortFormResult {
  slides: SlideContent[]
  argument: ArgumentExtraction
  slide_count: number
  has_tension: boolean
  has_errors: boolean
}

// ─── NYT Opinion quote generation system prompt addition ───────────────────────
const NYT_QUOTE_SYSTEM_ADDITION = `
ADDITIONAL RULES FOR NYT OPINION QUOTE GENERATION:

You are writing pull quotes for a short-form editorial carousel in the style
of NYT Opinion Instagram carousels.

Pull quote rules:
- The quote is the ENTIRE SLIDE. There is no supporting body text.
- It must be self-contained — readable without the article.
- It must contain a surprise: an unexpected fact, a vivid analogy,
  or a direct address to the reader.
- It is one unbroken paragraph — no line breaks, no sub-points, no bullets.
- It ends cleanly — no trailing em-dash, no ellipsis.
- Curly opening quote mark is required (\u201C — left double quotation mark).
  Do not include it in the JSON string — it will be added by the renderer.
- Rhetorical structure: follow the assigned structure for each slide role.

RHETORICAL STRUCTURES:

hard_fact: [Devastating statistic or concrete fact.] [Reframe what it means.]
           [Simple unavoidable implication.]

counterintuitive: [State the common assumption.] [Reveal the actual reality.]
                  [What this changes.]

escalation: [The problem.] [How it compounds.] [What it becomes at scale.]

solution_declaration: [Name the new reality.] [Why it works.]
                      [What it replaces or makes unnecessary.]

process_as_experience: [Second-person: what you do first.]
                       [What happens instantly.] [What you feel.]

cta_parenthetical: [The stakes.] [The action.]
                   [(A specific next step in parentheses — brand name included.)]`

// ─── Step 1: Argument Extraction ───────────────────────────────────────────────
async function extractArgument(brief: BriefPayload): Promise<ArgumentExtraction> {
  const systemPrompt = MASTER_SYSTEM_PROMPT

  const userPrompt = `You are extracting the argumentative structure from a carousel brief.

BRIEF CLAIM: ${brief.claim}
TOPIC: ${brief.topic}
ADDITIONAL NOTES: ${brief.content_notes ?? 'None'}

Extract the argument into three components:

1. THESIS — The central, potentially controversial claim. One sentence.
   Must contain tension — something that not everyone already agrees with.

2. EVIDENCE — The fact, analogy, or escalation that supports the thesis.
   One or two sentences. Must be specific — a stat, a named pattern,
   a vivid concrete example. If no specific evidence exists in the brief,
   return null and we will prompt the user.

3. LANDING — The emotional or philosophical payoff. What does accepting
   the thesis mean? What should the reader feel or do? One sentence.

4. ARGUMENT_TYPE — Classify the thesis as one of:
   hard_fact | counterintuitive | escalation | solution_declaration |
   process_as_experience | cta_parenthetical

Return JSON only:
{
  "thesis": string,
  "evidence": string | null,
  "landing": string,
  "argument_type": string,
  "has_tension": boolean,
  "tension_words": [string]
}`

  const raw = await callClaude(systemPrompt, userPrompt, 1024)
  const clean = raw.replace(/```json\n?|```\n?/g, '').trim()
  return JSON.parse(clean) as ArgumentExtraction
}

// ─── Step 2: Slide Count Decision ──────────────────────────────────────────────
function decideSlideCount(argument: ArgumentExtraction, brief: BriefPayload): number {
  // 4 slides if evidence is substantively distinct from landing
  // AND evidence is not null
  // AND brief.claim word count > 40 (enough content for 4 slides)
  if (
    argument.evidence &&
    !isSemanticallyRedundant(argument.evidence, argument.landing) &&
    brief.claim.split(' ').length > 40
  ) {
    return 4
  }
  return 3
}

/**
 * Simple semantic redundancy check — if evidence and landing share
 * more than 60% of their significant words, they're redundant.
 */
function isSemanticallyRedundant(a: string, b: string): boolean {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'can', 'shall',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'and', 'or', 'but', 'not', 'no', 'if', 'that', 'this', 'it',
    'as', 'so', 'than', 'its', 'they', 'them', 'their', 'what',
    'which', 'who', 'whom', 'when', 'where', 'how', 'all', 'each',
  ])

  const wordsA = new Set(
    a.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w)),
  )
  const wordsB = new Set(
    b.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w)),
  )

  if (wordsA.size === 0 || wordsB.size === 0) return false

  let overlap = 0
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++
  }

  const overlapRatio = overlap / Math.min(wordsA.size, wordsB.size)
  return overlapRatio > 0.6
}

// ─── Step 3: Quote Generation ──────────────────────────────────────────────────
async function generateQuote(
  brief: BriefPayload,
  argumentComponent: string,
  slideRole: string,
  rhetoricalStructure: string,
  wordRange: string,
): Promise<QuoteResult> {
  const systemPrompt = MASTER_SYSTEM_PROMPT + '\n' + NYT_QUOTE_SYSTEM_ADDITION

  const userPrompt = `BRIEF:
Topic: ${brief.topic}
Brand: ${brief.brand_name}
Audience: ${brief.audience_display_label ?? brief.audience ?? 'Not specified'}

ARGUMENT COMPONENT: ${argumentComponent}
SLIDE ROLE: ${slideRole}
RHETORICAL STRUCTURE: ${rhetoricalStructure}
WORD RANGE: ${wordRange} words

CONSTRAINTS: ${brief.content_notes ?? 'None'}

Write ONE pull quote following the assigned rhetorical structure.
The quote should feel like something a sharp columnist would write —
uncomfortable to ignore, easy to screenshot.

Return JSON only:
{
  "quote_text": string,
  "word_count": number,
  "rhetorical_structure_used": string,
  "contains_surprise": boolean,
  "surprise_type": "unexpected_fact | vivid_analogy | direct_address | reframe"
}`

  const raw = await callClaude(systemPrompt, userPrompt, 512)
  const clean = raw.replace(/```json\n?|```\n?/g, '').trim()
  return JSON.parse(clean) as QuoteResult
}

// ─── Map argument_type to rhetorical structure ─────────────────────────────────
function getStructureForRole(
  role: string,
  argumentType: string,
): string {
  // Thesis slide uses the argument_type as the structure
  if (role === 'thesis') return argumentType

  // Evidence escalates
  if (role === 'evidence') return 'escalation'

  // Landing resolves — either solution or CTA
  if (role === 'landing') {
    if (argumentType === 'cta_parenthetical') return 'cta_parenthetical'
    return 'solution_declaration'
  }

  return argumentType
}

// ─── Word range per slide role ─────────────────────────────────────────────────
function getWordRange(role: string): string {
  switch (role) {
    case 'thesis': return '30-70'
    case 'evidence': return '40-80'
    case 'landing': return '30-60'
    default: return '30-70'
  }
}

// ─── Main: Generate short-form content ─────────────────────────────────────────
export async function generateShortFormContent(
  brief: BriefPayload,
): Promise<ShortFormResult> {
  // Step 1: Extract argument
  const argument = await extractArgument(brief)

  // Step 2: Decide slide count
  const slideCount = decideSlideCount(argument, brief)

  // Step 3: Generate quotes
  const slides: SlideContent[] = []
  const quoteErrors: string[] = []

  // Slide 1 is always the cover (headline, no quote)
  slides.push({
    slide_index: 1,
    archetype: 'cover_hook',
    headline: argument.thesis.split('.')[0] ?? argument.thesis,
    body_text: null,
    cta_text: null,
    annotation_label: null,
    dialogue: null,
    quote_text: null,
  })

  if (slideCount === 3) {
    // 2 quote calls: thesis + landing (parallel)
    const [thesisQuote, landingQuote] = await Promise.all([
      generateQuote(
        brief,
        argument.thesis,
        'thesis',
        getStructureForRole('thesis', argument.argument_type),
        getWordRange('thesis'),
      ),
      generateQuote(
        brief,
        argument.landing,
        'landing',
        getStructureForRole('landing', argument.argument_type),
        getWordRange('landing'),
      ),
    ])

    slides.push(buildQuoteSlide(2, 'thesis', thesisQuote, brief.brand_name))
    slides.push(buildQuoteSlide(3, 'landing', landingQuote, brief.brand_name))
  } else {
    // 4 slides: thesis first, then evidence + landing in parallel
    const thesisQuote = await generateQuote(
      brief,
      argument.thesis,
      'thesis',
      getStructureForRole('thesis', argument.argument_type),
      getWordRange('thesis'),
    )
    slides.push(buildQuoteSlide(2, 'thesis', thesisQuote, brief.brand_name))

    const [evidenceQuote, landingQuote] = await Promise.all([
      generateQuote(
        brief,
        argument.evidence!,
        'evidence',
        getStructureForRole('evidence', argument.argument_type),
        getWordRange('evidence'),
      ),
      generateQuote(
        brief,
        argument.landing,
        'landing',
        getStructureForRole('landing', argument.argument_type),
        getWordRange('landing'),
      ),
    ])

    slides.push(buildQuoteSlide(3, 'evidence', evidenceQuote, brief.brand_name))
    slides.push(buildQuoteSlide(4, 'landing', landingQuote, brief.brand_name))
  }

  // Validate quote slides
  for (const slide of slides) {
    if (slide.quote_text) {
      const errors = validateSlideContent(slide, slide.archetype, 76)
      if (errors.length > 0) {
        quoteErrors.push(...errors)
        slide.needs_review = true
        slide.validation_errors = errors
      }
    }
  }

  return {
    slides,
    argument,
    slide_count: slideCount,
    has_tension: argument.has_tension,
    has_errors: quoteErrors.length > 0,
  }
}

// ─── Helper: build a quote slide from generation result ────────────────────────
function buildQuoteSlide(
  index: number,
  archetype: string,
  quote: QuoteResult,
  brandName: string,
): SlideContent {
  return {
    slide_index: index,
    archetype,
    headline: null as unknown as string,
    body_text: null,
    cta_text: archetype === 'landing' ? `Read more — ${brandName}` : null,
    annotation_label: null,
    dialogue: null,
    quote_text: quote.quote_text,
  }
}
