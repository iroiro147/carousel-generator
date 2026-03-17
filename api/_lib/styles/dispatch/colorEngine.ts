// ─── Dispatch Color Engine ────────────────────────────────────────────────────
// Pre-determined color derivation: f(brandHex, pathway) → DispatchColorSystem
// Pure synchronous function — no API calls, no image analysis.
// See Dispatch_Spec/dispatch-phase1-color-derivation.md for full algorithm.

export type DispatchPathway =
  | 'name-archaeology'
  | 'experience-capture'
  | 'symbol-literalization'
  | 'product-elevation'

export interface DispatchColorSystem {
  seed: string
  seedHsl: [number, number, number]
  toneA: string
  toneB: string
  textPrimary: string
  textSecondary: string
  accentHex: string
  pathway: DispatchPathway
}

// ─── HSL ↔ Hex ──────────────────────────────────────────────────────────────

export function hexToHsl(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) return [0, 0, l * 100]

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6

  return [h * 360, s * 100, l * 100]
}

export function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100
  const lNorm = l / 100
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lNorm - c / 2

  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  const toHex = (v: number) => {
    const hex = Math.round((v + m) * 255).toString(16).padStart(2, '0')
    return hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

function mid(min: number, max: number): number {
  return (min + max) / 2
}

// ─── Seed Derivation by Pathway ──────────────────────────────────────────────

function deriveNameArchaeologySeed(h: number, s: number, l: number): [number, number, number] {
  // Hue-preserve, value-reduce, saturation-reduce
  // H: retain (±10° drift toward organic), S × 0.60-0.70, L × 0.28-0.35
  return [
    h, // retain hue
    clamp(s * mid(0.60, 0.70), 0, 100),
    clamp(l * mid(0.28, 0.35), 0, 100),
  ]
}

function deriveExperienceCaptureSeed(h: number): [number, number, number] {
  // Environment-derived: dark ambient version of the brand's hue
  // H: retain, S: 0-30%, L: 3-10%
  return [h, mid(10, 20), mid(5, 8)]
}

function deriveProductElevationSeed(_h: number): [number, number, number] {
  // Material-extract: brand palette abandoned
  // Default to warm near-black (studio product photography baseline)
  // H: 25-40°, S: 10-60%, L: 6-14%
  return [mid(25, 40), mid(20, 40), mid(8, 12)]
}

function deriveSymbolLiteralizationSeed(h: number, s: number, l: number): [number, number, number] {
  // Hue-preserve, value-reduce dramatically
  // H: retain (±5°), S × 0.78-0.90, L × 0.30-0.45
  return [
    h,
    clamp(s * mid(0.78, 0.90), 0, 100),
    clamp(l * mid(0.30, 0.45), 0, 100),
  ]
}

// ─── Tone Derivation from Seed ───────────────────────────────────────────────

function deriveToneA(seedH: number, seedS: number, seedL: number): [number, number, number] {
  // Tone A: seed L + 8-14pp, S × 0.85-0.95, max L:28
  return [
    seedH,
    clamp(seedS * mid(0.85, 0.95), 0, 100),
    clamp(seedL + mid(8, 14), 0, 28),
  ]
}

function deriveToneB(seedH: number, seedS: number, seedL: number): [number, number, number] {
  // Tone B: seed L + 4-8pp, S × 0.25-0.40 (desaturated, "quiet" tone)
  return [
    seedH,
    clamp(seedS * mid(0.25, 0.40), 0, 100),
    clamp(seedL + mid(4, 8), 0, 100),
  ]
}

function deriveTextSecondary(seedH: number, seedS: number): string {
  // H: seed H, S: seed S × 0.15-0.25, L: 75-82%
  return hslToHex(
    seedH,
    clamp(seedS * mid(0.15, 0.25), 0, 100),
    mid(75, 82),
  )
}

function deriveAccent(seedH: number): string {
  // High saturation, mid lightness — the pop color
  // S: 85-95%, L: 50-60%
  return hslToHex(seedH, mid(85, 95), mid(50, 60))
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function deriveDispatchColors(brandHex: string, pathway: DispatchPathway): DispatchColorSystem {
  const [h, s, l] = hexToHsl(brandHex)

  let seedHsl: [number, number, number]

  switch (pathway) {
    case 'name-archaeology':
      seedHsl = deriveNameArchaeologySeed(h, s, l)
      break
    case 'experience-capture':
      seedHsl = deriveExperienceCaptureSeed(h)
      break
    case 'product-elevation':
      seedHsl = deriveProductElevationSeed(h)
      break
    case 'symbol-literalization':
      seedHsl = deriveSymbolLiteralizationSeed(h, s, l)
      break
  }

  const seed = hslToHex(seedHsl[0], seedHsl[1], seedHsl[2])
  const toneAHsl = deriveToneA(seedHsl[0], seedHsl[1], seedHsl[2])
  const toneBHsl = deriveToneB(seedHsl[0], seedHsl[1], seedHsl[2])

  return {
    seed,
    seedHsl,
    toneA: hslToHex(toneAHsl[0], toneAHsl[1], toneAHsl[2]),
    toneB: hslToHex(toneBHsl[0], toneBHsl[1], toneBHsl[2]),
    textPrimary: '#FFFFFF',
    textSecondary: deriveTextSecondary(seedHsl[0], seedHsl[1]),
    accentHex: deriveAccent(seedHsl[0]),
    pathway,
  }
}
