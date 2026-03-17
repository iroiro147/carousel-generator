// ─── Long-Form Batch Content Generation ────────────────────────────────────────
// Generates all 14 slide copies in a single Claude call for coherent narrative arc.

import { callClaude } from '../providers/index.js'
import { validateSlideContent } from './validate.js'
import type { SlideContent } from './validate.js'

// ─── Master System Prompt ──────────────────────────────────────────────────────
// Applied to every generation call, regardless of theme.
export const MASTER_SYSTEM_PROMPT = `You are a creative director and senior copywriter for a carousel content generation system.
Your job is to write slide copy that is precise, human, and purposeful.

CORE RULES — apply to every generation call:

1. VOICE
   Write like a sharp journalist, not a marketer. Avoid: leverage, unlock,
   seamless, empower, transform, revolutionize, game-changing, cutting-edge,
   innovative, robust, comprehensive, holistic, synergy, ecosystem, journey.
   Use the active voice. Use specific nouns. Avoid abstract nouns where a
   concrete one exists.

2. PRECISION OVER COMPLETENESS
   A headline that says one sharp thing is always better than a headline that
   tries to say everything. A body sentence that is accurate and unexpected
   beats three sentences that are correct but forgettable.

3. REGISTER MATCH
   Read the audience and tone from the brief. Write at that level of
   sophistication. A cold consumer gets simpler syntax and shorter sentences.
   An institutional investor gets denser, more allusive prose.

4. NEVER INVENT FACTS
   If the brief does not contain a specific statistic, percentage, company name,
   or factual claim — do not generate one. Use the brief's stated facts only.
   If no fact is available, structure the sentence around principle or
   observation rather than data.

5. OUTPUT FORMAT
   Always respond with valid JSON only. No preamble, no explanation, no
   markdown fences. The JSON must exactly match the schema provided in the
   user prompt. Missing required fields will cause a validation error.

6. ANTI-AI VOICE
   Your output should pass the following test: a thoughtful editor should
   not be able to identify it as AI-generated. Avoid: starting sentences with
   "It's", "This is", "There are", "In today's", "As we", "We live in a world
   where". Avoid sentence pairs that follow exactly the same structure.
   Vary syntax. Use the em-dash, the colon, the short declarative sentence
   followed by a longer qualification. Write the way a confident person
   with good instincts writes.`

