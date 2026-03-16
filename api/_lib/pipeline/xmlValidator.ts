// ─── XML Validator ───────────────────────────────────────────────────────────
// Delegates to the style pack's validateVisualDecision() function.
// Thin wrapper that standardizes the validation flow.

import type { StylePack, VisualDecision, ValidationResult } from './types.js'

/**
 * Validate a parsed visual decision against the style pack's rules.
 * Returns { valid: true } or { valid: false, errors: [...] }.
 */
export function validate(decision: VisualDecision, stylePack: StylePack): ValidationResult {
  return stylePack.validateVisualDecision(decision)
}
