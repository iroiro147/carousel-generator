// ─── Stage 1: Analyze Content ────────────────────────────────────────────────
// Calls Gemini 2.5 Flash with the style pack's system prompt to produce
// a structured XML visual decision. NOT in providers/ — this is a pipeline
// step, not an image generator (Architecture Decision #1).

import { GoogleGenAI } from '@google/genai'

let ai: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) throw new Error('GOOGLE_API_KEY is not set (needed for Stage 1 Gemini Flash)')
    ai = new GoogleGenAI({ apiKey })
  }
  return ai
}

export interface AnalyzeContentParams {
  topic: string
  slideContent: string
  imageFocus: string
  systemPrompt: string
  /** 'unified' or 'discrete' — injected into system prompt {MODE_INSTRUCTION} */
  focusMode?: 'unified' | 'discrete'
}

/**
 * Stage 1: Call Gemini 2.5 Flash to reason about visual direction.
 * Returns raw XML string for the style pack's parseVisualDecision().
 *
 * Timeout is handled by the orchestrator (8s per attempt).
 */
export async function analyzeContent(params: AnalyzeContentParams): Promise<string> {
  const { topic, slideContent, imageFocus, systemPrompt, focusMode = 'unified' } = params

  const modeInstruction =
    focusMode === 'unified'
      ? 'AGGREGATION STRATEGY: Use UNIFIED mode. The focus items represent a relationship or single process - combine them into one artifact.'
      : 'AGGREGATION STRATEGY: Use DISCRETE mode. The focus items represent different parties or steps - give each its own <artifact> block with independent materials and conditions.'

  // Inject mode instruction into system prompt template
  const resolvedSystemPrompt = systemPrompt.replace('{MODE_INSTRUCTION}', modeInstruction)

  const userPrompt = `Topic: ${topic}

Slide Content: ${slideContent}

Image Focus: ${imageFocus}

${modeInstruction}

Based on the above topic, slide content, and image focus, provide your visual decision in the required XML format.`

  const response = await getClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: userPrompt,
    config: {
      systemInstruction: resolvedSystemPrompt,
    },
  })

  const text = response.text ?? ''
  if (!text.includes('<') || !text.includes('>')) {
    throw new Error('Stage 1 returned non-XML response')
  }

  return text
}
