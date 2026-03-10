// ─── Carousel Export & Import ────────────────────────────────────────────────
// PNG (ZIP of all slides via html2canvas + JSZip) and JSON export/import.

import JSZip from 'jszip'
import type { Carousel } from '../types/carousel'
import type { Brief } from '../types/brief'

// ─── Shared Utility ──────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function isDataURI(str: string): boolean {
  return str.startsWith('data:')
}

// ─── PNG Export ──────────────────────────────────────────────────────────────

/**
 * Render a single slide element to a PNG data URI via html2canvas.
 * The slide DOM node must be present and identified by `slide-canvas-{slide_index}`.
 */
async function renderSlideToDataURI(slideIndex: number): Promise<string> {
  const slideElement = document.getElementById(`slide-canvas-${slideIndex}`)
  if (!slideElement) {
    throw new Error(`Slide element not found: slide-canvas-${slideIndex}`)
  }

  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(slideElement, {
    scale: 2,
    width: 1200,
    height: 1500,
    useCORS: true,
    logging: false,
  })
  return canvas.toDataURL('image/png')
}

export interface PNGExportProgress {
  current: number
  total: number
}

/**
 * Export all carousel slides as a ZIP of PNG files.
 *
 * Because only the currently selected slide is rendered in the DOM,
 * the caller must:
 *  1. Call `selectSlide(i)` for each slide index
 *  2. Wait a tick for React to render
 *  3. Call `captureCurrentSlide()` to capture the visible slide
 *
 * This function orchestrates the full flow via a callback pattern.
 */
export async function exportCarouselPNG(
  carousel: Carousel,
  selectSlide: (index: number) => void,
  onProgress?: (progress: PNGExportProgress) => void,
): Promise<void> {
  const zip = new JSZip()
  const total = carousel.slides.length

  for (let i = 0; i < total; i++) {
    const slide = carousel.slides[i]
    onProgress?.({ current: i + 1, total })

    // Select this slide so React renders it in the DOM
    selectSlide(i)

    // Wait for React to paint
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    let pngDataURI: string

    // Check if slide already has a compositor-generated data URI
    if (slide.illustration_url && isDataURI(slide.illustration_url)) {
      pngDataURI = slide.illustration_url
    } else if (slide.image_url && isDataURI(slide.image_url)) {
      pngDataURI = slide.image_url
    } else {
      // CSS-rendered slide — capture via html2canvas
      pngDataURI = await renderSlideToDataURI(slide.slide_index)
    }

    const base64 = pngDataURI.split(',')[1]
    const filename = `slide-${String(slide.slide_index + 1).padStart(2, '0')}-${slide.archetype}.png`
    zip.file(filename, base64, { base64: true })
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `${carousel.theme_id}-carousel.zip`)
}

// ─── JSON Export ─────────────────────────────────────────────────────────────

/**
 * Export the full carousel state + brief as a downloadable JSON file.
 */
export function exportCarouselJSON(carousel: Carousel, brief: Partial<Brief>): void {
  const exportPayload = {
    version: '2.0',
    exported_at: new Date().toISOString(),
    brief,
    carousel,
  }
  const json = JSON.stringify(exportPayload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const idSlice = carousel.carousel_id.slice(0, 8)
  downloadBlob(blob, `${carousel.theme_id}-carousel-${idSlice}.json`)
}

// ─── JSON Import ─────────────────────────────────────────────────────────────

export interface ImportResult {
  carousel: Carousel
  brief: Partial<Brief>
}

/**
 * Import a previously exported carousel JSON file.
 * Validates the version field. Returns carousel + brief for store hydration.
 */
export async function importCarouselJSON(file: File): Promise<ImportResult> {
  const text = await file.text()
  const payload = JSON.parse(text)

  if (!payload.carousel || !payload.carousel.slides) {
    throw new Error('Invalid file: missing carousel data.')
  }

  if (payload.version !== '2.0') {
    console.warn('Importing file from a different version. Some data may not load correctly.')
  }

  return {
    carousel: payload.carousel as Carousel,
    brief: (payload.brief ?? {}) as Partial<Brief>,
  }
}
