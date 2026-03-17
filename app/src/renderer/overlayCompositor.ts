// ─── Experience Capture Overlay Compositor ──────────────────────────────────
// Canvas-based compositor: full-bleed photograph → gradient overlay → text layers
// Produces 1200×1500 PNG data URI

const CANVAS_W = 1200
const CANVAS_H = 1500
const TEXT_ON_DARK = '#FFFFFF' // NYT Opinion: white text over photo overlays

// ─── Types ──────────────────────────────────────────────────────────────────

export type OverlayPattern = 'bottom_heavy' | 'both' | 'left_bleed' | 'right_bleed'

export interface CompositeInput {
  photo_url: string
  dialogue: string | null
  headline: string
  body_text: string | null
  cta_text: string | null
  byline: string
  overlay_pattern: OverlayPattern
  brand_logo_text: string
}

// ─── Font loading ───────────────────────────────────────────────────────────

async function ensureFontsLoaded(): Promise<void> {
  await Promise.all([
    document.fonts.load('400 54px Lora'),
    document.fonts.load('700 64px Lora'),
    document.fonts.load('400 22px "Plus Jakarta Sans"'),
  ])
}

// ─── Image loading ──────────────────────────────────────────────────────────

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

// ─── Layer 1: Base photograph ───────────────────────────────────────────────

async function drawBasePhoto(
  ctx: CanvasRenderingContext2D,
  url: string,
): Promise<void> {
  const img = await loadImage(url)
  // Cover-fit: fill entire canvas preserving aspect ratio
  const scale = Math.max(CANVAS_W / img.width, CANVAS_H / img.height)
  const w = img.width * scale
  const h = img.height * scale
  const x = (CANVAS_W - w) / 2
  const y = (CANVAS_H - h) / 2
  ctx.drawImage(img, x, y, w, h)
}

// ─── Layer 2: Gradient overlay (pattern-specific) ───────────────────────────

function drawGradientOverlay(
  ctx: CanvasRenderingContext2D,
  pattern: OverlayPattern,
): void {
  switch (pattern) {
    case 'bottom_heavy': {
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(0.55, 'rgba(0,0,0,0)')
      grad.addColorStop(0.72, 'rgba(0,0,0,0.6)')
      grad.addColorStop(1, 'rgba(0,0,0,0.88)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      break
    }
    case 'both': {
      // Top band
      const topGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H * 0.3)
      topGrad.addColorStop(0, 'rgba(0,0,0,0.75)')
      topGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = topGrad
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H * 0.3)

      // Bottom band
      const botGrad = ctx.createLinearGradient(0, CANVAS_H * 0.6, 0, CANVAS_H)
      botGrad.addColorStop(0, 'rgba(0,0,0,0)')
      botGrad.addColorStop(1, 'rgba(0,0,0,0.88)')
      ctx.fillStyle = botGrad
      ctx.fillRect(0, CANVAS_H * 0.6, CANVAS_W, CANVAS_H * 0.4)
      break
    }
    case 'left_bleed': {
      const grad = ctx.createLinearGradient(0, 0, CANVAS_W * 0.55, 0)
      grad.addColorStop(0, 'rgba(0,0,0,0.85)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      break
    }
    case 'right_bleed': {
      const grad = ctx.createLinearGradient(CANVAS_W * 0.45, 0, CANVAS_W, 0)
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, 'rgba(0,0,0,0.85)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      break
    }
  }
}

// ─── Layer 3: Metadata gradient (thin bottom strip) ─────────────────────────

function drawMetadataGradient(ctx: CanvasRenderingContext2D): void {
  const grad = ctx.createLinearGradient(0, CANVAS_H * 0.92, 0, CANVAS_H)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = grad
  ctx.fillRect(0, CANVAS_H * 0.92, CANVAS_W, CANVAS_H * 0.08)
}

// ─── Luminance protection ───────────────────────────────────────────────────

interface Zone {
  x: number
  y: number
  width: number
  height: number
}

