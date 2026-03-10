import type { FormatConfig, ArchetypeKey } from '../types/theme'

// ─── Long-form: 14 archetypes in narrative arc order ───────────────────────────
const STANDARD_SEQUENCE: ArchetypeKey[] = [
  'cover_hook',
  'context_setter',
  'problem_setup',
  'problem_escalation',
  'turning_point',
  'pivot_question',
  'solution_introduction',
  'landscape_overview',
  'technical_foundation',
  'how_it_works_setup',
  'how_it_works_flow',
  'how_it_works_security',
  'company_positioning',
  'cta_close',
]

// ─── Short-form (NYT Opinion): 3 or 4 archetypes ──────────────────────────────
const NYT_SEQUENCE_3: ArchetypeKey[] = ['cover_hook', 'thesis', 'landing']
const NYT_SEQUENCE_4: ArchetypeKey[] = ['cover_hook', 'thesis', 'evidence', 'landing']

/**
 * Returns the correct archetype sequence for the given format.
 * For short-form, pass slideCount (3 or 4) to select the right sequence.
 */
export function getArchetypeSequence(
  formatConfig: FormatConfig,
  slideCount?: number,
): ArchetypeKey[] {
  if (formatConfig.format === 'short_form') {
    return slideCount === 4 ? NYT_SEQUENCE_4 : NYT_SEQUENCE_3
  }
  return STANDARD_SEQUENCE
}

// ─── Text-only archetypes ──────────────────────────────────────────────────────
const TEXT_ONLY: ArchetypeKey[] = ['pivot_question', 'cta_close']

// ─── Quote archetypes (NYT Opinion body slides) ────────────────────────────────
const QUOTE: ArchetypeKey[] = ['thesis', 'evidence', 'landing']

/**
 * Content type per archetype — used by image gen to skip text-only slides.
 */
export function getContentType(
  archetype: ArchetypeKey,
): 'object' | 'text_only' | 'quote' | 'illustration' {
  if (TEXT_ONLY.includes(archetype)) return 'text_only'
  if (QUOTE.includes(archetype)) return 'quote'
  if (archetype === 'cover_hook') return 'illustration' // For short-form
  return 'object'
}

/**
 * Short-form slide count decision.
 * See Engine_Modifications_Spec.md §Step 2: Slide Count Decision
 */
export function decideShortFormSlideCount(argument: {
  evidence: string | null
  landing: string
  claimWordCount: number
}): 3 | 4 {
  if (
    argument.evidence !== null &&
    argument.evidence.trim() !== argument.landing.trim() &&
    argument.claimWordCount > 40
  ) {
    return 4
  }
  return 3
}