// ─── Per-Theme System Prompt Additions ─────────────────────────────────────────
const THEME_ADDITIONS: Record<string, string> = {
  dark_museum: `
DARK MUSEUM COPY RULES:

This is an exhibition. The headline is the exhibit label.
The body text is the curator's note — what this object reveals
about the larger argument.

Headline register: Declarative, institutional, slightly cold.
The object is the subject. "The Biometric Scanner. Proof that
security and speed are the same gate." Not: "How biometric
scanners are changing payments."

Body text register: Precise and forensic. Describe what the
object reveals. One insight per slide. Never more than 3 sentences.

The 14 slides must perform an examination — from the surface
(what you see) to the interior (what it means) to the consequence
(what it implies about the world). Structure the arc this way.

Avoid: questions, exclamation points, future tense ("will be",
"is going to"). Everything here is already true.`,

  nyt_opinion: `
NYT OPINION COPY RULES:

The cover headline (Slide 1) follows a different rule from the quotes.
The cover headline is the editorial headline — it names the argument's
stakes, not the argument itself. It should make the reader want to
read further, not summarize what they'll read.

Cover headline patterns per variant:
- The Metaphor variant: "The [Unexpected Adj] of [Known Thing]."
- The Figure variant: "What We Don't Understand About [X]."
- The Scene variant: "[Question]? [Unexpected Answer]."

The byline on every slide reads: "— {brand_name}"`,

  sic_toile: `
SIC TOILE COPY RULES:

This is an institutional publication from 1780. Write as if
the argument has been true for centuries and you are merely
recording it.

Headline register: Playfair uppercase will render this in all-caps.
Write in title case — the renderer handles capitalization.
Construct headlines as proclamations, not questions.
"Commerce. The oldest infrastructure."
"Built to endure. As the great clearing houses were."
Not: "How Juspay is building the future of payments."

Avoid: the word "innovation" entirely. Also: "digital", "modern",
"new", "today's", "cutting-edge". These are anachronistic in this
register. Instead: "the current era", "this generation's", "the
route now being drawn".

Body text: Dense and measured. 2–3 sentences. Period sentences,
not clause-heavy ones. The tone is the Encyclopédie — authoritative,
precise, slightly above the reader's casual register.

The annotation label (where present) names the scene domain in
formal plate notation. Format: "[DOMAIN NAME IN CAPS]. TAB. [N]."
Example: "CARTOGRAPHY. TAB. III." or "COMMERCE. TAB. V."`,

  radial_departure: `
RADIAL DEPARTURE COPY RULES:

This is a motion-forward carousel. The viewer is accelerating through
a zoom-burst photograph from a first-person POV. The text must carry
that forward momentum.

7 slides. One immersive cover photo. Content slides use flat colors
or CSS crops of the same photo.

Slide structure:
  1. COVER — The arrival. DM Sans 800 uppercase headline.
     Short, kinetic. "Before [X]. After, [Y]." or "[Number]. [Absence]."
  2. CONTENT CLAIM — Primary argument. Bold assertion + 1-2 supporting lines.
  3. CONTENT DATA — One key number. Hero stat as large display text. Use the
     number as headline. body_text is the contextual label beneath (max 8 words).
  4. CONTENT NARRATIVE — Story beat. 2-3 sentences of the core argument.
  5. CONTENT QUOTE — Expert quote or source attribution. headline = quote text.
  6. CONTENT CLAIM 2 — Secondary argument or consequence.
  7. END CTA — Call to action. headline = CTA statement. cta_text = brand URL or action.

Headline register: DM Sans 800 uppercase will render all headlines.
Write short, punchy, declarative. No questions. No hedging.
Maximum 6 words for cover. Maximum 10 words for content slides.

Body text: DM Sans 300. Brief — 1-2 sentences max. Supporting detail only.

Avoid: passive voice, future tense, marketing buzzwords. Everything
is happening now, at speed.`,

  editorial_minimal: `
EDITORIAL MINIMAL COPY RULES:

This is a Swiss editorial publication. Clean, typographic, restrained.
7 distinct slide types (A through G), each with its own visual character.
The copy must be precise enough to stand alone on stark backgrounds.

Slide types and their copy rules:

  TYPE A (Minimal White) — DM Sans 300 on white. The quietest slide.
    headline: A clear, measured statement. No capitals. 8-12 words.
    body_text: One supporting sentence. Optional.

  TYPE B (Dark Mode) — DM Sans 300 on near-black.
    headline: Same register as A but inverted. Slight edge.
    body_text: Optional. 1 sentence.

  TYPE C (Flat Blue) — DM Sans 300 on #1669D3.
    headline: A claim that deserves emphasis. The color says "pay attention."
    body_text: Required. 1-2 sentences. Context for the claim.

  TYPE D (Card Frame) — DM Sans 400 on light grey. Contains a photo in a card.
    headline: Descriptive. Names what the photo shows. 6-10 words.
    body_text: Caption-like. 1 sentence.

  TYPE E (Split Editorial) — EB Garamond 400 on dark olive header, photo below.
    headline: Serif register. More literary. A considered observation.
    body_text: Required. 2 sentences. The editorial voice.

  TYPE F (Full-Bleed Bold) — DM Sans 800 uppercase over photo. Accent color.
    headline: The boldest statement. UPPERCASE. Maximum 5 words.
    body_text: null — no subtitle on this type.

  TYPE G (Photo Overlay) — EB Garamond 400 over photo with gradient.
    headline: The reflective close. A sentence that lingers.
    body_text: Optional. The quiet conclusion.

General rules:
- No exclamation marks. No questions except genuine rhetorical ones.
- Each slide must be self-contained — readable without the others.
- The sequence must form a narrative arc across 5-7 slides.
- The archetype field in the output must be the slide type letter (A, B, C, D, E, F, or G).`,

}

