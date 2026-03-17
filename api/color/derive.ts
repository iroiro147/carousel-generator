// ─── NYT Color Derivation Endpoint ────────────────────────────────────────────
// POST /api/color/derive
//
// Full 8-step pipeline:
//   Steps 1-5: Gemini Flash vision → palette analysis (paletteAnalyzer.ts)
//   Steps 6-8: HSL math → tone derivation (colorDerivation.ts)
//
// Request body:
//   { image_base64: string, topic: string, claim: string }
//
// Response:
//   { signature_color, tone_a, tone_b, alternation_range, derivation_path,
//     passes_wcag_aa, contrast_ratio, sentiment, reasoning }

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { analyzePalette } from '../_lib/color/paletteAnalyzer.js'
import { deriveColorTones } from '../_lib/color/colorDerivation.js'

// Fallback values from nyt-opinion tokens
const FALLBACK_SIGNATURE = '#CD5C45'
const FALLBACK_TONE_A = '#E8D5D0'   // Soft warm pastel from fallback hue
const FALLBACK_TONE_B = '#C2785B'   // Bolder warm from fallback hue

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { image_base64, topic, claim } = req.body ?? {}

  // If no image provided, return token fallbacks immediately
  if (!image_base64) {
    return res.json({
      signature_color: FALLBACK_SIGNATURE,
      tone_a: FALLBACK_TONE_A,
      tone_b: FALLBACK_TONE_B,
      alternation_range: 'medium',
      derivation_path: 'fallback',
      passes_wcag_aa: true,
      contrast_ratio: 7.1,
      sentiment: 'standard',
      reasoning: 'No image provided — using token fallback colors',
    })
  }

  try {
    // Steps 1-5: Gemini Flash vision analysis (10s budget)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    let analysisResult
    try {
      analysisResult = await analyzePalette({
        imageBase64: image_base64,
        topic: topic ?? 'editorial article',
        claim: claim ?? '',
      })
    } finally {
      clearTimeout(timeout)
    }

    // Steps 6-8: Pure HSL math
    const tones = deriveColorTones(analysisResult)

    return res.json({
      signature_color: tones.signature_color,
      tone_a: tones.tone_a,
      tone_b: tones.tone_b,
      alternation_range: tones.alternation_range,
      derivation_path: tones.derivation_path,
      passes_wcag_aa: tones.passes_wcag_aa,
      contrast_ratio: tones.contrast_ratio,
      sentiment: analysisResult.sentiment,
      reasoning: analysisResult.reasoning,
    })
  } catch (error) {
    // Vision call failed — return fallbacks, never crash the carousel assembly
    console.error('[color/derive] Pipeline failed, using fallbacks:', error)
    return res.json({
      signature_color: FALLBACK_SIGNATURE,
      tone_a: FALLBACK_TONE_A,
      tone_b: FALLBACK_TONE_B,
      alternation_range: 'medium',
      derivation_path: 'fallback',
      passes_wcag_aa: true,
      contrast_ratio: 7.1,
      sentiment: 'standard',
      reasoning: `Vision analysis failed — using fallback colors. Error: ${(error as Error).message}`,
    })
  }
}
