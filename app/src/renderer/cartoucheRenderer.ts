// ─── SIC Toile Cartouche Renderer ───────────────────────────────────────────
// SVG-based cartouche generation + canvas compositor for SIC Toile / Name Archaeology.
// Produces 1200×1500 PNG data URI.

const CANVAS_W = 1200
const CANVAS_H = 1500

// ─── Types ──────────────────────────────────────────────────────────────────

export type CartoucheStyle =
  | 'oval_foliage'
  | 'rectangular_foliate'
  | 'cartouche_cartographic'
  | 'knotwork_rectangular'
  | 'oval_geometric'

export type CartoucheSize =
  | 'cover'
  | 'body_large'
  | 'body_medium'
  | 'body_wide'
  | 'text_vignette'

export interface CartoucheConfig {
  style: CartoucheStyle
  size: CartoucheSize
  stroke_color: string
  canvas_width: number
  canvas_height: number
  position: { x: number; y: number }
}

export interface SICToileSlideInput {
  archetype: string
  cartouche_style: CartoucheStyle
  cartouche_size: CartoucheSize
  engraving_url: string
  headline: string
  body_text: string | null
  annotation_label: string | null
  plate_number: number
  stroke_color: string
  has_rule_lines: boolean
}

// ─── Cartouche dimensions ───────────────────────────────────────────────────

const CARTOUCHE_DIMENSIONS: Record<CartoucheSize, { width: number; height: number }> = {
  cover:         { width: 1022, height: 500 },
  body_large:    { width: 1020, height: 1125 },
  body_medium:   { width: 780,  height: 870 },
  body_wide:     { width: 1080, height: 750 },
  text_vignette: { width: 900,  height: 1050 },
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

// ─── Font loading ───────────────────────────────────────────────────────────

async function ensureFontsLoaded(): Promise<void> {
  await Promise.all([
    document.fonts.load('900 72px "Playfair Display"'),
    document.fonts.load('400 24px "DM Sans"'),
    document.fonts.load('500 20px "DM Sans"'),
  ])
}

// ─── SVG generators ─────────────────────────────────────────────────────────

function generateOvalFoliageSVG(
  config: CartoucheConfig,
  dims: { width: number; height: number },
): string {
  const { stroke_color } = config
  const cx = dims.width / 2
  const cy = dims.height / 2
  const rx = dims.width / 2 - 4
  const ry = dims.height / 2 - 4

  // Phase 1: clean ellipse with stroke + decorative tick marks at cardinal positions
  const ticks: string[] = []
  const tickCount = 24
  for (let i = 0; i < tickCount; i++) {
    const angle = (i / tickCount) * Math.PI * 2
    const x1 = cx + (rx - 8) * Math.cos(angle)
    const y1 = cy + (ry - 8) * Math.sin(angle)
    const x2 = cx + (rx + 4) * Math.cos(angle)
    const y2 = cy + (ry + 4) * Math.sin(angle)
    ticks.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke_color}" stroke-width="1" opacity="0.4"/>`,
    )
  }

  return `<svg width="${dims.width}" height="${dims.height}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"
    fill="none" stroke="${stroke_color}" stroke-width="2"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${rx - 12}" ry="${ry - 12}"
    fill="none" stroke="${stroke_color}" stroke-width="0.75" opacity="0.5"/>
  ${ticks.join('\n  ')}
  <!-- Leaf garland paths (Phase 2) -->
  <!-- Base foliage element at bottom (Phase 2) -->
</svg>`
}

function generateRectFoliateSVG(
  config: CartoucheConfig,
  dims: { width: number; height: number },
): string {
  const { stroke_color } = config
  const r = 16 // corner radius

  return `<svg width="${dims.width}" height="${dims.height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="4" width="${dims.width - 8}" height="${dims.height - 8}"
    rx="${r}" ry="${r}" fill="none" stroke="${stroke_color}" stroke-width="2"/>
  <rect x="16" y="16" width="${dims.width - 32}" height="${dims.height - 32}"
    rx="${r - 4}" ry="${r - 4}" fill="none" stroke="${stroke_color}" stroke-width="0.75" opacity="0.5"/>
  <!-- Corner foliate ornaments (Phase 2) -->
  <!-- Edge garland paths (Phase 2) -->
</svg>`
}

