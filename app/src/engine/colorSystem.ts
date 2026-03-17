import type { ThemeId } from '../types/theme'
import { getTheme } from '../themes'

// ─── Long-form: static theme colors ────────────────────────────────────────────
export function getThemeColors(themeId: ThemeId): Record<string, string> {
  const theme = getTheme(themeId) as Record<string, unknown>
  return theme.colors as Record<string, string>
}

// ─── Color derivation response shape ──────────────────────────────────────────

export interface ColorDerivationResult {
  signature_color: string
  tone_a: string
  tone_b: string
  alternation_range: 'wide' | 'medium' | 'narrow' | 'minimal'
  derivation_path: 'chromatic_primary' | 'chromatic_secondary' | 'material_neutral' | 'fallback'
  passes_wcag_aa: boolean
  contrast_ratio: number
  sentiment: string
  reasoning: string
}

// ─── Short-form: dynamic — color derived from cover image (async, backend) ────

export async function deriveSignatureColor(params: {
  imageBase64: string
  topic: string
  claim: string
}): Promise<ColorDerivationResult> {
  const response = await fetch('/api/color/derive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_base64: params.imageBase64,
      topic: params.topic,
      claim: params.claim,
    }),
  })
  return response.json()
}
