// ─── Radial Departure Stage 2 Prompt Builder ─────────────────────────────────
// Assembles the GPT-Image-1.5 prompt from the parsed visual decision.
// One image per carousel — always generates the full-bleed cover photo.

import type { VisualDecision, Tokens } from '../../pipeline/types.js'

export function buildStage2Prompt(decision: VisualDecision, _tokens: Tokens): string {
  const subject = (decision.vanishing_point_subject as string) ?? 'urban corridor'
  const cameraPosition = (decision.camera_position as string) ?? 'walker_pov'
  const timeOfDay = (decision.time_of_day as string) ?? 'blue_hour'
  const povDescription = (decision.pov_description as string) ?? `Moving forward through ${subject}`
  const rayDensity = (decision.ray_density as string) ?? 'moderate'
  const overlayOpacity = (decision.overlay_opacity as number) ?? 0.25
  const glowIntensity = (decision.center_glow_intensity as string) ?? 'moderate'

  const palette = decision.palette as Record<string, string> | undefined
  const primaryDark = palette?.primary_dark ?? '#050f1a'
  const midtone = palette?.midtone ?? '#0a2a4a'
  const burstHighlight = palette?.burst_highlight ?? '#88e0ff'

  // Camera position → human-readable description
  const cameraDesc: Record<string, string> = {
    driver_pov: 'from inside a moving vehicle, looking forward over the dashboard',
    walker_pov: 'at eye height, walking forward through the scene',
    aerial: 'from above, diving forward toward the ground',
    street_level: 'from street level, low angle looking forward',
    interior: 'from inside a building, looking down a corridor',
  }

  // Time of day → lighting description
  const lightDesc: Record<string, string> = {
    golden_hour: 'Warm golden hour sunlight raking from low angle',
    blue_hour: 'Cool blue hour ambient light with subtle warmth at horizon',
    midday: 'Bright overhead noon light with hard shadows',
    overcast: 'Even overcast diffused light, no harsh shadows',
    dusk: 'Fading dusk light, deep purple-blue sky gradient',
    night: 'Artificial night lighting, pools of warm light in cold darkness',
  }

  // Ray density → description
  const rayDesc: Record<string, string> = {
    extreme: 'Extremely dense motion streaks, 30+ radial rays filling the entire frame',
    moderate: 'Clear motion streaks, 20 radial rays with alternating thick and thin',
    subtle: 'Gentle motion streaks, 12 wide soft rays with generous space between',
  }

  // Overlay instruction
  const overlayDesc = overlayOpacity > 0.3
    ? 'Heavy dark overlay on all edges for dramatic vignette.'
    : overlayOpacity > 0.15
      ? 'Moderate natural vignette darkening at corners and edges.'
      : 'Minimal overlay — the image brightness speaks for itself.'

  return `ROLE: Editorial photography direction.

No text, UI elements, logos, watermarks, or readable signage anywhere in the image.

GENERATE: A single hyper-realistic zoom-burst photograph for a 4:5 carousel cover slide.

TECHNIQUE: Zoom-burst radial photography. All motion streaks radiate OUTWARD from a single bright central vanishing point. The viewer occupies the perspective of someone in motion — moving through, not observing from the side. The zoom mechanism was turned during a long exposure, creating radial streaks that explode outward from center.

SUBJECT: ${subject}. Camera position: ${cameraDesc[cameraPosition] ?? cameraPosition}.
${povDescription}.

COMPOSITION:
- Vanishing point: centered horizontally, positioned 38–42% from the top of the frame
- ${rayDesc[rayDensity] ?? rayDesc.moderate}
- Foreground (lower 20–25%): the surface the viewer is moving across — naturally dark from motion blur, serving as future text zone
- Corner vignette: natural darkening from radial blur at all four corners
- Center glow intensity: ${glowIntensity} — a ${burstHighlight} bloom at the vanishing point (not pure white)

LIGHT: ${lightDesc[timeOfDay] ?? timeOfDay}. Light source originates at/near the vanishing point and rakes toward the viewer.

COLOR:
- Primary shadow tone: ${primaryDark}
- Main environment color: ${midtone}
- Vanishing point glow: ${burstHighlight} (bloom effect, never pure white)
- ${overlayDesc}

QUALITY: Cinematic editorial photography. Canon or Sony full-frame sensor aesthetic. Wide-angle lens (24–28mm). Deep motion blur at edges, sharp focus at center. No people visible. No readable signage. All surfaces are motion-blurred enough that any text on them is illegible.

Aspect ratio 2176:2716.`
}
