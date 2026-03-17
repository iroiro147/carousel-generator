// ─── Image Prompt Builder ──────────────────────────────────────────────────────
// Builds theme-specific image generation prompts for body slides.
// Each theme has its own visual language, medium, and prompt structure.

type ThemeId =
  | 'dark_museum'
  | 'nyt_opinion'
  | 'sic_toile'

export interface PromptParams {
  theme_id: string
  archetype: string
  object_name: string
  object_state: string
  object_domain?: string
  brief_context?: string
  // NYT Opinion specific
  illustration_mode?: string
  emotional_register?: string
  dominant_hue?: string
  // SIC Toile specific
  scene_description?: string
  figure_count?: number
  architectural_elements?: string
}

// ─── Main entry point ──────────────────────────────────────────────────────────
export function buildImagePrompt(params: PromptParams): string {
  switch (params.theme_id as ThemeId) {
    case 'dark_museum':
      return buildDarkMuseumPrompt(params)
    case 'nyt_opinion':
      return buildNYTOpinionPrompt(params)
    case 'sic_toile':
      return buildSICToilePrompt(params)
    default:
      return `Professional illustration of ${params.object_name} for ${params.theme_id} theme, high quality, editorial aesthetic`
  }
}

// ─── Dark Museum State Descriptors ─────────────────────────────────────────────
const DARK_MUSEUM_STATE_DESCRIPTORS: Record<string, string> = {
  gleaming: 'pristine and perfect with sharp specular highlights, precision-machined metal and glass',
  weathered: 'aged with warm patina, subtle wear marks telling a history of use, brass showing through chrome',
  degraded: 'failing with visible structural damage, hairline fractures in glass, oxide corrosion on exposed metal edges',
  activated: 'powered on with internal illumination visible through translucent surfaces, operational state',
  sealed: 'hermetically sealed, museum-grade preservation, no signs of human contact',
}

// ─── Dark Museum Material Descriptors by Domain ────────────────────────────────
const DARK_MUSEUM_MATERIAL_DESCRIPTORS: Record<string, string> = {
  security_access: 'brushed aluminum housing, precision-machined edges, sapphire glass lens element',
  time_decay: 'polished brass body, engraved measurement markings, leather-wrapped grip',
  friction_chaos: 'industrial steel construction, oxide patina on exposed welds, cable bundle detail',
  opportunity_opening: 'polished brass body, engraved measurement markings, leather-wrapped grip',
  foundation_infrastructure: 'industrial steel construction, reinforced joints, cable bundle detail',
  process_sequence: 'polished brass body, fine mechanical detail, precision gearing visible',
  identity_proof: 'aged cream paper stock, letterpress typography visible, hand-written annotation',
  balance_optimization: 'precision-machined brass and steel, calibrated measurement surfaces',
  complexity_technology: 'brushed aluminum housing, micro-component arrays visible, sapphire glass',
}

function buildDarkMuseumPrompt(params: PromptParams): string {
  const stateDesc = DARK_MUSEUM_STATE_DESCRIPTORS[params.object_state] ?? params.object_state
  const materialDesc = DARK_MUSEUM_MATERIAL_DESCRIPTORS[params.object_domain ?? ''] ?? 'precision-machined metal and glass'

  return `${params.object_name} rendered as a luxury museum specimen — ${materialDesc}, ${stateDesc}, suspended in absolute darkness with a single overhead spotlight creating a precise cone of warm light (3200K), deep shadow falling directly below, micro-scratches visible on surface, photorealistic 3D render, studio product photography quality, no background elements, object positioned center-canvas, object fills 70% of frame, ultra-high detail, 8K render quality`
}

// ─── NYT Opinion ───────────────────────────────────────────────────────────────
function buildNYTOpinionPrompt(params: PromptParams): string {
  const mode = params.illustration_mode ?? 'editorial_cartoon'
  const dominantHue = params.dominant_hue ?? 'warm red-orange'

  switch (mode) {
    case 'editorial_cartoon':
      return `Flat vector editorial illustration of ${params.object_name} as a commentary — bold saturated colors in a limited palette of 2-3 colors, clean confident outlines with no gradients, flat color fills only, mid-century editorial illustration aesthetic — Ben Shahn meets Push Pin Studios, centered scene composition, white or light background, ${dominantHue} as the primary color occupying 60-70% of the image area, black outlines throughout, no photographic elements, no gradients, no shadows — pure flat vector aesthetic`

    case 'fine_art_expressive': {
      const emotion = params.emotional_register ?? 'haunted'
      return `Drypoint etching of a figure contemplating ${params.object_name} — ${emotion} emotional register, heavy texture throughout from drypoint burr, figure partially visible in shadow, muted palette dominated by ${dominantHue}, atmospheric and expressive rather than precise, somber mood, the mark-making is the emotional content, museum-quality fine art print aesthetic`
    }

    case 'conceptual_photography':
      return `Studio chiaroscuro photograph of ${params.object_name} as symbolic object — single dramatic light source from upper left, isolated against pure black background, strong specular highlight on edges, cinematic and slightly uncomfortable register, photorealistic, high material quality surface detail`

    default:
      return `Flat vector editorial illustration of ${params.object_name}, bold colors, clean outlines, editorial aesthetic, white background`
  }
}

// ─── SIC Toile State Vocabulary ────────────────────────────────────────────────
const SIC_TOILE_STATE_VOCABULARY: Record<string, string> = {
  'in ruins': 'structural collapse visible, vegetation encroaching through cracks, dramatic shadow in ruin depth',
  'in disorder': 'figures in agitated poses, scattered objects across ground plane, gestural energy in composition',
  'in full operation': 'active figures at each stage of process, purposeful movement implied through pose angles',
  'sealed and witnessed': 'formal tableau with document as compositional center, figures in grave witness poses',
  'newly surveyed': 'open horizon visible, surveying equipment prominent, scene has air of discovery and open space',
  'under construction': 'scaffolding visible, workers in period dress, architectural framework emerging',
  'in procession': 'figures in ordered march, ceremonial objects carried, architectural backdrop',
  'in exchange': 'merchant scene with goods and currency visible, balanced composition of giver and receiver',
}

function buildSICToilePrompt(params: PromptParams): string {
  const stateDesc = SIC_TOILE_STATE_VOCABULARY[params.object_state] ?? params.object_state
  const scene = params.scene_description ?? `a ${params.object_domain ?? 'commerce exchange'} scene related to ${params.object_name}`
  const figureCount = params.figure_count ?? 7
  const archElements = params.architectural_elements ?? 'classical columns and arched doorways'

  return `Single-color copper-plate engraving illustration of ${scene} — rendered entirely in indigo (#2A2ECD) on white/transparent ground, fine parallel hatching for mid-tone areas, cross-hatching for deep shadows under ${archElements}, stippling for soft textures, clean confident contour lines for primary figure and object outlines, 18th-century French engraving aesthetic — Encyclopédie Diderot plates register, full narrative scene with ground plane and architectural setting, ${stateDesc}, ${figureCount} or more figures in period dress, elaborate but legible at carousel scale, no color other than this single indigo — no fills, no gradients, pure line and mark work`
}

