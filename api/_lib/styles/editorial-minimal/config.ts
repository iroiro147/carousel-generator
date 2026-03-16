// ─── Editorial Minimal Style Pack ────────────────────────────────────────────
// "Visual catalogue of the same idea" — 7 slide types (A–G), each a different
// aesthetic register for the same content. Typography as costume, photo as soul.
// Stage 1 extracts content, classifies register, recommends 5–7 type sequence.
// Photo generation is conditional (only if sequence includes D/E/F/G).

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

// ─── Angles ──────────────────────────────────────────────────────────────────

const angles: AngleDefinition[] = [
  {
    id: 'the_lookbook',
    label: 'The Lookbook',
    description:
      'Visual catalogue — every slide is the same content in a different aesthetic costume. The argument is repetition itself.',
    headline_seed: '[Title]. [Subtitle].',
  },
  {
    id: 'the_cover_story',
    label: 'The Cover Story',
    description:
      'Lead with the bold photo overlay, then unfold through quieter type-only slides. Impact first, then depth.',
    headline_seed: '[Title]. [Subtitle].',
  },
  {
    id: 'the_quiet_build',
    label: 'The Quiet Build',
    description:
      'Start with the lightest touch (minimal white), build through progressively richer slides. Restraint that earns attention.',
    headline_seed: '[Title]. [Subtitle].',
  },
]

// ─── Slide Router ────────────────────────────────────────────────────────────
// Dynamic — the actual sequence is determined by Stage 1's recommended_sequence.
// This router defines the maximum possible set.

const slideRouter: SlideArchetype[] = [
  { key: 'type_a', label: 'Minimal White', has_image: false },
  { key: 'type_b', label: 'Dark Mode', has_image: false },
  { key: 'type_c', label: 'Flat Blue', has_image: false },
  { key: 'type_d', label: 'Card Frame', has_image: true },
  { key: 'type_e', label: 'Split Editorial', has_image: true },
  { key: 'type_f', label: 'Full-Bleed Bold', has_image: true },
  { key: 'type_g', label: 'Photo Overlay', has_image: true },
]

// ─── Valid enums ─────────────────────────────────────────────────────────────

const VALID_REGISTERS = ['contemplative', 'analytical', 'travel', 'urgent'] as const
const VALID_TYPES = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G'])

// ─── Visual Decision Parser ─────────────────────────────────────────────────

function parseVisualDecision(xmlString: string): VisualDecision {
  const xml = extractBlock(xmlString, 'visual_decision')

  // Content extraction
  const contentBlock = extractBlock(xml, 'content')
  const title = extractTag(contentBlock, 'title').trim()
  const subtitle = extractTag(contentBlock, 'subtitle').trim()
  const byline = extractTag(contentBlock, 'byline').trim()
  const publicationUrl = extractTag(contentBlock, 'publication_url').trim()

  const emotionalRegister = extractTag(xml, 'emotional_register').trim().toLowerCase()
  const sequenceRaw = extractTag(xml, 'recommended_sequence').trim()
  const photoNeededRaw = extractTag(xml, 'photo_needed').trim().toLowerCase()
  const photoSubject = extractTag(xml, 'photo_subject').trim()
  const accentColorSlide = extractTag(xml, 'accent_color_slide').trim()

  // Parse sequence into array of uppercase letters
  const sequence = sequenceRaw
    .split(/[,\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => VALID_TYPES.has(s))

  // Determine photo_needed from sequence if not explicitly stated
  const photoTypes = new Set(['D', 'E', 'F', 'G'])
  const sequenceNeedsPhoto = sequence.some((t) => photoTypes.has(t))
  const photoNeeded = photoNeededRaw === 'true' || sequenceNeedsPhoto

  return {
    rawXml: xmlString,
    title,
    subtitle,
    byline,
    publication_url: publicationUrl,
    emotional_register: VALID_REGISTERS.includes(emotionalRegister as typeof VALID_REGISTERS[number])
      ? emotionalRegister
      : 'contemplative',
    recommended_sequence: sequence,
    photo_needed: photoNeeded,
    photo_subject: photoSubject,
    accent_color_slide: accentColorSlide === 'F' ? 'F' : 'none',
  }
}

// ─── Visual Decision Validator ──────────────────────────────────────────────

function validateVisualDecision(decision: VisualDecision): ValidationResult {
  const errors: string[] = []

  // Check required content fields
  if (!(decision.title as string)?.length) {
    errors.push('title is missing')
  }
  if (!(decision.subtitle as string)?.length) {
    errors.push('subtitle is missing')
  }
  if (!(decision.byline as string)?.length) {
    errors.push('byline is missing')
  }

  // Check sequence
  const sequence = decision.recommended_sequence as string[]
  if (!sequence || sequence.length < 5 || sequence.length > 7) {
    errors.push(`recommended_sequence must contain 5–7 types, got: ${sequence?.length ?? 0}`)
  } else {
    // Check uniqueness
    const seen = new Set<string>()
    for (const t of sequence) {
      if (!VALID_TYPES.has(t)) {
        errors.push(`Invalid slide type in sequence: "${t}"`)
      }
      if (seen.has(t)) {
        errors.push(`Duplicate slide type in sequence: "${t}"`)
      }
      seen.add(t)
    }
  }

  // Check accent color rule
  const accent = decision.accent_color_slide as string
  if (accent !== 'F' && accent !== 'none') {
    errors.push(`accent_color_slide must be "F" or "none", got: "${accent}"`)
  }

  // Check photo subject if photo needed
  const photoNeeded = decision.photo_needed as boolean
  const photoSubject = decision.photo_subject as string
  if (photoNeeded && (!photoSubject || photoSubject.length < 5)) {
    errors.push('photo_subject required when photo_needed = true')
  }

  return { valid: errors.length === 0, errors }
}

// ─── Style Pack Export ──────────────────────────────────────────────────────

const editorialMinimal: StylePack = {
  id: 'editorial_minimal',
  name: 'Editorial Minimal',
  status: 'active',

  maxSlides: 7,
  imagesPerCarousel: 'conditional',
  stage1Model: 'gemini-2.5-flash',
  stage2ModelPrimary: 'gpt-image-1.5',
  stage2ModelFallback: 'nano-banana-2',

  slideWidth: 1080,
  slideHeight: 1350,
  aspectRatio: '4:5',
  imageAspectRatio: '2176:2716',

  angles,
  slideRouter,

  stage1SystemPrompt: loadStage1Prompt(),
  parseVisualDecision,
  validateVisualDecision,
  buildStage2Prompt,

  tokens: loadTokens(),
}

export default editorialMinimal