function generatePlaceholderSVG(
  config: CartoucheConfig,
  dims: { width: number; height: number },
  _label: string,
): string {
  const { stroke_color } = config

  return `<svg width="${dims.width}" height="${dims.height}" xmlns="http://www.w3.org/2000/svg">
  <!-- TODO: Phase 2 cartouche style -->
  <rect x="4" y="4" width="${dims.width - 8}" height="${dims.height - 8}"
    rx="8" ry="8" fill="none" stroke="${stroke_color}" stroke-width="1.5"
    stroke-dasharray="8,6" opacity="0.6"/>
</svg>`
}

// ─── Main SVG generator ─────────────────────────────────────────────────────

export function generateCartoucheSVG(config: CartoucheConfig): string {
  const dims = CARTOUCHE_DIMENSIONS[config.size]

  switch (config.style) {
    case 'oval_foliage':
      return generateOvalFoliageSVG(config, dims)
    case 'rectangular_foliate':
      return generateRectFoliateSVG(config, dims)
    case 'cartouche_cartographic':
      return generatePlaceholderSVG(config, dims, 'cartographic')
    case 'knotwork_rectangular':
      return generatePlaceholderSVG(config, dims, 'knotwork')
    case 'oval_geometric':
      return generatePlaceholderSVG(config, dims, 'greek_key')
  }
}

// ─── Cartouche positioning ──────────────────────────────────────────────────

function getCartouchePosition(
  archetype: string,
  size: CartoucheSize,
): { x: number; y: number } {
  const dims = CARTOUCHE_DIMENSIONS[size]
  const centerX = (CANVAS_W - dims.width) / 2

  switch (archetype) {
    case 'cover_hook':
      return { x: centerX, y: CANVAS_H * 0.6 }
    case 'pivot_question':
    case 'cta_close':
      return { x: centerX, y: (CANVAS_H - dims.height) / 2 }
    default:
      // Body slides: cartouche in lower portion
      return { x: centerX, y: CANVAS_H - dims.height - 80 }
  }
}

// ─── SVG to canvas rendering ────────────────────────────────────────────────

async function drawSVGOnCanvas(
  ctx: CanvasRenderingContext2D,
  svgString: string,
  position: { x: number; y: number },
): Promise<void> {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    ctx.drawImage(img, position.x, position.y)
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ─── Layer: Engraving illustration ──────────────────────────────────────────

async function drawEngravingIllustration(
  ctx: CanvasRenderingContext2D,
  url: string,
): Promise<void> {
  try {
    const img = await loadImage(url)
    // Center the engraving in upper portion of canvas
    const targetH = CANVAS_H * 0.55
    const scale = Math.min(CANVAS_W * 0.85 / img.width, targetH / img.height)
    const w = img.width * scale
    const h = img.height * scale
    const x = (CANVAS_W - w) / 2
    const y = CANVAS_H * 0.08
    ctx.drawImage(img, x, y, w, h)
  } catch {
    // Engraving load failed — continue without it
  }
}

// ─── Layer: Rule lines ──────────────────────────────────────────────────────

function drawRuleLines(
  ctx: CanvasRenderingContext2D,
  archetype: string,
  color: string,
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.lineCap = 'butt'

  const LEFT = 89
  const WIDTH = CANVAS_W - 178 // 1022px

  const rulePositions: Record<string, number[]> = {
    context_setter:  [CANVAS_H * 0.30],
    pivot_question:  [CANVAS_H * 0.22, CANVAS_H * 0.78],
    cta_close:       [CANVAS_H * 0.35, CANVAS_H * 0.65],
  }

  const positions = rulePositions[archetype] ?? []
  for (const y of positions) {
    ctx.beginPath()
    ctx.moveTo(LEFT, y)
    ctx.lineTo(LEFT + WIDTH, y)
    ctx.stroke()
  }
}

// ─── Layer: Annotation label ────────────────────────────────────────────────

function drawAnnotationLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  color: string,
): void {
  ctx.save()
  ctx.font = '500 16px "DM Sans", sans-serif'
  ctx.fillStyle = color
  ctx.globalAlpha = 0.6
  ctx.textAlign = 'right'
  ctx.letterSpacing = '2px'
  ctx.fillText(label.toUpperCase(), CANVAS_W - 89, 60)
  ctx.restore()
}