function needsLuminanceProtection(
  ctx: CanvasRenderingContext2D,
  zone: Zone,
): boolean {
  // Clamp zone to canvas bounds
  const x = Math.max(0, Math.min(zone.x, CANVAS_W - 1))
  const y = Math.max(0, Math.min(zone.y, CANVAS_H - 1))
  const w = Math.min(zone.width, CANVAS_W - x)
  const h = Math.min(zone.height, CANVAS_H - y)
  if (w <= 0 || h <= 0) return false

  const imageData = ctx.getImageData(x, y, w, h)
  const data = imageData.data
  let totalLuminance = 0
  const pixelCount = data.length / 4

  for (let i = 0; i < data.length; i += 4) {
    // Relative luminance (simplified sRGB)
    totalLuminance += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }

  return totalLuminance / pixelCount > 200
}

function applyLuminanceProtection(
  ctx: CanvasRenderingContext2D,
  zone: Zone,
): void {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(zone.x - 8, zone.y - 8, zone.width + 16, zone.height + 16)
}

// ─── Text position helpers ──────────────────────────────────────────────────

const LEFT_MARGIN = 96
const RIGHT_MARGIN = CANVAS_W - 96

function getDialogueTop(pattern: OverlayPattern): number {
  switch (pattern) {
    case 'bottom_heavy':
      return CANVAS_H * 0.28
    case 'both':
      return CANVAS_H * 0.08
    case 'left_bleed':
    case 'right_bleed':
      return CANVAS_H * 0.2
  }
}

function getTextX(pattern: OverlayPattern): number {
  return pattern === 'right_bleed' ? CANVAS_W * 0.55 + 48 : LEFT_MARGIN
}

function getTextMaxWidth(pattern: OverlayPattern): number {
  switch (pattern) {
    case 'left_bleed':
      return CANVAS_W * 0.45 - LEFT_MARGIN - 48
    case 'right_bleed':
      return CANVAS_W * 0.45 - 48 - 48
    default:
      return CANVAS_W - LEFT_MARGIN * 2
  }
}

function getTextAlign(pattern: OverlayPattern): CanvasTextAlign {
  return pattern === 'right_bleed' ? 'right' : 'left'
}

function getTextAnchorX(pattern: OverlayPattern): number {
  return pattern === 'right_bleed' ? RIGHT_MARGIN : LEFT_MARGIN
}

// ─── Layer 4: Dialogue text + hanging quote mark ────────────────────────────

function drawDialogue(
  ctx: CanvasRenderingContext2D,
  dialogue: string,
  pattern: OverlayPattern,
): void {
  const fontSize = 54
  const lineHeight = fontSize * 1.35
  const x = getTextX(pattern)
  const topY = getDialogueTop(pattern)
  const lines = dialogue.split('\n')

  // Estimate dialogue zone for luminance check
  const dialogueZone: Zone = {
    x: x - 40,
    y: topY - fontSize * 2,
    width: getTextMaxWidth(pattern) + 80,
    height: lines.length * lineHeight + fontSize * 2,
  }

  if (needsLuminanceProtection(ctx, dialogueZone)) {
    applyLuminanceProtection(ctx, dialogueZone)
  }

  ctx.save()
  ctx.fillStyle = TEXT_ON_DARK
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 12

  // 1. Hanging quote mark (larger, separate)
  const quoteFont = `400 ${Math.round(fontSize * 2.5)}px 'Lora', serif`
  ctx.font = quoteFont
  ctx.textAlign = getTextAlign(pattern)

  if (pattern === 'right_bleed') {
    // For right-aligned, hang quote mark to the right of the text block
    ctx.fillText('\u201C', RIGHT_MARGIN, topY)
  } else {
    ctx.fillText('\u201C', x - 32, topY)
  }

  // 2. Dialogue lines — preserve \n breaks, never reflow
  ctx.font = `400 ${fontSize}px 'Lora', serif`
  let y = topY + 8

  for (const line of lines) {
    if (pattern === 'right_bleed') {
      ctx.textAlign = 'right'
      ctx.fillText(line, RIGHT_MARGIN, y)
    } else {
      ctx.textAlign = 'left'
      ctx.fillText(line, x, y)
    }
    y += lineHeight
  }

  ctx.restore()
}

// ─── Layer 5: Headline ──────────────────────────────────────────────────────

