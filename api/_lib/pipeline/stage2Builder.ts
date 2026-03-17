// ─── Stage 2 Builder ─────────────────────────────────────────────────────────
// Delegates to the style pack's buildStage2Prompt() function.
// Handles cover variant image prompts (Stage 1 XML → Stage 2 prompt).
// Body slide prompts use stylePack.buildBodySlidePrompt() directly.

import type { StylePack, VisualDecision } from './types.js'

/**
 * Build the Stage 2 image generation prompt from the visual decision.
 * Each style pack implements its own template.
 */
export function buildStage2Prompt(decision: VisualDecision, stylePack: StylePack): string {
  return stylePack.buildStage2Prompt(decision, stylePack.tokens)
}
