// ─── Radial Departure Style Pack ─────────────────────────────────────────────
// Motion editorial: zoom-burst photography from first-person POV.
// One image per carousel. Content slides use CSS crops of the cover image.
// Stage 1 uses a 5-step decision tree: Domain → Subject → Temperature → Palette → Camera.

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
  CropSpec,
  Tokens,
} from '../../pipeline/types.js'

// ─── Load static assets ──────────────────────────────────────────────────────

const styleDir = join(__dirname, '.')

function loadStage1Prompt(): string {
  return readFileSync(join(styleDir, 'stage1-system.md'), 'utf-8')
}

function loadTokens(): Tokens {
  return JSON.parse(readFileSync(join(styleDir, 'tokens.json'), 'utf-8'))
}

// ─── Angles ──────────────────────────────────────────────────────────────────

const angles: AngleDefinition[] = [
  {
    id: 'the_velocity',
    label: 'The Velocity',
    description:
      'Forward momentum as the argument — the viewer is inside the acceleration, feeling the speed of change.',
    headline_seed: 'Before [state]. After, [better state].',
  },
  {
    id: 'the_corridor',
    label: 'The Corridor',
    description:
      'Depth and infrastructure as the argument — the viewer moves through the system itself, seeing its scale.',
    headline_seed: '[Number/precision]. [Absence]. [Absence].',
  },
  {
    id: 'the_horizon',
    label: 'The Horizon',
    description:
      'Emergence and possibility as the argument — the vanishing point is where the future begins.',
    headline_seed: 'In [context]. On [context].',
  },
]

// ─── Slide Router ────────────────────────────────────────────────────────────

const slideRouter: SlideArchetype[] = [
  { key: 'cover', label: 'Cover', has_image: true },
  { key: 'content_claim', label: 'Content Claim', has_image: true },
  { key: 'content_data', label: 'Content Data', has_image: false },
  { key: 'content_narrative', label: 'Content Narrative', has_image: false },
  { key: 'content_quote', label: 'Content Quote', has_image: true },
  { key: 'content_claim_2', label: 'Content Claim', has_image: true },
  { key: 'end_cta', label: 'End CTA', has_image: true },
]

// ─── Crop Specs ──────────────────────────────────────────────────────────────

const cropSpecs: Record<string, CropSpec> = {
  cover: { type: 'full_bleed' },
  content_claim: { type: 'right_strip', widthFraction: 0.28 },
  content_quote: { type: 'corner_accent', widthFraction: 0.22 },
  content_data: { type: 'none' },
  content_narrative: { type: 'none' },
  end_cta: { type: 'vignette' },
}

// ─── Valid enums ─────────────────────────────────────────────────────────────

const VALID_DOMAINS = [
  'fintech', 'technology', 'growth', 'knowledge', 'speed',
  'departure', 'nature', 'team', 'finance',
] as const

const VALID_TEMPERATURES = [
  'urgent', 'contemplative', 'energetic', 'calm', 'authoritative', 'intimate',
] as const

const VALID_CAMERA_POSITIONS = [
  'driver_pov', 'walker_pov', 'aerial', 'street_level', 'interior',
] as const

const VALID_RAY_DENSITIES = ['extreme', 'moderate', 'subtle'] as const

// ─── Visual Decision Parser ─────────────────────────────────────────────────

