// ─── WCAG AA Contrast Check ─────────────────────────────────────────────────
// Pure client-side contrast ratio calculation per WCAG 2.1 spec.
// Used by signature color picker to warn about low-contrast choices.

/**
 * Parse a hex color string to [r, g, b] (0–255).
 */
function hexToRGB(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full = clean.length === 3
    ? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
    : clean
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

/**
 * Convert sRGB component (0–255) to linear RGB.
 */
function sRGBToLinear(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

/**
 * Compute relative luminance per WCAG 2.1 spec.
 * Returns value in [0, 1] where 0 = black, 1 = white.
 */
export function hexToLuminance(hex: string): number {
  const [r, g, b] = hexToRGB(hex)
  return 0.2126 * sRGBToLinear(r) + 0.7152 * sRGBToLinear(g) + 0.0722 * sRGBToLinear(b)
}

/**
 * Calculate contrast ratio between two hex colors.
 * Returns a value ≥ 1. WCAG AA requires ≥ 4.5 for normal text.
 */
export function calculateContrast(color1: string, color2: string): number {
  const l1 = hexToLuminance(color1)
  const l2 = hexToLuminance(color2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}
