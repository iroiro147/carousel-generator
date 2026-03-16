// ─── Stage 2 Builder ─────────────────────────────────────────────────────────
// Delegates to the style pack's buildStage2Prompt() function.
// Named stage2Builder (not promptBuilder) to avoid clash with
// api/_lib/images/promptBuilder.ts (Architecture Decision #9).

import type { StylePack, VisualDecision } from './types.js'

/**
 * Build the Stage 2 image generation prompt from the visual decision.
 * Each style pack implements its own template.
 */
export function buildStage2Prompt(decision: VisualDecision, stylePack: StylePack): string {
  return stylePack.buildStage2Prompt(decision, stylePack.tokens)
}
