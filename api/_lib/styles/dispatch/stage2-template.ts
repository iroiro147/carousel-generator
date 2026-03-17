// ─── Dispatch Stage 2 Prompt Builder ──────────────────────────────────────────
// Builds pathway-specific image generation prompts from the visual decision.

import type { VisualDecision, Tokens } from '../../pipeline/types.js'

export function buildStage2Prompt(decision: VisualDecision, _tokens: Tokens): string {
  const pathway = decision.pathway as string
  const subject = decision.subject as string
  const scene = decision.scene_description as string
  const colorDir = decision.color_direction as string
  const eraStyle = decision.era_style as string
  const composition = decision.composition as string
  const witLayer = decision.wit_layer as string
  const quote = decision.quote as string
  const negativeParts = (decision.negative_prompt as string) || ''

  const baseNegative = 'text, watermark, logo, signature, brand name, UI elements, frame border'
  const negative = negativeParts ? `${baseNegative}, ${negativeParts}` : baseNegative

  switch (pathway) {
    case 'name-archaeology':
      return [
        `${eraStyle} of ${subject}, ${scene}.`,
        `Monochromatic ${colorDir} tint throughout.`,
        `${composition}.`,
        witLayer && witLayer !== 'none' ? `Visual wit: ${witLayer}.` : '',
        `Aged parchment texture within frame, fine line work, high detail, centered composition.`,
        `Portrait orientation 4:5.`,
        `Negative: ${negative}, photorealistic, modern style, color gradients, flat design, cartoon, neon, bright colors, multiple colors`,
      ].filter(Boolean).join(' ')

    case 'experience-capture':
      return [
        `First-person photography: ${scene}.`,
        `${colorDir} color palette from practical light sources only.`,
        `${composition}.`,
        `Human presence as silhouette or shape only — never face, never identifiable.`,
        quote && quote !== 'none' ? `Atmosphere that evokes: "${quote}".` : '',
        `Cinematic, atmospheric, editorial photography style. Portrait orientation 4:5.`,
        `Negative: ${negative}, studio lighting, posed portrait, identifiable face, bright colors`,
      ].filter(Boolean).join(' ')

    case 'symbol-literalization':
      return [
        `${subject}, rendered as a living creature in ${eraStyle}.`,
        `${scene}.`,
        `Warm near-black (#0A0505) subject color, ${colorDir} background.`,
        `Single hard key light, faint edge highlight on one surface only, all else falls to near-black.`,
        `${composition}. Near-silhouette detail level.`,
        `Portrait orientation 4:5.`,
        `Negative: ${negative}, flat illustration, cartoon, bright colors, multiple light sources, visible ground plane`,
      ].filter(Boolean).join(' ')

    case 'product-elevation':
    default:
      return [
        `Studio product photography: ${subject}. ${scene}.`,
        `Black studio, no environmental context, no packaging, no branding.`,
        `Single hard key light, no fill. ${colorDir} color grade.`,
        `${composition}.`,
        `Crushed blacks, pushed highlights, macro detail. Portrait orientation 4:5.`,
        `Negative: ${negative}, environmental context, packaging, labels, bright studio, multiple lights`,
      ].filter(Boolean).join(' ')
  }
}