function parseVisualDecision(xmlString: string): VisualDecision {
  const xml = extractBlock(xmlString, 'visual_decision')

  const conceptAnalysis = extractTag(xml, 'concept_analysis')
  const domain = extractTag(xml, 'domain').trim().toLowerCase()
  const vanishingPointSubject = extractTag(xml, 'vanishing_point_subject').trim()
  const emotionalTemperature = extractTag(xml, 'emotional_temperature').trim().toLowerCase()

  const cameraPosition = extractTag(xml, 'camera_position').trim().toLowerCase()
  const timeOfDay = extractTag(xml, 'time_of_day').trim().toLowerCase()
  const povDescription = extractTag(xml, 'pov_description').trim()

  // Parse palette
  const paletteBlock = extractBlock(xml, 'palette')
  const primaryDark = extractTag(paletteBlock, 'primary_dark').trim()
  const midtone = extractTag(paletteBlock, 'midtone').trim()
  const burstHighlight = extractTag(paletteBlock, 'burst_highlight').trim()
  const textAccent = extractTag(paletteBlock, 'text_accent').trim()
  const flatColorBg = extractTag(paletteBlock, 'flat_color_bg').trim()

  const rayDensity = extractTag(xml, 'ray_density').trim().toLowerCase()
  const overlayOpacityRaw = extractTag(xml, 'overlay_opacity').trim()
  const overlayOpacity = Math.min(0.4, Math.max(0.0, parseFloat(overlayOpacityRaw) || 0.25))
  const centerGlowIntensity = extractTag(xml, 'center_glow_intensity').trim().toLowerCase()

  return {
    rawXml: xmlString,
    concept_analysis: conceptAnalysis,
    domain: VALID_DOMAINS.includes(domain as typeof VALID_DOMAINS[number])
      ? domain
      : 'technology',
    vanishing_point_subject: vanishingPointSubject,
    emotional_temperature: VALID_TEMPERATURES.includes(emotionalTemperature as typeof VALID_TEMPERATURES[number])
      ? emotionalTemperature
      : 'authoritative',
    camera_position: VALID_CAMERA_POSITIONS.includes(cameraPosition as typeof VALID_CAMERA_POSITIONS[number])
      ? cameraPosition
      : 'walker_pov',
    time_of_day: timeOfDay,
    pov_description: povDescription,
    palette: {
      primary_dark: primaryDark,
      midtone: midtone,
      burst_highlight: burstHighlight,
      text_accent: textAccent,
      flat_color_bg: flatColorBg,
    },
    ray_density: VALID_RAY_DENSITIES.includes(rayDensity as typeof VALID_RAY_DENSITIES[number])
      ? rayDensity
      : 'moderate',
    overlay_opacity: overlayOpacity,
    center_glow_intensity: centerGlowIntensity,
  }
}

// ─── Visual Decision Validator ──────────────────────────────────────────────

const HEX_RE = /^#[0-9a-fA-F]{6}$/

function validateVisualDecision(decision: VisualDecision): ValidationResult {
  const errors: string[] = []

  // Check vanishing point subject
  const subject = decision.vanishing_point_subject as string
  if (!subject || subject.length < 5) {
    errors.push('vanishing_point_subject is missing or too short (min 5 chars)')
  }

  // Check palette — all 5 hex values must be present and valid
  const palette = decision.palette as Record<string, string> | undefined
  if (!palette) {
    errors.push('palette block is missing')
  } else {
    const requiredColors = ['primary_dark', 'midtone', 'burst_highlight', 'text_accent', 'flat_color_bg']
    for (const key of requiredColors) {
      const val = palette[key]
      if (!val || !HEX_RE.test(val)) {
        errors.push(`palette.${key} is missing or not a valid hex color: "${val ?? 'undefined'}"`)
      }
    }

    // burst_highlight must NOT be pure white
    if (palette.burst_highlight?.toLowerCase() === '#ffffff') {
      errors.push('burst_highlight must not be #FFFFFF')
    }
  }

  // Check overlay_opacity range
  const opacity = decision.overlay_opacity as number
  if (typeof opacity !== 'number' || opacity < 0.0 || opacity > 0.4) {
    errors.push(`overlay_opacity must be 0.0–0.4, got: ${opacity}`)
  }

  // Check POV description
  const pov = decision.pov_description as string
  if (!pov || pov.length < 10) {
    errors.push('pov_description is missing or too short (min 10 chars)')
  }

  return { valid: errors.length === 0, errors }
}

// ─── Style Pack Export ──────────────────────────────────────────────────────

const radialDeparture: StylePack = {
  id: 'radial_departure',
  name: 'Radial Departure',
  status: 'active',

  maxSlides: 7,
  imagesPerCarousel: 'cover-only',
  stage1Model: 'gemini-2.5-flash',
  stage2ModelPrimary: 'gpt-image-1.5',
  stage2ModelFallback: 'nano-banana-2',

  slideWidth: 1080,
  slideHeight: 1350,
  aspectRatio: '4:5',
  imageAspectRatio: '2176:2716',

  angles,
  slideRouter,
  cropSpecs,

  stage1SystemPrompt: loadStage1Prompt(),
  parseVisualDecision,
  validateVisualDecision,
  buildStage2Prompt,

  tokens: loadTokens(),
}

export default radialDeparture
