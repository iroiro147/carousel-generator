// ─── NYT Opinion Style Pack ─────────────────────────────────────────────────
// Short-form editorial carousel (3-4 slides). Cover-only image generation.
// Stage 1 decides illustration mode + color + metaphor subject.
// 4 modes: ink_gouache, conceptual_photography, object_photography, cinematic_render
// Model routing: Nano Banana 2 primary, GPT-Image-1.5 fallback.

import { readFileSync } from 'fs'
import { join } from 'path'
import { extractTag, extractBlock } from '../../pipeline/xmlParser.js'
import { buildStage2Prompt } from './stage2-template.js'
import type {
  StylePack,
  VisualDecision,
  ValidationResult,
  AngleDefinition,
  SlideArchetype,
  Tokens,
  BodySlideParams,
} from '../../pipeline/types.js'

// ─── Load static assets ──────────────────────────────────────────────────────

const styleDir = join(__dirname, '.')

function loadStage1Prompt(): string {
  return readFileSync(join(styleDir, 'stage1-system.md'), 'utf-8')
}

function loadTokens(): Tokens {
  return JSON.parse(readFileSync(join(styleDir, 'tokens.json'), 'utf-8'))
}

const tokens = loadTokens()
const FALLBACK_SIGNATURE = (tokens.colors as Record<string, string>)?.fallback_signature ?? '#CD5C45'

// ─── Angles ──────────────────────────────────────────────────────────────────

const angles: AngleDefinition[] = [
  {
    id: 'the_metaphor',
    label: 'The Metaphor',
    description:
      'Lateral visual metaphor — ink and gouache, partial crop, paper grain. The illustration IS the argument.',
    headline_seed: 'The [Unexpected Adj] of [Known Thing].',
  },
  {
    id: 'the_object',
    label: 'The Object',
    description:
      'Single symbolic object on white — crumpled, deflated, discarded. The imperfection IS the concept.',
    headline_seed: 'What [X] Tells Us About [Y].',
  },
  {
    id: 'the_scene',
    label: 'The Scene',
    description:
      'Studio chiaroscuro — isolated object against deep color. Beautiful and uncomfortable.',
    headline_seed: '[Question]? [Unexpected Answer].',
  },
  {
    id: 'the_render',
    label: 'The Render',
    description:
      'Cinematic 3D figure in profile — screen glow, blurred crowd. The loneliness of digital life.',
    headline_seed: 'The [Adj] [Noun] of [Experience].',
  },
]

// ─── Slide Router ────────────────────────────────────────────────────────────

const slideRouter: SlideArchetype[] = [
  { key: 'cover_hook', label: 'Cover Hook', has_image: true },
  { key: 'thesis', label: 'Thesis', has_image: false },
  { key: 'evidence', label: 'Evidence', has_image: false },
  { key: 'landing', label: 'Landing', has_image: false },
]

// ─── Visual Decision Parser ─────────────────────────────────────────────────

const VALID_MODES = ['ink_gouache', 'conceptual_photography', 'object_photography', 'cinematic_render'] as const

// Legacy mode names from previous Stage 1 prompt → map to ink_gouache
const LEGACY_MODE_MAP: Record<string, string> = {
  editorial_cartoon: 'ink_gouache',
  fine_art_expressive: 'ink_gouache',
}

function parseVisualDecision(xmlString: string): VisualDecision {
  const xml = extractBlock(xmlString, 'visual_decision')

  const rawMode = extractTag(xml, 'illustration_mode').trim().toLowerCase()
  const illustrationMode = LEGACY_MODE_MAP[rawMode] ?? rawMode
  const subjectDescription = extractTag(xml, 'subject_description')
  const conceptAnalysis = extractTag(xml, 'concept_analysis')
  const modeRationale = extractTag(xml, 'mode_rationale')
  const metaphorRationale = extractTag(xml, 'metaphor_rationale')

  // Color approach
  const colorBlock = extractBlock(xml, 'color_approach')
  const signatureHex = extractTag(colorBlock, 'signature_hex').trim()
  const colorRationale = extractTag(colorBlock, 'color_rationale')

  // Cover format + headline band
  const coverFormat = extractTag(xml, 'cover_format').trim() || 'two_part_split'
  const rawHeadlineBand = extractTag(xml, 'headline_band_hex').trim()
  const headlineBandHex = rawHeadlineBand === 'none' || rawHeadlineBand === ''
    ? null
    : isValidHex(rawHeadlineBand) ? rawHeadlineBand : null

  // Composition
  const compositionBlock = extractBlock(xml, 'composition')
  const illustrationZone = extractTag(compositionBlock, 'illustration_zone').trim() || 'top_65'
  const textZone = extractTag(compositionBlock, 'text_zone').trim() || 'bottom_35'
  const cropInstruction = extractTag(compositionBlock, 'crop_instruction').trim() || 'none'

  return {
    rawXml: xmlString,
    illustration_mode: VALID_MODES.includes(illustrationMode as typeof VALID_MODES[number])
      ? illustrationMode
      : 'ink_gouache',
    subject_description: subjectDescription,
    concept_analysis: conceptAnalysis,
    mode_rationale: modeRationale,
    metaphor_rationale: metaphorRationale,
    signature_hex: isValidHex(signatureHex) ? signatureHex : FALLBACK_SIGNATURE,
    color_rationale: colorRationale,
    cover_format: coverFormat,
    headline_band_hex: headlineBandHex,
    illustration_zone: illustrationZone,
    text_zone: textZone,
    crop_instruction: cropInstruction,
  }
}

