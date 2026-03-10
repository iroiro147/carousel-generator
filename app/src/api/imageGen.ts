import type { Brief } from '../types/brief'
import type { ThemeId } from '../types/theme'
import type { CoverVariant } from '../types/variant'
import coverVariantsData from '../data/cover_variants_data.json'

// ─── Types ────────────────────────────────────────────────────────────────────
interface AngleDefinition {
  angle_key: string
  angle_name: string
  angle_description: string
  composition_mode?: string
  object_state_preference?: string
  object_selection_rule?: string
  headline_structure: string
  headline_example?: string
  rhetorical_register?: string
  illustration_mode?: string
  illustration_rule?: string
  scene_domain?: string
  pov_preference?: string
  dialogue_pool?: string
  overlay_pattern?: string
  wit_layer?: string
  figure_type?: string
  scene_rule?: string
  scene_preference?: string
  cartouche_style?: string
  propagation_metadata: Record<string, unknown>
}

// ─── Get angle definitions from cover_variants_data.json ──────────────────────
function getCoverAngles(themeId: ThemeId): AngleDefinition[] {
  const themes = coverVariantsData.themes as Record<
    string,
    { variants: Record<string, Omit<AngleDefinition, 'angle_key'>> }
  >
  const theme = themes[themeId]
  if (!theme) return []

  return Object.entries(theme.variants).map(([key, angle]) => ({
    ...angle,
    angle_key: key,
  }))
}

// ─── Generate a single cover variant via backend ──────────────────────────────
async function generateOneVariant(
  brief: Partial<Brief>,
  themeId: ThemeId,
  angle: AngleDefinition,
  index: number,
): Promise<{ variant: CoverVariant; index: number } | { index: number; error: string }> {
  try {
    const response = await fetch('/api/variants/generate-one', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief, theme_id: themeId, angle }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Request failed' }))
      return { index, error: (err as { error?: string }).error ?? 'Request failed' }
    }

    const variant = (await response.json()) as CoverVariant
    return { variant, index }
  } catch (err) {
    return { index, error: err instanceof Error ? err.message : 'Network error' }
  }
}

// ─── Generate all 3 cover variants (parallel, individual callbacks) ───────────
export function generateCoverVariants(
  brief: Partial<Brief>,
  themeId: ThemeId,
  callbacks: {
    onVariantComplete: (index: number, variant: CoverVariant) => void
    onVariantFailed: (index: number, error: string) => void
  },
): { promises: Promise<void>[]; angles: AngleDefinition[] } {
  const angles = getCoverAngles(themeId)

  const promises = angles.map(async (angle, i) => {
    const result = await generateOneVariant(brief, themeId, angle, i)
    if ('variant' in result) {
      callbacks.onVariantComplete(result.index, result.variant)
    } else {
      callbacks.onVariantFailed(result.index, result.error)
    }
  })

  return { promises, angles }
}

// ─── Retry a single failed variant ───────────────────────────────────────────
export async function retrySingleVariant(
  brief: Partial<Brief>,
  themeId: ThemeId,
  angleIndex: number,
): Promise<CoverVariant | null> {
  const angles = getCoverAngles(themeId)
  const angle = angles[angleIndex]
  if (!angle) return null

  const result = await generateOneVariant(brief, themeId, angle, angleIndex)
  if ('variant' in result) return result.variant
  return null
}
