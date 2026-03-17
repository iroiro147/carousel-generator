// ─── NYT Editorial Stage 2 Prompt Builder ────────────────────────────────────
// Assembles the image generation prompt from the parsed visual decision.
// Four rendering modes: ink_gouache, conceptual_photography,
//                       object_photography, cinematic_render
//
// Model routing: Nano Banana 2 is PRIMARY for all NYT Editorial modes.
// GPT-Image-1.5 is fallback. This overrides the global routing rule.
// Set in styles/nyt-opinion/config.ts:
//   stage2ModelPrimary: 'nano-banana-2'
//   stage2ModelFallback: 'gpt-image-1.5'

import type { VisualDecision, Tokens } from '../../pipeline/types.js'

export function buildStage2Prompt(decision: VisualDecision, tokens: Tokens): string {
  const mode = decision.illustration_mode as string
  const subject = decision.subject_description as string
  const fallbackSig = (tokens.colors as Record<string, string>)?.fallback_signature ?? '#CD5C45'
  const signatureHex = (decision.signature_hex as string) ?? fallbackSig
  const cropInstruction = (decision.crop_instruction as string) ?? ''

  switch (mode) {
    case 'ink_gouache':
      return buildInkGouache(subject, signatureHex, cropInstruction)
    case 'conceptual_photography':
      return buildConceptualPhotography(subject, signatureHex)
    case 'object_photography':
      return buildObjectPhotography(subject, signatureHex)
    case 'cinematic_render':
      return buildCinematicRender(subject, signatureHex)
    // Legacy mapping — routes old editorial_cartoon to ink_gouache
    case 'editorial_cartoon':
      return buildInkGouache(subject, signatureHex, cropInstruction)
    // Legacy mapping — routes old fine_art_expressive to ink_gouache
    case 'fine_art_expressive':
      return buildInkGouache(subject, signatureHex, cropInstruction)
    default:
      return buildInkGouache(subject, signatureHex, cropInstruction)
  }
}

// ─── Mode 1: Ink Gouache ─────────────────────────────────────────────────────
// The workhorse editorial illustration mode. Ink outlines, gouache fills,
// paper grain, partial crop. Replaces the old flat vector approach.
function buildInkGouache(
  subject: string,
  signatureHex: string,
  cropInstruction: string
): string {
  const cropNote = cropInstruction && cropInstruction !== 'none'
    ? `Deliberate partial crop: ${cropInstruction}. Subject bleeds off the edge — do not center everything within the frame.`
    : 'Subject bleeds off at least one edge of the frame — do not center everything within empty space.'

  return [
    `Editorial illustration in ink and gouache: ${subject}.`,
    `Background fills entirely with ${signatureHex}.`,
    `Bold saturated colors in a strict palette of 2-3 colors anchored by ${signatureHex}.`,
    `Black ink outlines with variable weight — thicker at pressure points and corners, thinner at edges, with visible hand-drawn character and slight natural wobble. Lines feel like they came from a real pen, not a vector tool.`,
    `Flat gouache color fills with subtle tonal variation within each shape — slight ink pooling at edges, paper grain showing through, not perfectly uniform or mathematically smooth.`,
    `Subtle paper grain texture across the ENTIRE image surface — background and all filled areas — as if printed on uncoated editorial stock. This grain is essential.`,
    `Each figure has individual posture, gesture, and visual personality — not identical silhouettes.`,
    cropNote,
    `Mid-century editorial illustration aesthetic — Ben Shahn, Push Pin Studios, NYT Opinion cover quality.`,
    `No gradients. No digital smoothness. No perfectly uniform fills. No photographic elements.`,
    `No text, no labels, no speech bubbles. Portrait orientation 4:5.`,
  ].join(' ')
}

// ─── Mode 2: Conceptual Photography ─────────────────────────────────────────
// Dark chiaroscuro. Object against deep signature-color background.
// The background is NOT black — it fills with the signature color.
function buildConceptualPhotography(subject: string, signatureHex: string): string {
  return [
    `Studio chiaroscuro photograph: ${subject}.`,
    `Deep ${signatureHex} background fills the entire canvas — NOT black, NOT dark grey. The background IS the signature color, darkening toward near-black only at the extreme edges through a subtle radial vignette.`,
    `Single dramatic light source from upper left. Object or hand+object isolated against the colored background with no environmental context visible.`,
    `If a hand is present: hand partially cropped at top edge of frame — only the grip is visible, arm mostly outside the frame.`,
    `Strong specular highlights on the object's surface edges. The object should feel simultaneously beautiful and uncomfortable.`,
    `Heavy film grain across the entire image surface — visible, intentional, editorial quality.`,
    `Photorealistic, high material quality surface detail. Cinematic register.`,
    `No text, no labels, no studio equipment, no environmental context. Portrait orientation 4:5.`,
  ].join(' ')
}

// ─── Mode 3: Object Photography ──────────────────────────────────────────────
// Clinical white background. Single isolated object.
// Object IS the color. White space below for headline band.
function buildObjectPhotography(subject: string, signatureHex: string): string {
  return [
    `Studio product photograph: ${subject}.`,
    `Pure white background (#FFFFFF) — clean, clinical, slightly unsettling register.`,
    `Soft even studio lighting with slight specular highlights on the object's surface.`,
    `Subtle paper grain texture on the white background — as if photographed for print editorial, not a perfectly smooth digital surface.`,
    `Object occupies approximately 55% of canvas height, centered horizontally, positioned in the upper 65% of the frame. Generous white space below for headline placement.`,
    `Object must be in an imperfect physical state: crumpled, deflated, slightly discarded, recently used — never pristine or perfectly arranged. The imperfection is the concept.`,
    `The object's dominant color is ${signatureHex} — this is the signature color of the carousel.`,
    `No environmental context, no shadows extending beyond the object, no packaging, no branding.`,
    `No text, no labels. Portrait orientation 4:5.`,
  ].join(' ')
}

// ─── Mode 4: Cinematic Render ─────────────────────────────────────────────────
// 3D rendered figure. Screen glow. Blurred crowd.
// Pixar-adjacent but melancholy. Face in profile or shadow.
function buildCinematicRender(subject: string, signatureHex: string): string {
  return [
    `Cinematic 3D render: ${subject}.`,
    `Pixar-adjacent photorealistic 3D rendering — volumetric lighting, subsurface skin scattering, shallow depth of field. Grounded and melancholy register, not aspirational.`,
    `Figure in profile or face turned away from camera. If profile: face visible but in shadow or turned slightly downward. Never front-facing. The isolation should be felt, not explained.`,
    `Practical light source illuminates the figure from one direction only — phone screen glow (${signatureHex} color temperature), neon light, or similar. This practical light color is ${signatureHex} and also appears as the headline band color in the carousel.`,
    `Abstract dark background with blurred human shapes suggesting a crowd — NOT a recognizable street, building, or environment. Heavy bokeh on all background and foreground elements. The crowd is present but unreachable.`,
    `Central figure is sharp. Background figures are warm-toned bokeh blobs contrasting with the cool practical light on the central figure.`,
    `Slight film grain. No text, no labels, no recognizable location. Portrait orientation 4:5.`,
  ].join(' ')
}
