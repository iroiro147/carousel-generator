// ─── Color Derivation ─────────────────────────────────────────────────────────
// Steps 6-8 of the NYT color derivation pipeline.
// Pure TypeScript HSL math — no external dependencies, no API calls.
//
// Takes the selected hue from paletteAnalyzer (Steps 1-5) and produces
// Tone A (softer) and Tone B (bolder) for slide alternation.

import type { ArticleSentiment, PaletteAnalysisResult } from './paletteAnalyzer.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlternationRange = 'wide' | 'medium' | 'narrow' | 'minimal'

export interface DerivedTones {
  /** Tone A — breathing/softer (even text slides: 2, 4, 6, 8, 10) */
  tone_a: string
  /** Tone B — assertive/bolder (odd text slides: 3, 5, 7, 9) */
  tone_b: string
  /** The signature accent color (selected hue at full saturation) */
  signature_color: string
  /** Alternation range classification */
  alternation_range: AlternationRange
  /** Derivation path from palette analysis */
  derivation_path: string
  /** Whether text on Tone B passes WCAG AA (contrast ≥ 4.5 against #1A1A1A) */
  passes_wcag_aa: boolean
  /** Contrast ratio of #1A1A1A on Tone B */
  contrast_ratio: number
  /** HSL values for debugging */
  tone_a_hsl: { h: number; s: number; l: number }
  tone_b_hsl: { h: number; s: number; l: number }
}

// ─── HSL ↔ Hex Conversion ────────────────────────────────────────────────────

function hslToHex(h: number, s: number, l: number): string {
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
    const hex = Math.round((v + m) * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// ─── WCAG Contrast Ratio ──────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1)
  const [r2, g2, b2] = hexToRgb(hex2)
  const l1 = relativeLuminance(r1, g1, b1)
  const l2 = relativeLuminance(r2, g2, b2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

// ─── Clamp Helper ─────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// ─── Step 6: Derive Two Tones ─────────────────────────────────────────────────

interface ToneSpec {
  h: number
  s: number
  l: number
}

function deriveTones(analysis: PaletteAnalysisResult): { toneA: ToneSpec; toneB: ToneSpec } {
  const { selected_hue_h: h, is_neutral } = analysis

  if (is_neutral) {
    // Neutral fallback: both tones stay within neutral range
    // Tone A: very light, barely tinted
    // Tone B: slightly darker, still neutral
    return {
      toneA: { h, s: 5, l: 90 },
      toneB: { h, s: 8, l: 85 },
    }
  }

  // Chromatic hue: derive pastel Tone A and bolder Tone B
  return {
    toneA: {
      h,
      s: clamp(analysis.selected_hue_s * 0.3, 15, 30),  // S: 15-30%
      l: clamp(80, 75, 85),                               // L: 75-85%
    },
    toneB: {
      h,
      s: clamp(analysis.selected_hue_s * 0.7, 35, 70),  // S: 35-70%
      l: clamp(58, 45, 70),                               // L: 45-70%
    },
  }
}

// ─── Step 7: Determine Alternation Range ──────────────────────────────────────

interface AlternationDeltas {
  range: AlternationRange
  deltaL: number  // lightness gap between tones
  deltaS: number  // saturation gap between tones
}

function determineAlternation(sentiment: ArticleSentiment): AlternationDeltas {
  switch (sentiment) {
    case 'confrontational':
      return { range: 'wide', deltaL: 20, deltaS: 32 }
    case 'standard':
      return { range: 'medium', deltaL: 10, deltaS: 15 }
    case 'contemplative':
      return { range: 'narrow', deltaL: 4, deltaS: 7 }
    case 'advocacy':
      return { range: 'minimal', deltaL: 2, deltaS: 3 }
    default:
      return { range: 'medium', deltaL: 10, deltaS: 15 }
  }
}

// ─── Step 8: Apply Alternation Modulation ─────────────────────────────────────

function modulateTones(
  toneA: ToneSpec,
  toneB: ToneSpec,
  deltas: AlternationDeltas,
  isNeutral: boolean,
): { finalA: ToneSpec; finalB: ToneSpec } {
  if (isNeutral) {
    // For neutrals, modulate within a much smaller range
    const neutralDeltaL = Math.min(deltas.deltaL * 0.3, 5)
    const neutralDeltaS = Math.min(deltas.deltaS * 0.2, 3)
    return {
      finalA: {
        h: toneA.h,
        s: clamp(toneA.s, 2, 10),
        l: clamp(toneA.l, 85, 95),
      },
      finalB: {
        h: toneB.h,
        s: clamp(toneB.s + neutralDeltaS, 3, 12),
        l: clamp(toneB.l - neutralDeltaL, 80, 90),
      },
    }
  }

  // Chromatic: modulate Tone B to create the desired gap from Tone A
  const targetL = clamp(toneA.l - deltas.deltaL, 45, 70)
  const targetS = clamp(toneA.s + deltas.deltaS, 35, 70)

  return {
    finalA: toneA,
    finalB: {
      h: toneB.h,
      s: targetS,
      l: targetL,
    },
  }
}

// ─── Main Export ──────────────────────────────────────────────────────────────

const TEXT_PRIMARY = '#1A1A1A'  // NYT text color — from nyt_opinion tokens

/**
 * Steps 6-8: Takes palette analysis result and produces final Tone A, Tone B,
 * signature color, alternation range, and WCAG compliance data.
 */
export function deriveColorTones(analysis: PaletteAnalysisResult): DerivedTones {
  // Step 6: Derive base tones
  const { toneA: baseToneA, toneB: baseToneB } = deriveTones(analysis)

  // Step 7: Determine alternation range from sentiment
  const deltas = determineAlternation(analysis.sentiment)

  // Step 8: Apply modulation
  const { finalA, finalB } = modulateTones(baseToneA, baseToneB, deltas, analysis.is_neutral)

  // Convert to hex
  const toneAHex = hslToHex(finalA.h, finalA.s, finalA.l)
  const toneBHex = hslToHex(finalB.h, finalB.s, finalB.l)
  const signatureHex = analysis.selected_hue_hex

  // WCAG: check #1A1A1A text on the LIGHTER tone (Tone A — worst case for contrast)
  const ratio = contrastRatio(TEXT_PRIMARY, toneAHex)

  return {
    tone_a: toneAHex,
    tone_b: toneBHex,
    signature_color: signatureHex,
    alternation_range: deltas.range,
    derivation_path: analysis.derivation_path,
    passes_wcag_aa: ratio >= 4.5,
    contrast_ratio: Math.round(ratio * 100) / 100,
    tone_a_hsl: finalA,
    tone_b_hsl: finalB,
  }
}

// ─── Slide Assignment (Step 8 continued) ──────────────────────────────────────

/**
 * Assigns background color to a text slide by index.
 * Even text slides (2, 4, 6, 8, 10) → Tone A
 * Odd text slides (3, 5, 7, 9) → Tone B
 *
 * slideIndex is 1-based. Slide 1 is always the cover (uses illustration, not tone).
 */
export function getToneForSlide(slideIndex: number, toneA: string, toneB: string): string {
  if (slideIndex <= 1) return toneA // Cover — shouldn't be called, but safe default
  return slideIndex % 2 === 0 ? toneA : toneB
}
