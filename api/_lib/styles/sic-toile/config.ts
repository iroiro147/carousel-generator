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

// ─── Body Slide Prompt Builder ───────────────────────────────────────────────
// Direct prompt construction for per-slide body images (no Stage 1 reasoning).
// Migrated from legacy api/_lib/images/promptBuilder.ts buildSICToilePrompt().

const SIC_STATE_VOCABULARY: Record<string, string> = {
  'in ruins': 'structural collapse visible, vegetation encroaching through cracks, dramatic shadow in ruin depth',
  'in disorder': 'figures in agitated poses, scattered objects across ground plane, gestural energy in composition',
  'in full operation': 'active figures at each stage of process, purposeful movement implied through pose angles',
  'sealed and witnessed': 'formal tableau with document as compositional center, figures in grave witness poses',
  'newly surveyed': 'open horizon visible, surveying equipment prominent, scene has air of discovery and open space',
  'under construction': 'scaffolding visible, workers in period dress, architectural framework emerging',
  'in procession': 'figures in ordered march, ceremonial objects carried, architectural backdrop',
  'in exchange': 'merchant scene with goods and currency visible, balanced composition of giver and receiver',
}

function buildBodySlidePrompt(params: BodySlideParams): string {
  const stateDesc = SIC_STATE_VOCABULARY[params.object_state] ?? params.object_state
  const scene = params.scene_description ?? `a ${params.object_domain ?? 'commerce exchange'} scene related to ${params.object_name}`
  const figureCount = params.figure_count ?? 7
  const archElements = params.architectural_elements ?? 'classical columns and arched doorways'

  return `Single-color copper-plate engraving illustration of ${scene} — rendered entirely in indigo (#2A2ECD) on white/transparent ground, fine parallel hatching for mid-tone areas, cross-hatching for deep shadows under ${archElements}, stippling for soft textures, clean confident contour lines for primary figure and object outlines, 18th-century French engraving aesthetic — Encyclopédie Diderot plates register, full narrative scene with ground plane and architectural setting, ${stateDesc}, ${figureCount} or more figures in period dress, elaborate but legible at carousel scale, no color other than this single indigo — no fills, no gradients, pure line and mark work`
}

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
  buildBodySlidePrompt,

  tokens: loadTokens(),
}

export default sicToile
