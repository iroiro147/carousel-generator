// ─── Eval Runner (Skeleton) ──────────────────────────────────────────────────
// Reads evals.json for a style pack, runs Stage 1 on each input,
// compares output XML against expected fields.
// Populate with real pairs after 50+ production generation records.

import { readFileSync } from 'fs'
import { join } from 'path'
import { analyzeContent } from './analyzeContent.js'
import { loadStyle } from './styleLoader.js'

interface EvalCase {
  input: {
    topic: string
    slideContent: string
    imageFocus: string
  }
  expected: {
    /** Fields that must be present in the parsed visual decision */
    requiredFields: string[]
    /** Optional: expected physical_condition values */
    conditions?: string[]
  }
}

export interface EvalResult {
  styleId: string
  totalCases: number
  passed: number
  failed: number
  results: Array<{
    input: EvalCase['input']
    pass: boolean
    errors: string[]
  }>
}

/**
 * Run evals for a style pack. Returns results without throwing.
 */
export async function runEvals(styleId: string): Promise<EvalResult> {
  const stylePack = await loadStyle(styleId)
  // Style IDs use underscores (dark_museum) but directories use kebab-case (dark-museum)
  const dirName = styleId.replace(/_/g, '-')
  const evalsPath = join(__dirname, '../styles', dirName, 'evals.json')

  let cases: EvalCase[]
  try {
    cases = JSON.parse(readFileSync(evalsPath, 'utf-8'))
  } catch {
    return { styleId, totalCases: 0, passed: 0, failed: 0, results: [] }
  }

  if (cases.length === 0) {
    return { styleId, totalCases: 0, passed: 0, failed: 0, results: [] }
  }

  const results: EvalResult['results'] = []

  for (const evalCase of cases) {
    const errors: string[] = []
    try {
      const xml = await analyzeContent({
        topic: evalCase.input.topic,
        slideContent: evalCase.input.slideContent,
        imageFocus: evalCase.input.imageFocus,
        systemPrompt: stylePack.stage1SystemPrompt,
      })

      const decision = stylePack.parseVisualDecision(xml)

      for (const field of evalCase.expected.requiredFields) {
        if (!decision[field]) {
          errors.push(`Missing field: ${field}`)
        }
      }
    } catch (err) {
      errors.push(`Exception: ${err instanceof Error ? err.message : String(err)}`)
    }

    results.push({
      input: evalCase.input,
      pass: errors.length === 0,
      errors,
    })
  }

  return {
    styleId,
    totalCases: cases.length,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    results,
  }
}
