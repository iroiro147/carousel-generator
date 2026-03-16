// ─── Dark Museum Style Pack ──────────────────────────────────────────────────
// Self-contained configuration for the Dark Museum visual style.
// Adding a style = adding a directory. This file implements StylePack.

import { readFileSync } from 'fs'
import { join } from 'path'
import { extractTag, extractAllTags, extractBlock } from '../../pipeline/xmlParser.js'
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
    id: 'the_specimen',
    label: 'The Specimen',
    description:
      'Technical authority through the object itself — the most precise thing in the domain',
    headline_seed: '[Object name]. [Single declarative claim.]',
  },
  {
    id: 'the_contrast',
    label: 'The Contrast',
    description:
      'Before/after contrast as the argument — the old object and the new, side by side',
    headline_seed: '[Old state]. [New state].',
  },
  {
    id: 'the_consequence',
    label: 'The Consequence',
    description:
      'Scale and reach — the argument is inevitability, not mechanism',
    headline_seed: '[Scope]. [Scope]. [Scope].',
  },
]

// ─── Slide Router ────────────────────────────────────────────────────────────

const slideRouter: SlideArchetype[] = [
  { key: 'cover_hook', label: 'Cover Hook', has_image: true },
  { key: 'context_setter', label: 'Context Setter', has_image: true },
  { key: 'problem_setup', label: 'Problem Setup', has_image: true },
  { key: 'problem_escalation', label: 'Problem Escalation', has_image: true },
  { key: 'turning_point', label: 'Turning Point', has_image: true },
  { key: 'pivot_question', label: 'Pivot Question', has_image: true },
  { key: 'solution_introduction', label: 'Solution Introduction', has_image: true },
  { key: 'landscape_overview', label: 'Landscape Overview', has_image: true },
  { key: 'technical_foundation', label: 'Technical Foundation', has_image: true },
  { key: 'how_it_works_setup', label: 'How It Works Setup', has_image: true },
  { key: 'how_it_works_flow', label: 'How It Works Flow', has_image: true },
  { key: 'how_it_works_security', label: 'How It Works Security', has_image: true },
  { key: 'company_positioning', label: 'Company Positioning', has_image: true },
  { key: 'cta_close', label: 'CTA Close', has_image: true },
]

// ─── Visual Decision Parser ──────────────────────────────────────────────────

interface DarkMuseumArtifact {
  label: string
  description: string
  eraNuance: string
  materialType: string
  physicalCondition: 'PRISTINE' | 'WORN' | 'RUSTED' | 'BROKEN'
}

const VALID_CONDITIONS = ['PRISTINE', 'WORN', 'RUSTED', 'BROKEN'] as const

function parseVisualDecision(xmlString: string): VisualDecision {
  const xml = extractBlock(xmlString, 'visual_decision')

  const artifactBlocks = extractAllTags(xml, 'artifact')

  const artifacts: DarkMuseumArtifact[] = artifactBlocks.map((block) => {
    const rawCondition = extractTag(block, 'physical_condition').toUpperCase()
    const physicalCondition = VALID_CONDITIONS.includes(
      rawCondition as (typeof VALID_CONDITIONS)[number],
    )
      ? (rawCondition as DarkMuseumArtifact['physicalCondition'])
      : 'WORN' // default fallback per Decision #10

    return {
      label: extractTag(block, 'label'),
      description: extractTag(block, 'description'),
      eraNuance: extractTag(block, 'era_nuance'),
      materialType: extractTag(block, 'material_type'),
      physicalCondition,
    }
  })

  return {
    rawXml: xmlString,
    conceptAnalysis: extractTag(xml, 'concept_analysis'),
    focusMapping: extractTag(xml, 'focus_mapping'),
    strategy: extractTag(xml, 'strategy'),
    artifacts,
    layoutStyle: extractTag(xml, 'layout_style'),
    positionFocus: extractTag(xml, 'position_focus'),
    lightingAccent: extractTag(xml, 'lighting_accent'),
  }
}

// ─── Visual Decision Validator ───────────────────────────────────────────────

function validateVisualDecision(decision: VisualDecision): ValidationResult {
  const errors: string[] = []
  const artifacts = decision.artifacts as DarkMuseumArtifact[] | undefined

  if (!artifacts || artifacts.length === 0) {
    errors.push('No artifacts found in visual decision')
  } else {
    for (const artifact of artifacts) {
      if (!artifact.description) errors.push(`Artifact "${artifact.label}" missing description`)
      if (!artifact.materialType) errors.push(`Artifact "${artifact.label}" missing material_type`)
      if (!artifact.physicalCondition)
        errors.push(`Artifact "${artifact.label}" missing physical_condition`)
    }
  }

  if (!decision.layoutStyle) errors.push('Missing layout_style')
  if (!decision.positionFocus) errors.push('Missing position_focus')
  if (!decision.lightingAccent) errors.push('Missing lighting_accent')

  return { valid: errors.length === 0, errors }
}

// ─── Style Pack Export ───────────────────────────────────────────────────────

const darkMuseum: StylePack = {
  id: 'dark_museum',
  name: 'Dark Museum',
  status: 'active',

  maxSlides: 14,
  imagesPerCarousel: 'per-slide',
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

export default darkMuseum
