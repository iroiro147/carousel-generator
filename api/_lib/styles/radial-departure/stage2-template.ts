// ─── Radial Departure Stage 2 Prompt Builder ─────────────────────────────────
// Uses the shared zoomBurstPrompt with Radial Departure's dynamic palette.
// One image per carousel — always generates the full-bleed cover photo.

import type { VisualDecision, Tokens } from '../../pipeline/types.js'
import { buildZoomBurstPrompt } from '../../pipeline/zoomBurstPrompt.js'

export function buildStage2Prompt(decision: VisualDecision, _tokens: Tokens): string {
  const subject = (decision.vanishing_point_subject as string) ?? 'urban corridor'
  const cameraPosition = (decision.camera_position as string) ?? 'walker_pov'
  const timeOfDay = (decision.time_of_day as string) ?? 'blue_hour'
  const povDescription = (decision.pov_description as string) ?? `Moving forward through ${subject}`
  const rayDensity = (decision.ray_density as string) ?? 'moderate'
  const overlayOpacity = (decision.overlay_opacity as number) ?? 0.25

  const palette = decision.palette as Record<string, string> | undefined

  return buildZoomBurstPrompt({
    subject,
    cameraPosition,
    timeOfDay,
    povDescription,
    rayDensity: rayDensity as 'extreme' | 'moderate' | 'subtle',
    overlayOpacity,
    slideType: 'cover',
    palette: palette ? {
      primary_dark: palette.primary_dark ?? '#050f1a',
      midtone: palette.midtone ?? '#0a2a4a',
      burst_highlight: palette.burst_highlight ?? '#88e0ff',
    } : undefined,
  })
}
