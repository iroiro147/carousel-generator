// ─── SIC Toile Stage 2 Prompt Builder ────────────────────────────────────────
// Assembles the GPT-Image-1.5 prompt from the parsed visual decision.
// Single rendering path: copper-plate engraving in indigo on cream.

import type { VisualDecision, Tokens } from '../../pipeline/types.js'

export function buildStage2Prompt(decision: VisualDecision, _tokens: Tokens): string {
  const scene = decision.full_scene_description as string
  const figureCount = decision.figure_count as number ?? 7
  const density = decision.density as number ?? 3
  const hatchingZones = decision.hatching_zones as string ?? 'parallel hatching for sky and water, cross-hatching for architectural shadows'
  const stipplingZones = decision.stippling_zones as string ?? 'stippling for soft fabric textures and clouds'
  const contourEmphasis = decision.contour_emphasis as string ?? 'boldest outlines on primary figures and central objects'
  const physicalState = decision.physical_state as string ?? 'in full operation'
  const architecturalSetting = decision.architectural_setting as string ?? 'classical columns and arched doorways'

  const densityInstruction = getDensityInstruction(density)
  const textZoneInstruction = 'Leave the bottom 35% of the frame completely empty (no figures, no architecture, no marks) — this zone is reserved for text overlay.'

  return `Single-color copper-plate engraving illustration of ${scene}. Rendered entirely in indigo (#2A2ECD) on white/transparent ground. ${densityInstruction} ${figureCount} or more figures in period dress (18th-century costume). ${hatchingZones}. ${stipplingZones}. ${contourEmphasis}. Scene state: ${physicalState}. Architectural setting: ${architecturalSetting}. 18th-century French engraving aesthetic — Encyclopédie Diderot plates register. Full narrative scene with ground plane and architectural depth. ${textZoneInstruction} Elaborate but legible at carousel scale. No color other than this single indigo. No fills, no gradients, no photography — pure engraving linework, cross-hatching, parallel hatching, and stippling only.`
}

function getDensityInstruction(density: number): string {
  switch (density) {
    case 0:
    case 1:
      return 'Minimal scene — single figure or simple still life.'
    case 2:
      return 'Intimate scene — two to three figures, simple architectural backdrop.'
    case 3:
      return 'Moderate scene — five to seven figures with clear architectural framing.'
    case 4:
      return 'Populated scene — eight to twelve figures in full architectural setting.'
    case 5:
      return 'Grand panoramic scene — fifteen or more figures, dense architectural detail, maximum visual complexity.'
    default:
      return 'Full scene with seven or more figures in architectural setting.'
  }
}