function drawHeadline(
  ctx: CanvasRenderingContext2D,
  headline: string,
  pattern: OverlayPattern,
): void {
  const fontSize = 64
  const x = getTextAnchorX(pattern)
  const maxWidth = getTextMaxWidth(pattern)

  // Position headline below dialogue area or in lower portion
  let y: number
  switch (pattern) {
    case 'bottom_heavy':
      y = CANVAS_H * 0.72
      break
    case 'both':
      y = CANVAS_H * 0.68
      break
    case 'left_bleed':
    case 'right_bleed':
      y = CANVAS_H * 0.55
      break
  }

  ctx.save()
  ctx.font = `700 ${fontSize}px 'Lora', serif`
  ctx.fillStyle = TEXT_ON_DARK
  ctx.textAlign = getTextAlign(pattern)
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 8

  // Simple word-wrap for headline
  const words = headline.split(' ')
  let line = ''
  const lineHeight = fontSize * 1.2

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, y)
      line = word
      y += lineHeight
    } else {
      line = testLine
    }
  }
  if (line) {
    ctx.fillText(line, x, y)
  }

  ctx.restore()
}

// ─── Layer 6: Body text ─────────────────────────────────────────────────────

function drawBodyText(
  ctx: CanvasRenderingContext2D,
  body: string,
  pattern: OverlayPattern,
): void {
  const fontSize = 28
  const x = getTextAnchorX(pattern)
  const maxWidth = getTextMaxWidth(pattern)

  // Body text sits below headline
  let y: number
  switch (pattern) {
    case 'bottom_heavy':
      y = CANVAS_H * 0.82
      break
    case 'both':
      y = CANVAS_H * 0.78
      break
    case 'left_bleed':
    case 'right_bleed':
      y = CANVAS_H * 0.68
      break
  }

  ctx.save()
  ctx.font = `400 ${fontSize}px 'Plus Jakarta Sans', sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.textAlign = getTextAlign(pattern)
  ctx.shadowColor = 'transparent'

  // Word-wrap body text
  const words = body.split(' ')
  let line = ''
  const lineHeight = fontSize * 1.5

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, y)
      line = word
      y += lineHeight
    } else {
      line = testLine
    }
  }
  if (line) {
    ctx.fillText(line, x, y)
  }

  ctx.restore()
}

// ─── Layer 7: Metadata footer ───────────────────────────────────────────────

function drawMetadataFooter(
  ctx: CanvasRenderingContext2D,
  byline: string,
): void {
  const y = CANVAS_H * 0.975

  ctx.save()
  ctx.font = '400 22px "Plus Jakarta Sans", sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.shadowColor = 'transparent'
  ctx.textAlign = 'left'
  ctx.fillText(byline, LEFT_MARGIN, y)
  ctx.restore()
}

// ─── Layer 8: Logo (text fallback) ──────────────────────────────────────────

function drawLogo(
  ctx: CanvasRenderingContext2D,
  logoText: string,
): void {
  const y = CANVAS_H * 0.975

  ctx.save()
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.shadowColor = 'transparent'
  ctx.textAlign = 'right'
  ctx.fillText(logoText, RIGHT_MARGIN, y)
  ctx.restore()
}

// ─── Main compositor ────────────────────────────────────────────────────────

/**
 * Composites an Experience Capture slide:
 * full-bleed photograph → gradient overlay → dialogue + headline + metadata.
 *
 * Returns a 1200×1500 PNG data URI.
 */
export async function compositeExperienceCaptureSlide(
  input: CompositeInput,
): Promise<string> {
  await ensureFontsLoaded()

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')!

  // Layer 1: Base photograph
  await drawBasePhoto(ctx, input.photo_url)

  // Layer 2: Gradient overlay (pattern-specific)
  drawGradientOverlay(ctx, input.overlay_pattern)

  // Layer 3: Thin bottom gradient for metadata legibility
  drawMetadataGradient(ctx)

  // Layer 4: Dialogue text + hanging quote mark
  if (input.dialogue) {
    drawDialogue(ctx, input.dialogue, input.overlay_pattern)
  }

  // Layer 5: Headline
  drawHeadline(ctx, input.headline, input.overlay_pattern)

  // Layer 6: Body text
  if (input.body_text) {
    drawBodyText(ctx, input.body_text, input.overlay_pattern)
  }

  // Layer 7: Metadata footer
  drawMetadataFooter(ctx, input.byline)

  // Layer 8: Logo (text fallback)
  drawLogo(ctx, input.brand_logo_text)

  return canvas.toDataURL('image/png')
}