// ─── Layer: Headline inside cartouche ───────────────────────────────────────

function drawCartoucheHeadline(
  ctx: CanvasRenderingContext2D,
  headline: string,
  size: CartoucheSize,
  archetype: string,
): void {
  const dims = CARTOUCHE_DIMENSIONS[size]
  const pos = getCartouchePosition(archetype, size)

  // Interior padding
  const padX = size === 'cover' ? 80 : 60
  const padY = size === 'cover' ? 60 : 48
  const maxWidth = dims.width - padX * 2
  const fontSize = size === 'cover' ? 72 : 48

  ctx.save()
  ctx.font = `900 ${fontSize}px 'Playfair Display', serif`
  ctx.fillStyle = '#1A1A1A'
  ctx.textAlign = 'center'

  const text = headline.toUpperCase()
  const centerX = pos.x + dims.width / 2
  let y = pos.y + padY + fontSize

  // Word-wrap
  const words = text.split(' ')
  let line = ''
  const lineHeight = fontSize * 1.15

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, centerX, y)
      line = word
      y += lineHeight
    } else {
      line = testLine
    }
  }
  if (line) {
    ctx.fillText(line, centerX, y)
  }

  ctx.restore()
}

// ─── Layer: Body text inside cartouche ──────────────────────────────────────

function drawCartoucheBodyText(
  ctx: CanvasRenderingContext2D,
  body: string,
  size: CartoucheSize,
  archetype: string,
): void {
  const dims = CARTOUCHE_DIMENSIONS[size]
  const pos = getCartouchePosition(archetype, size)

  const padX = 60
  const maxWidth = dims.width - padX * 2
  const fontSize = 24

  ctx.save()
  ctx.font = `400 ${fontSize}px 'DM Sans', sans-serif`
  ctx.fillStyle = '#3A3A3A'
  ctx.textAlign = 'center'

  const centerX = pos.x + dims.width / 2
  // Start body text in lower half of cartouche
  let y = pos.y + dims.height * 0.55

  // Word-wrap
  const words = body.split(' ')
  let line = ''
  const lineHeight = fontSize * 1.6

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, centerX, y)
      line = word
      y += lineHeight
    } else {
      line = testLine
    }
  }
  if (line) {
    ctx.fillText(line, centerX, y)
  }

  ctx.restore()
}

// ─── Layer: Plate number ────────────────────────────────────────────────────

function drawPlateNumber(
  ctx: CanvasRenderingContext2D,
  plateNumber: number,
): void {
  ctx.save()
  ctx.font = '400 18px "DM Sans", sans-serif'
  ctx.fillStyle = 'rgba(42, 46, 205, 0.45)' // muted indigo
  ctx.textAlign = 'left'
  ctx.fillText(`TAB. ${toRoman(plateNumber)}.`, 89, CANVAS_H - 48)
  ctx.restore()
}

function toRoman(num: number): string {
  const lookup: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let result = ''
  let remaining = num
  for (const [value, symbol] of lookup) {
    while (remaining >= value) {
      result += symbol
      remaining -= value
    }
  }
  return result
}