// ─── Visual Decision Validator ──────────────────────────────────────────────

function validateVisualDecision(decision: VisualDecision): ValidationResult {
  const errors: string[] = []

  const mode = decision.illustration_mode as string
  if (!VALID_MODES.includes(mode as typeof VALID_MODES[number])) {
    errors.push(`Invalid illustration_mode: "${mode}". Must be one of: ${VALID_MODES.join(', ')}`)
  }

  const subject = decision.subject_description as string
  if (!subject || subject.length < 10) {
    errors.push('subject_description is missing or too short (min 10 chars)')
  }

  const hex = decision.signature_hex as string
  if (!isValidHex(hex)) {
    errors.push(`Invalid signature_hex: "${hex}". Must be a valid hex color.`)
  }

  // Validate headline_band_hex for two_part_split modes
  const coverFormat = decision.cover_format as string
  if (coverFormat === 'two_part_split') {
    const bandHex = decision.headline_band_hex as string | null
    if (!bandHex || !isValidHex(bandHex)) {
      errors.push(`two_part_split cover format requires a valid headline_band_hex, got: "${bandHex}"`)
    }
  }

  return { valid: errors.length === 0, errors }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex)
}

// ─── Body Slide Prompt Builder ───────────────────────────────────────────────
// NYT is cover-only, but provide a body prompt builder for safety.
// Migrated from legacy api/_lib/images/promptBuilder.ts buildNYTOpinionPrompt().

function buildBodySlidePrompt(params: BodySlideParams): string {
  const mode = params.illustration_mode ?? 'ink_gouache'
  const dominantHue = params.dominant_hue ?? 'warm red-orange'

  switch (mode) {
    case 'ink_gouache':
    case 'editorial_cartoon': // legacy
      return `Flat vector editorial illustration of ${params.object_name} as a commentary — bold saturated colors in a limited palette of 2-3 colors, clean confident outlines with no gradients, flat color fills only, mid-century editorial illustration aesthetic — Ben Shahn meets Push Pin Studios, centered scene composition, white or light background, ${dominantHue} as the primary color occupying 60-70% of the image area, black outlines throughout, no photographic elements, no gradients, no shadows — pure flat vector aesthetic`

    case 'fine_art_expressive': { // legacy
      const emotion = params.emotional_register ?? 'haunted'
      return `Drypoint etching of a figure contemplating ${params.object_name} — ${emotion} emotional register, heavy texture throughout from drypoint burr, figure partially visible in shadow, muted palette dominated by ${dominantHue}, atmospheric and expressive rather than precise, somber mood, the mark-making is the emotional content, museum-quality fine art print aesthetic`
    }

    case 'conceptual_photography':
      return `Studio chiaroscuro photograph of ${params.object_name} as symbolic object — single dramatic light source from upper left, isolated against pure black background, strong specular highlight on edges, cinematic and slightly uncomfortable register, photorealistic, high material quality surface detail`

    case 'object_photography':
      return `Studio product photograph of ${params.object_name} — pure white background, soft even lighting, object in slightly imperfect state, dominant color ${dominantHue}, clinical editorial register, no environmental context`

    case 'cinematic_render':
      return `Cinematic 3D render featuring ${params.object_name} — Pixar-adjacent photorealistic rendering, volumetric lighting, shallow depth of field, melancholy register, practical light in ${dominantHue}, abstract dark background`

    default:
      return `Flat vector editorial illustration of ${params.object_name}, bold colors, clean outlines, editorial aesthetic, white background`
  }
}

// ─── Style Pack Export ──────────────────────────────────────────────────────

const nytOpinion: StylePack = {
  id: 'nyt_opinion',
  name: 'NYT Opinion',
  status: 'active',

  maxSlides: 4,
  imagesPerCarousel: 'cover-only',
  stage1Model: 'gemini-2.5-flash',
  stage2ModelPrimary: 'nano-banana-2',
  stage2ModelFallback: 'gpt-image-1.5',

  slideWidth: 1080,
  slideHeight: 1350,
  aspectRatio: '4:5',
  imageAspectRatio: '1080:1350',

  angles,
  slideRouter,

  stage1SystemPrompt: loadStage1Prompt(),
  parseVisualDecision,
  validateVisualDecision,
  buildStage2Prompt,
  buildBodySlidePrompt,

  tokens,
}

export default nytOpinion
