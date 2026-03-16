// ─── Editorial Minimal Stage 2 Prompt Builder ────────────────────────────────
// Generates a zoom-burst photograph prompt when photo_needed = true.
// Returns a generic fallback prompt if photo_needed = false (orchestrator
// still calls this, but the image is optional for this style).

import type { VisualDecision, Tokens } from '../../pipeline/types.js'
import { buildZoomBurstPrompt } from '../../pipeline/zoomBurstPrompt.js'

export function buildStage2Prompt(decision: VisualDecision, _tokens: Tokens): string {
  const photoNeeded = decision.photo_needed as boolean | string
  const isNeeded = photoNeeded === true || photoNeeded === 'true'

  if (!isNeeded) {
    // No photo needed — return a minimal prompt. The orchestrator will still
    // generate an image but it won't be featured prominently.
    return 'Solid dark grey (#1A1A1A) rectangle, no content, no text, no elements. Plain flat color fill only.'
  }

  const photoSubject = (decision.photo_subject as string) ?? 'winding country road through trees'

  return buildZoomBurstPrompt({
    subject: photoSubject,
    cameraPosition: 'driver_pov',
    timeOfDay: 'golden_hour',
    povDescription: `POV from driver's seat looking forward over a matte bonnet toward ${photoSubject}`,
    rayDensity: 'moderate',
    overlayOpacity: 0.25,
    slideType: 'cover',
  })
}
