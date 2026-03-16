// ─── SIC Enlightenment Toile Style Pack ─────────────────────────────────────
// Long-form 14-slide carousel. Copper-plate engraving in indigo on cream.
// Stage 1 uses a 6-step allegorical decision tree with 5 validation tests.

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
    id: 'the_commerce_hall',
    label: 'The Commerce Hall',
    description:
      'Activity as proof of scale — busiest scene, most populated environment. Merchant tradition register.',
    headline_seed: '[Activity]. [Historical claim.]',
  },
  {
    id: 'the_institution',
    label: 'The Institution',
    description:
      'The founding moment as proof of permanence — charter, table, document signed. Institutional charter register.',
    headline_seed: 'Built to [purpose]. As [comparator] were.',
  },
  {
    id: 'the_navigation',
    label: 'The Navigation',
    description:
      'The discovery register — company as navigator charting new corridors. Open horizon visible.',
    headline_seed: 'The [routes/territory] are being [drawn/mapped] now.',
  },
]

// ─── Slide Router ────────────────────────────────────────────────────────────

const slideRouter: SlideArchetype[] = [
  { key: 'cover_hook', label: 'Cover Hook', has_image: true },
  { key: 'context_setter', label: 'Context Setter', has_image: true },
  { key: 'problem_setup', label: 'Problem Setup', has_image: true },
  { key: 'problem_escalation', label: 'Problem Escalation', has_image: true },
  { key: 'turning_point', label: 'Turning Point', has_image: true },
  { key: 'pivot_question', label: 'Pivot Question', has_image: false },
  { key: 'solution_introduction', label: 'Solution Introduction', has_image: true },
  { key: 'landscape_overview', label: 'Landscape Overview', has_image: true },
  { key: 'technical_foundation', label: 'Technical Foundation', has_image: true },
  { key: 'how_it_works_setup', label: 'How It Works Setup', has_image: true },
  { key: 'how_it_works_flow', label: 'How It Works Flow', has_image: true },
  { key: 'how_it_works_security', label: 'How It Works Security', has_image: true },
  { key: 'company_positioning', label: 'Company Positioning', has_image: true },
  { key: 'cta_close', label: 'CTA Close', has_image: false },
]

// ─── Valid enums ─────────────────────────────────────────────────────────────

const VALID_DOMAINS = [
  'commerce_exchange', 'governance_institution', 'cartography_navigation',
  'natural_philosophy', 'architecture_infrastructure', 'knowledge_scholarship',
  'capital_treasury',
] as const

const VALID_STATES = [
  'in ruins', 'overgrown', 'collapsed', 'in disorder', 'newly surveyed',
  'newly opened', 'in discovery', 'in procession', 'flourishing',
  'in full operation', 'in succession', 'under construction',
  'in correspondence', 'sealed and witnessed', 'demonstrated',
  'under examination', 'in full detail',
] as const

// ─── Visual Decision Parser ─────────────────────────────────────────────────

function parseVisualDecision(xmlString: string): VisualDecision {
  const xml = extractBlock(xmlString, 'visual_decision')

  const conceptAnalysis = extractTag(xml, 'concept_analysis')

  // Allegorical translation
  const translationBlock = extractBlock(xml, 'allegorical_translation')
  const sceneDomain = extractTag(translationBlock, 'scene_domain').trim().toLowerCase()
  const physicalState = extractTag(translationBlock, 'physical_state').trim().toLowerCase()
  const figureCountRaw = extractTag(translationBlock, 'figure_count').trim()
  const figureCount = parseInt(figureCountRaw, 10) || 7
  const architecturalSetting = extractTag(translationBlock, 'architectural_setting')

  const fullSceneDescription = extractTag(xml, 'full_scene_description')
  const densityRaw = extractTag(xml, 'density').trim()
  const density = Math.min(5, Math.max(0, parseInt(densityRaw, 10) || 3))

  // Render spec
  const renderBlock = extractBlock(xml, 'render_spec')
  const hatchingZones = extractTag(renderBlock, 'hatching_zones')
  const stipplingZones = extractTag(renderBlock, 'stippling_zones')
  const contourEmphasis = extractTag(renderBlock, 'contour_emphasis')

  // Validation results from Stage 1
  const validationBlock = extractBlock(xml, 'validation')
  const singleMedium = extractTag(validationBlock, 'single_medium').trim().toUpperCase()
  const periodTest = extractTag(validationBlock, 'period_test').trim().toUpperCase()
  const legibilityTest = extractTag(validationBlock, 'legibility_test').trim().toUpperCase()
  const narrativeTest = extractTag(validationBlock, 'narrative_test').trim().toUpperCase()
  const figureTest = extractTag(validationBlock, 'figure_test').trim().toUpperCase()

  return {
    rawXml: xmlString,
    concept_analysis: conceptAnalysis,
    scene_domain: VALID_DOMAINS.includes(sceneDomain as typeof VALID_DOMAINS[number])
      ? sceneDomain
      : 'commerce_exchange',
    physical_state: VALID_STATES.includes(physicalState as typeof VALID_STATES[number])
      ? physicalState
      : 'in full operation',
    figure_count: figureCount,
    architectural_setting: architecturalSetting,
    full_scene_description: fullSceneDescription,
    density,
    hatching_zones: hatchingZones,
    stippling_zones: stipplingZones,
    contour_emphasis: contourEmphasis,
    // Stage 1 self-validation results
    stage1_validation: {
      single_medium: singleMedium,
      period_test: periodTest,
      legibility_test: legibilityTest,
      narrative_test: narrativeTest,
      figure_test: figureTest,
    },
  }
}

// ─── Visual Decision Validator ──────────────────────────────────────────────

function validateVisualDecision(decision: VisualDecision): ValidationResult {
  const errors: string[] = []

  // Check scene description
  const scene = decision.full_scene_description as string
  if (!scene || scene.length < 20) {
    errors.push('full_scene_description is missing or too short (min 20 chars)')
  }

  // Check density is valid integer 0-5
  const density = decision.density as number
  if (typeof density !== 'number' || density < 0 || density > 5) {
    errors.push(`density must be integer 0-5, got: ${density}`)
  }

  // Check figure count is reasonable
  const figureCount = decision.figure_count as number
  if (typeof figureCount !== 'number' || figureCount < 0 || figureCount > 50) {
    errors.push(`figure_count must be 0-50, got: ${figureCount}`)
  }

  // Check all 5 Stage 1 validation tests passed
  const validation = decision.stage1_validation as Record<string, string> | undefined
  if (validation) {
    const tests = ['single_medium', 'period_test', 'legibility_test', 'narrative_test', 'figure_test']
    for (const test of tests) {
      if (validation[test] !== 'PASS') {
        errors.push(`Stage 1 validation test "${test}" = ${validation[test] ?? 'MISSING'}`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

// ─── Style Pack Export ──────────────────────────────────────────────────────

const sicToile: StylePack = {
  id: 'sic_toile',
  name: 'SIC Enlightenment Toile',
  status: 'active',

  maxSlides: 14,
  imagesPerCarousel: 'per-slide',
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

  tokens: loadTokens(),
}

export default sicToile