// ─── Types ─────────────────────────────────────────────────────────────────────
interface BriefPayload {
  topic: string
  goal?: string
  goal_display_label?: string
  audience?: string
  audience_display_label?: string
  tone?: string[]
  tone_display_labels?: string[]
  brand_name: string
  claim: string
  content_category?: string
  content_category_display_label?: string
  content_notes?: string | null
}

interface ArchetypeSpec {
  name: string
  description?: string
  myth_chapter?: string
  notes?: string
  title_size: number
  body_size: number
}

// ─── Build the user prompt for batch generation ────────────────────────────────
function buildBatchUserPrompt(
  brief: BriefPayload,
  themeId: string,
  archetypeSequence: ArchetypeSpec[],
): string {
  const slideCount = archetypeSequence.length

  const slideList = archetypeSequence
    .map(
      (a, i) =>
        `Slide ${i + 1} — ${a.name}
Role: ${a.description ?? 'Standard slide'}
Narrative purpose: ${a.myth_chapter ?? a.notes ?? 'Continue the arc'}
Title size: ${a.title_size}px (larger = fewer words)
Body size: ${a.body_size}px`,
    )
    .join('\n\n')

  return `BRIEF:
Topic: ${brief.topic}
Goal: ${brief.goal_display_label ?? brief.goal ?? 'Not specified'}
Audience: ${brief.audience_display_label ?? brief.audience ?? 'Not specified'}
Tone: ${(brief.tone_display_labels ?? brief.tone ?? []).join(', ') || 'Not specified'}
Brand name: ${brief.brand_name}
Central claim: ${brief.claim}
Content category: ${brief.content_category_display_label ?? brief.content_category ?? 'Not specified'}
Additional constraints: ${brief.content_notes ?? 'None'}

THEME: ${themeId}

SLIDE SEQUENCE:
Generate copy for all ${slideCount} slides in order.
Each slide's archetype and role is listed below.

${slideList}

OUTPUT SCHEMA:
Return a JSON array of ${slideCount} objects. Each object:
{
  "slide_index": number,
  "archetype": string,
  "headline": string,
  "body_text": string | null,
  "cta_text": string | null,
  "annotation_label": string | null
}

Rules:
- headline: Required on every slide. Max word count scales inversely with
  title_size. At 88px: max 8 words. At 76px: max 12 words. At 68px: max 16 words.
- body_text: Required on slides with body_size > 0. 2–4 sentences.
  Null on text-only slides (pivot_question) where headline carries everything.
- cta_text: Only on cover_hook and cta_close archetypes. Max 6 words.
- annotation_label: Only on slides marked with annotation — format: "[DOMAIN]. TAB. [N]."
- The ${slideCount} headlines must form a coherent narrative arc — problem established
  early, solution introduced in the middle, resolution at the end.
- No headline should repeat a key word that appeared in the previous slide's headline.
- The pivot_question headline must be a genuine question — not rhetorical
  filler, a question that reframes what came before.`
}

// ─── Parse JSON from LLM response ──────────────────────────────────────────────
function parseJsonResponse(raw: string): unknown {
  // Strip markdown fences if present
  const clean = raw.replace(/```json\n?|```\n?/g, '').trim()
  return JSON.parse(clean)
}

