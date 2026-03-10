// ─── Format-Aware Slide Labels ──────────────────────────────────────────────
// Human-readable short labels for slide navigator thumbnails

export const LONG_FORM_LABELS: Record<string, string> = {
  cover_hook: 'Cover',
  context_setter: 'Context',
  problem_setup: 'Problem',
  problem_escalation: 'Escalation',
  turning_point: 'Turning Point',
  pivot_question: 'Pivot',
  solution_introduction: 'Solution',
  landscape_overview: 'Landscape',
  technical_foundation: 'Technical',
  how_it_works_setup: 'How It Works',
  how_it_works_flow: 'Flow',
  how_it_works_security: 'Security',
  company_positioning: 'Positioning',
  cta_close: 'CTA',
}

export const SHORT_FORM_LABELS: Record<string, string> = {
  cover_hook: 'Cover',
  thesis: 'Thesis',
  evidence: 'Evidence',
  landing: 'Landing',
}

export function getSlideLabel(archetype: string, format: 'short_form' | 'long_form'): string {
  const labels = format === 'short_form' ? SHORT_FORM_LABELS : LONG_FORM_LABELS
  return labels[archetype] ?? archetype
}
