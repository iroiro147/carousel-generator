// ─── NYT Opinion Stage 2 Prompt Builder ─────────────────────────────────────
// Assembles the GPT-Image-1.5 prompt from the parsed visual decision.
// Three rendering paths: editorial_cartoon, fine_art_expressive, conceptual_photography.

import type { VisualDecision, Tokens } from '../../pipeline/types.js'

export function buildStage2Prompt(decision: VisualDecision, tokens: Tokens): string {
  const mode = decision.illustration_mode as string
  const subject = decision.subject_description as string
  const fallbackSig = (tokens.colors as Record<string, string>)?.fallback_signature ?? '#CD5C45'
  const signatureHex = (decision.signature_hex as string) ?? fallbackSig

  switch (mode) {
    case 'editorial_cartoon':
      return buildEditorialCartoon(subject, signatureHex)
    case 'fine_art_expressive':
      return buildFineArtExpressive(subject, signatureHex)
    case 'conceptual_photography':
      return buildConceptualPhotography(subject)
    default:
      return buildEditorialCartoon(subject, signatureHex)
  }
}

function buildEditorialCartoon(subject: string, signatureHex: string): string {
  return `Flat vector editorial illustration: ${subject}. Bold saturated colors in a limited palette of 2-3 colors anchored by ${signatureHex}, clean confident outlines with no gradients, flat color fills only. Mid-century editorial illustration aesthetic — Ben Shahn meets Push Pin Studios. Centered scene composition, white or light background. Black outlines throughout. No photographic elements, no gradients, no shadows — pure flat vector aesthetic. No text, no labels, no speech bubbles. Single scene, one clear read.`
}

function buildFineArtExpressive(subject: string, signatureHex: string): string {
  return `Drypoint etching: ${subject}. Heavy texture throughout from drypoint burr and plate marks. Figure partially visible in shadow, hand-rendered mark-making carries the emotional content. Muted palette dominated by tones near ${signatureHex}. Atmospheric and expressive rather than precise, somber mood. Museum-quality fine art print aesthetic. No text, no labels. Raw, intimate, human.`
}

function buildConceptualPhotography(subject: string): string {
  return `Studio chiaroscuro photograph: ${subject}. Single dramatic light source from upper left, isolated against pure black background. Strong specular highlight on edges, cinematic and slightly uncomfortable register. Photorealistic, high material quality surface detail. No text, no labels. Staged, symbolic, restrained.`
}