// ─── Generate long-form content with validation + retry ────────────────────────
export async function generateLongFormContent(
  brief: BriefPayload,
  themeId: string,
  archetypeSequence: ArchetypeSpec[],
  _propagationMetadata?: Record<string, unknown>,
): Promise<{ slides: SlideContent[]; has_errors: boolean }> {
  const themeAddition = THEME_ADDITIONS[themeId] ?? ''
  const systemPrompt = MASTER_SYSTEM_PROMPT + '\n' + themeAddition

  let userPrompt = buildBatchUserPrompt(brief, themeId, archetypeSequence)

  let slides: SlideContent[] = []
  let lastErrors: string[] = []
  const maxRetries = 2

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const raw = await callClaude(systemPrompt, userPrompt, 4096)
      const parsed = parseJsonResponse(raw) as SlideContent[]

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array')
      }

      // Validate each slide
      const allErrors: string[] = []
      slides = parsed.map((slide, i) => {
        const archetype = archetypeSequence[i]
        const titleSize = archetype?.title_size ?? 76
        const errors = validateSlideContent(slide, slide.archetype, titleSize)

        if (errors.length > 0) {
          allErrors.push(`Slide ${i + 1} (${slide.archetype}): ${errors.join('; ')}`)
        }

        return {
          ...slide,
          dialogue: slide.dialogue ?? null,
          quote_text: slide.quote_text ?? null,
          needs_review: errors.length > 0,
          validation_errors: errors.length > 0 ? errors : undefined,
        }
      })

      // If no errors, return clean
      if (allErrors.length === 0) {
        return { slides, has_errors: false }
      }

      // On retry, append errors to prompt
      lastErrors = allErrors
      console.warn(`Content generation attempt ${attempt + 1} had errors:`, allErrors)

      if (attempt < maxRetries) {
        userPrompt += `\n\nPREVIOUS ATTEMPT HAD ERRORS. Fix these:\n${allErrors.join('\n')}`
      }
    } catch (err) {
      console.error(`Content generation attempt ${attempt + 1} failed:`, err)
      if (attempt === maxRetries) {
        throw err
      }
    }
  }

  // After max retries, return what we have with needs_review flags
  console.warn('Content generation completed with errors after retries:', lastErrors)
  return { slides, has_errors: lastErrors.length > 0 }
}

// ─── Single-slide regeneration ─────────────────────────────────────────────────
export async function regenerateSingleSlide(
  brief: BriefPayload,
  themeId: string,
  archetype: string,
  archetypeDescription: string,
  prevHeadline: string | null,
  nextHeadline: string | null,
): Promise<SlideContent> {
  const themeAddition = THEME_ADDITIONS[themeId] ?? ''
  const systemPrompt = MASTER_SYSTEM_PROMPT + '\n' + themeAddition

  const userPrompt = `You are regenerating copy for ONE slide in an existing carousel.

BRIEF (summary):
Topic: ${brief.topic}
Brand: ${brief.brand_name}
Theme: ${themeId}

SLIDE CONTEXT:
${prevHeadline ? `Previous slide headline: "${prevHeadline}"` : 'This is the first slide.'}

Current slide to regenerate (${archetype}):
  Role: ${archetypeDescription}

${nextHeadline ? `Next slide headline: "${nextHeadline}"` : 'This is the last slide.'}

Generate new copy for the CURRENT SLIDE only. It must:
- Flow naturally from the previous slide's headline
- Set up the next slide's headline without contradiction
- Serve the archetype's narrative role
- Be different from what was there before — if the user is
  regenerating, the previous version wasn't right

Return JSON only:
{
  "headline": string,
  "body_text": string | null,
  "cta_text": string | null
}`

  const raw = await callClaude(systemPrompt, userPrompt, 512)
  const parsed = parseJsonResponse(raw) as SlideContent

  return {
    slide_index: 0,
    archetype,
    headline: parsed.headline,
    body_text: parsed.body_text ?? null,
    cta_text: parsed.cta_text ?? null,
    annotation_label: null,
    dialogue: null,
    quote_text: null,
  }
}
