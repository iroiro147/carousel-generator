import type { ThemeId } from '../types/theme'
import { getTheme } from '../themes'

// ─── Long-form: static theme colors ────────────────────────────────────────────
export function getThemeColors(themeId: ThemeId): Record<string, string> {
  const theme = getTheme(themeId) as Record<string, unknown>
  return theme.colors as Record<string, string>
}

// ─── Short-form: dynamic — color derived from illustration (async, backend) ────
export async function deriveSignatureColor(illustrationUrl: string): Promise<{
  signature_color: string
  tonal_variant: string
  passes_wcag_aa: boolean
  contrast_ratio: number
}> {
  const response = await fetch('/api/color/derive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ illustration_url: illustrationUrl }),
  })
  return response.json()
}
