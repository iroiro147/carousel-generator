// ─── Shared Zoom-Burst Prompt Builder ─────────────────────────────────────────
// Used by both Radial Departure and Editorial Minimal style packs.
// Generates a GPT-Image-1.5 prompt for radial zoom-burst photography.
//
// Radial Departure provides its own palette; Editorial Minimal does not.

export interface ZoomBurstParams {
  subject: string
  cameraPosition: string
  timeOfDay: string
  povDescription: string
  rayDensity: 'extreme' | 'moderate' | 'subtle'
  overlayOpacity: number
  slideType: string
  /** Optional palette — Radial Departure provides this, Editorial Minimal does not */
  palette?: {
    primary_dark: string
    midtone: string
    burst_highlight: string
  }
}

export function buildZoomBurstPrompt(params: ZoomBurstParams): string {
  const {
    subject,
    cameraPosition,
    timeOfDay,
    povDescription,
    rayDensity,
    overlayOpacity,
    palette,
  } = params

  // Camera position → human-readable
  const cameraDesc: Record<string, string> = {
    driver_pov: 'from inside a moving vehicle, looking forward over the dashboard/bonnet',
    walker_pov: 'at eye height, walking forward through the scene',
    aerial: 'from above, diving forward toward the ground',
    street_level: 'from street level, low angle looking forward',
    interior: 'from inside a building, looking down a corridor',
  }

  // Time of day → lighting
  const lightDesc: Record<string, string> = {
    golden_hour: 'Warm golden hour sunlight raking from low angle, dappled through foliage',
    blue_hour: 'Cool blue hour ambient light with subtle warmth at horizon',
    midday: 'Bright overhead noon light with hard shadows',
    overcast: 'Even overcast diffused light, no harsh shadows',
    dusk: 'Fading dusk light, deep purple-blue sky gradient',
    night: 'Artificial night lighting, pools of warm light in cold darkness',
  }

  // Ray density → description
  const rayDesc: Record<string, string> = {
    extreme: 'Extremely dense motion streaks, 30+ radial rays filling the frame',
    moderate: 'Clear motion streaks, 20 radial rays with alternating thick and thin',
    subtle: 'Gentle motion streaks, 12 wide soft rays with generous space between',
  }

  // Overlay instruction
  const overlayDesc = overlayOpacity > 0.3
    ? 'Heavy dark overlay on all edges for dramatic vignette.'
    : overlayOpacity > 0.15
      ? 'Moderate natural vignette darkening at corners and edges.'
      : 'Minimal overlay — the image brightness speaks for itself.'

  // Color section — palette-specific if provided, generic if not
  let colorSection: string
  if (palette) {
    colorSection = `COLOR:
- Primary shadow tone: ${palette.primary_dark}
- Main environment color: ${palette.midtone}
- Vanishing point glow: ${palette.burst_highlight} (bloom effect, never pure white)
- ${overlayDesc}`
  } else {
    colorSection = `COLOR:
- Muted, desaturated earth tones — olive-green, deep forest, teal
- Lime-chartreuse accents in highlights and foliage
- Vanishing point glow: warm golden-white bloom (not pure white)
- ${overlayDesc}
- Color grade: cinematic muted, editorial`
  }

  return `ROLE: Editorial photography direction.

No text, UI elements, logos, watermarks, or readable signage anywhere in the image.

GENERATE: A single hyper-realistic zoom-burst photograph for a 4:5 carousel slide.

TECHNIQUE: Zoom-burst radial photography. The zoom mechanism was turned during a long exposure, creating radial streaks that explode outward from a single bright central vanishing point. All motion streaks radiate OUTWARD. The viewer occupies the perspective of someone in motion — moving through, not observing from the side.

SUBJECT: ${subject}. Camera position: ${cameraDesc[cameraPosition] ?? cameraPosition}.
${povDescription}.

COMPOSITION:
- Vanishing point: centered horizontally, positioned 38–42% from the top of the frame
- ${rayDesc[rayDensity] ?? rayDesc.moderate}
- Foreground (lower 20–25%): the surface the viewer is moving across — naturally dark from motion blur
- Corner vignette: natural darkening from radial blur at all four corners

LIGHT: ${lightDesc[timeOfDay] ?? timeOfDay}. Light source originates at/near the vanishing point and rakes toward the viewer.

${colorSection}

QUALITY: Cinematic editorial photography. Canon or Sony full-frame sensor aesthetic. Wide-angle lens (24–28mm). Deep motion blur at edges, sharp focus at center. No people visible. No readable signage. All surfaces motion-blurred enough that any text is illegible.

Aspect ratio 2176:2716.`
}