// ─── Layer: Logo mark ───────────────────────────────────────────────────────

function drawLogoMark(ctx: CanvasRenderingContext2D): void {
  ctx.save()
  ctx.font = '600 18px "DM Sans", sans-serif'
  ctx.fillStyle = 'rgba(42, 46, 205, 0.45)'
  ctx.textAlign = 'right'
  ctx.fillText('LOGO', CANVAS_W - 89, CANVAS_H - 48)
  ctx.restore()
}

// ─── Layer: Linen texture overlay ───────────────────────────────────────────
// Procedural grain — avoids needing a base64 texture asset

function drawLinenTexture(ctx: CanvasRenderingContext2D): void {
  // Generate a small procedural grain tile
  const tileSize = 200
  const tileCanvas = document.createElement('canvas')
  tileCanvas.width = tileSize
  tileCanvas.height = tileSize
  const tileCtx = tileCanvas.getContext('2d')!

  // Fill with semi-random grain dots
  tileCtx.fillStyle = 'rgba(0,0,0,1)'
  for (let x = 0; x < tileSize; x += 2) {
    for (let y = 0; y < tileSize; y += 2) {
      // Simple deterministic noise based on position
      const noise = ((x * 7 + y * 13) % 17) / 17
      if (noise > 0.5) {
        tileCtx.globalAlpha = noise * 0.3
        tileCtx.fillRect(x, y, 1, 1)
      }
    }
  }

  // Tile across full canvas at low opacity with multiply blend
  ctx.save()
  ctx.globalAlpha = 0.08
  ctx.globalCompositeOperation = 'multiply'
  for (let x = 0; x < CANVAS_W; x += tileSize) {
    for (let y = 0; y < CANVAS_H; y += tileSize) {
      ctx.drawImage(tileCanvas, x, y, tileSize, tileSize)
    }
  }
  ctx.restore()
}

// ─── Main compositor ────────────────────────────────────────────────────────

/**
 * Composites a SIC Toile / Name Archaeology slide:
 * cream background → engraving → cartouche → rule lines → text → plate number → linen texture.
 *
 * Returns a 1200×1500 PNG data URI.
 */
export async function compositeSICToileSlide(
  input: SICToileSlideInput,
): Promise<string> {
  await ensureFontsLoaded()

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')!

  // Layer 1: Cream background
  ctx.fillStyle = '#F5F0E8'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Layer 2: Engraving illustration
  await drawEngravingIllustration(ctx, input.engraving_url)

  // Layer 3: Cartouche SVG
  const cartouchePos = getCartouchePosition(input.archetype, input.cartouche_size)
  const cartoucheSVG = generateCartoucheSVG({
    style: input.cartouche_style,
    size: input.cartouche_size,
    stroke_color: input.stroke_color,
    canvas_width: CANVAS_W,
    canvas_height: CANVAS_H,
    position: cartouchePos,
  })
  await drawSVGOnCanvas(ctx, cartoucheSVG, cartouchePos)

  // Layer 4: Rule lines
  if (input.has_rule_lines) {
    drawRuleLines(ctx, input.archetype, input.stroke_color)
  }

  // Layer 5: Annotation label
  if (input.annotation_label) {
    drawAnnotationLabel(ctx, input.annotation_label, input.stroke_color)
  }

  // Layer 6: Headline inside cartouche
  drawCartoucheHeadline(ctx, input.headline, input.cartouche_size, input.archetype)

  // Layer 7: Body text
  if (input.body_text) {
    drawCartoucheBodyText(ctx, input.body_text, input.cartouche_size, input.archetype)
  }

  // Layer 8: Plate number
  drawPlateNumber(ctx, input.plate_number)

  // Layer 9: Logo mark
  drawLogoMark(ctx)

  // Layer 10: Linen texture overlay (8% opacity, multiply)
  drawLinenTexture(ctx)

  return canvas.toDataURL('image/png')
}
