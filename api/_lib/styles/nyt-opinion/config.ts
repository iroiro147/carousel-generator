// ─── NYT Opinion Style Pack ─────────────────────────────────────────────────
// Short-form editorial carousel (3-4 slides). Cover-only image generation.
// Stage 1 decides illustration mode + color + metaphor subject.

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

const tokens = loadTokens()
const FALLBACK_SIGNATURE = (tokens.colors as Record<string, string>)?.fallback_signature ?? '#CD5C45'

// ─── Angles ──────────────────────────────────────────────────────────────────

const angles: AngleDefinition[] = [
  {
    id: 'the_metaphor',
    label: 'The Metaphor',
    description:
      'Lateral visual metaphor that surprises — the headline completes the read. Editorial cartoon mode.',
    headline_seed: 'The [Unexpected Adj] of [Known Thing].',
  },
  {
    id: 'the_figure',
    label: 'The Figure',
    description:
      'Human face of the argument — emotional authority through lived experience. Fine art expressive mode.',
    headline_seed: 'What We Don\'t Understand About [X].',
  },
  {
    id: 'the_scene',
    label: 'The Scene',
    description:
      'Uncomfortable image that earns credibility through difficulty. Conceptual photography mode.',
    headline_seed: '[Question]? [Unexpected Answer].',
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

const VALID_MODES = ['editorial_cartoon', 'fine_art_expressive', 'conceptual_photography'] as const

function parseVisualDecision(xmlString: string): VisualDecision {
  const xml = extractBlock(xmlString, 'visual_decision')

  const illustrationMode = extractTag(xml, 'illustration_mode').trim().toLowerCase()
  const subjectDescription = extractTag(xml, 'subject_description')
  const conceptAnalysis = extractTag(xml, 'concept_analysis')
  const metaphorRationale = extractTag(xml, 'metaphor_rationale')

  // Color approach
  const colorBlock = extractBlock(xml, 'color_approach')
  const signatureHex = extractTag(colorBlock, 'signature_hex').trim()
  const colorRationale = extractTag(colorBlock, 'color_rationale')

  // Composition
  const compositionBlock = extractBlock(xml, 'composition')
  const coverFormat = extractTag(compositionBlock, 'cover_format').trim() || 'two_part_split'
  const illustrationZone = extractTag(compositionBlock, 'illustration_zone').trim() || 'top_65'
  const textZone = extractTag(compositionBlock, 'text_zone').trim() || 'bottom_35'

  return {
    rawXml: xmlString,
    illustration_mode: VALID_MODES.includes(illustrationMode as typeof VALID_MODES[number])
      ? illustrationMode
      : 'editorial_cartoon',
    subject_description: subjectDescription,
    concept_analysis: conceptAnalysis,
    metaphor_rationale: metaphorRationale,
    signature_hex: isValidHex(signatureHex) ? signatureHex : FALLBACK_SIGNATURE,
    color_rationale: colorRationale,
    cover_format: coverFormat,
    illustration_zone: illustrationZone,
    text_zone: textZone,
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

  return { valid: errors.length === 0, errors }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex)
}

// ─── Style Pack Export ──────────────────────────────────────────────────────

const nytOpinion: StylePack = {
  id: 'nyt_opinion',
  name: 'NYT Opinion',
  status: 'active',

  maxSlides: 4,
  imagesPerCarousel: 'cover-only',
  stage1Model: 'gemini-2.5-flash',
  stage2ModelPrimary: 'gpt-image-1.5',
  stage2ModelFallback: 'nano-banana-2',

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

  tokens,
}

export default nytOpinion
