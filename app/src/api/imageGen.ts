import type { Brief } from '../types/brief'
import type { ThemeId } from '../types/theme'
import type { CoverVariant, ImageModel } from '../types/variant'

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

// ─── Fetch angle definitions from /api/styles/angles ─────────────────────────
async function getCoverAngles(themeId: ThemeId): Promise<AngleDefinition[]> {
  const response = await fetch(`/api/styles/angles?id=${themeId}`)
  if (!response.ok) {
    console.error('Failed to fetch angles:', response.status)
    return []
  }
  const data = (await response.json()) as { angles: AngleDefinition[] }
  return data.angles
}

// ─── Generate a single cover variant via backend ──────────────────────────────
async function generateOneVariant(
  brief: Partial<Brief>,
  themeId: ThemeId,
  angle: AngleDefinition,
  index: number,
  model: ImageModel = 'gpt-image-1.5',
): Promise<{ variant: CoverVariant; index: number } | { index: number; error: string }> {
  try {
    const response = await fetch('/api/variants/generate-one', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief, theme_id: themeId, angle, model }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Request failed' }))
      return { index, error: (err as { error?: string }).error ?? 'Request failed' }
    }

    const variant = (await response.json()) as CoverVariant
    // Tag with the model used
    variant.model = model
    return { variant, index }
  } catch (err) {
    return { index, error: err instanceof Error ? err.message : 'Network error' }
  }
}

// ─── Generate all 3 cover variants (parallel, individual callbacks) ───────────
export async function generateCoverVariants(
  brief: Partial<Brief>,
  themeId: ThemeId,
  model: ImageModel,
  callbacks: {
    onVariantComplete: (index: number, variant: CoverVariant) => void
    onVariantFailed: (index: number, error: string) => void
  },
): Promise<{ promises: Promise<void>[]; angles: AngleDefinition[] }> {
  const angles = await getCoverAngles(themeId)

  const promises = angles.map(async (angle, i) => {
    const result = await generateOneVariant(brief, themeId, angle, i, model)
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
  model: ImageModel = 'gpt-image-1.5',
): Promise<CoverVariant | null> {
  const angles = await getCoverAngles(themeId)
  const angle = angles[angleIndex]
  if (!angle) return null

  const result = await generateOneVariant(brief, themeId, angle, angleIndex, model)
  if ('variant' in result) return result.variant
  return null
}
