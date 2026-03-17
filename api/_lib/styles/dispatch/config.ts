// ─── Dispatch Style Pack ──────────────────────────────────────────────────────
// Brand cover cards inspired by Quartr's earnings card aesthetic.
// 4 creative pathways: name-archaeology, experience-capture,
// symbol-literalization, product-elevation.
// Phase 2A: cover-only. Content slides deferred to Phase 2B.

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
} from '../../pipeline/types.js'

// ─── Load static assets ──────────────────────────────────────────────────────

const styleDir = join(__dirname, '.')

function loadStage1Prompt(): string {
  return readFileSync(join(styleDir, 'stage1-system.md'), 'utf-8')
}

function loadTokens(): Tokens {
  return JSON.parse(readFileSync(join(styleDir, 'tokens.json'), 'utf-8'))
}

// ─── Angles (4 — one per creative pathway) ───────────────────────────────────

const angles: AngleDefinition[] = [
  {
    id: 'name_archaeology',
    label: 'Name Archaeology',
    description:
      'Historical illustration pathway — renders the myth, legend, or cultural archetype behind the brand name using era-appropriate engraving style.',
    headline_seed: 'The [myth/legend] of [brand].',
  },
  {
    id: 'experience_capture',
    label: 'Experience Capture',
    description:
      'First-person photography pathway — captures the single universally recognized human moment inside the brand\'s core product interaction.',
    headline_seed: '"[overheard dialogue]"',
  },
  {
    id: 'symbol_literalization',
    label: 'Symbol Literalization',
    description:
      'Logo-as-living-creature pathway — renders the brand logo\'s real-world subject (animal, object) as a living entity in the exact pose of the logo.',
    headline_seed: '[Brand] [announcement type].',
  },
  {
    id: 'product_elevation',
    label: 'Product Elevation',
    description:
      'Studio product photography pathway — renders the brand\'s iconic product in elevated studio conditions, lit like fine art.',
    headline_seed: '[Brand] [announcement type].',
  },
]

// ─── Slide Router (Phase 2A: cover-only) ─────────────────────────────────────

const slideRouter: SlideArchetype[] = [
  { key: 'cover', label: 'Cover', has_image: true },
]

// ─── Valid Pathways ──────────────────────────────────────────────────────────

const VALID_PATHWAYS = [
  'name-archaeology',
  'experience-capture',
  'symbol-literalization',
  'product-elevation',
] as const

// ─── Visual Decision Parser ─────────────────────────────────────────────────

function parseVisualDecision(xmlString: string): VisualDecision {
  const xml = extractBlock(xmlString, 'visual_decision')

  const pathway = extractTag(xml, 'pathway').trim().toLowerCase()
  const pathwayRationale = extractTag(xml, 'pathway_rationale').trim()
  const subject = extractTag(xml, 'subject').trim()
  const sceneDescription = extractTag(xml, 'scene_description').trim()
  const colorDirection = extractTag(xml, 'color_direction').trim()
  const eraStyle = extractTag(xml, 'era_style').trim()
  const composition = extractTag(xml, 'composition').trim()
  const witLayer = extractTag(xml, 'wit_layer').trim()
  const quote = extractTag(xml, 'quote').trim()
  const negativePrompt = extractTag(xml, 'negative_prompt').trim()

  return {
    rawXml: xmlString,
    pathway: VALID_PATHWAYS.includes(pathway as typeof VALID_PATHWAYS[number])
      ? pathway
      : 'product-elevation',
    pathway_rationale: pathwayRationale,
    subject,
    scene_description: sceneDescription,
    color_direction: colorDirection,
    era_style: eraStyle,
    composition,
    wit_layer: witLayer,
    quote,
    negative_prompt: negativePrompt,
  }
}

// ─── Visual Decision Validator ──────────────────────────────────────────────

function validateVisualDecision(decision: VisualDecision): ValidationResult {
  const errors: string[] = []

  // Pathway must be valid
  const pathway = decision.pathway as string
  if (!VALID_PATHWAYS.includes(pathway as typeof VALID_PATHWAYS[number])) {
    errors.push(`Invalid pathway: "${pathway}". Must be one of: ${VALID_PATHWAYS.join(', ')}`)
  }

  // Subject must be present and descriptive
  const subject = decision.subject as string
  if (!subject || subject.length < 5) {
    errors.push('subject is missing or too short (min 5 chars)')
  }

  // Scene description must be detailed
  const scene = decision.scene_description as string
  if (!scene || scene.split(/\s+/).length < 15) {
    errors.push('scene_description is missing or too short (min 15 words)')
  }

  // Color direction must be present
  const colorDir = decision.color_direction as string
  if (!colorDir || colorDir.length < 3) {
    errors.push('color_direction is missing')
  }

  // Era style must be present
  const eraStyle = decision.era_style as string
  if (!eraStyle || eraStyle.length < 5) {
    errors.push('era_style is missing or too short')
  }

  // Pathway-specific validations
  if (pathway === 'name-archaeology') {
    const wit = decision.wit_layer as string
    if (!wit || wit === 'none' || wit.length < 5) {
      errors.push('name-archaeology pathway requires a non-trivial wit_layer')
    }
  }

  if (pathway === 'experience-capture') {
    const q = decision.quote as string
    if (!q || q === 'none' || q.length < 5) {
      errors.push('experience-capture pathway requires a quote (overheard dialogue)')
    }
  }

  return { valid: errors.length === 0, errors }
}

// ─── Style Pack Export ──────────────────────────────────────────────────────

const dispatch: StylePack = {
  id: 'dispatch',
  name: 'Dispatch',
  status: 'active',

  maxSlides: 10,
  imagesPerCarousel: 'cover-only',
  stage1Model: 'gemini-2.5-flash',
  stage2ModelPrimary: 'gpt-image-1.5',
  stage2ModelFallback: 'nano-banana-2',

  slideWidth: 1080,
  slideHeight: 1350,
  aspectRatio: '4:5',
  imageAspectRatio: '4:5',

  angles,
  slideRouter,

  stage1SystemPrompt: loadStage1Prompt(),
  parseVisualDecision,
  validateVisualDecision,
  buildStage2Prompt,

  tokens: loadTokens(),
}

export default dispatch
