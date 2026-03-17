// ─── Batch Body Slide Image Generation ──────────────────────────────────────
// POST /api/images/generate-carousel
// Routes through the style pack system (no more legacy promptBuilder switch-case).
// Generates body slide images in batches of 5 with rate-limit delays.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateImage, bufferToDataURI } from '../_lib/providers/index.js'
import { loadStyle } from '../_lib/pipeline/styleLoader.js'
import type { BodySlideParams } from '../_lib/pipeline/types.js'

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

const TEXT_ONLY_ARCHETYPES = new Set(['pivot_question', 'cta_close'])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { slides, theme_id } = req.body

    if (!slides || !theme_id) {
      return res.status(400).json({ error: 'Missing required fields: slides, theme_id' })
    }

    const stylePack = await loadStyle(theme_id)

    if (!stylePack.buildBodySlidePrompt) {
      return res.json({
        images: [],
        skipped: `Style pack "${theme_id}" does not support per-slide body image generation`,
      })
    }

    const imageSlides = (slides as Record<string, unknown>[]).filter(
      (s) =>
        s.content_type !== 'text_only' && !TEXT_ONLY_ARCHETYPES.has(String(s.archetype ?? '')),
    )

    const batches = chunk(imageSlides, 5)
    const results: Array<{
      slide_index: number
      archetype: string
      image_url: string | null
      prompt_used: string
      error?: string
    }> = []

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx]

      const batchResults = await Promise.allSettled(
        batch.map(async (slide: Record<string, unknown>) => {
          const params: BodySlideParams = {
            archetype: String(slide.archetype ?? ''),
            object_name: String(slide.object_name ?? ''),
            object_state: String(slide.object_state ?? ''),
            object_domain: slide.object_domain as string | undefined,
            brief_context: slide.brief_context as string | undefined,
            illustration_mode: slide.illustration_mode as string | undefined,
            emotional_register: slide.emotional_register as string | undefined,
            dominant_hue: slide.dominant_hue as string | undefined,
            scene_description: slide.scene_description as string | undefined,
            figure_count: slide.figure_count as number | undefined,
            architectural_elements: slide.architectural_elements as string | undefined,
          }

          const prompt = stylePack.buildBodySlidePrompt!(params)
          const imageBuffer = await generateImage(prompt, theme_id)
          const dataURI = bufferToDataURI(imageBuffer)
          return {
            slide_index: Number(slide.slide_index ?? -1),
            archetype: String(slide.archetype ?? 'unknown'),
            image_url: dataURI,
            prompt_used: prompt,
          }
        }),
      )

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          const errMsg = result.reason instanceof Error ? result.reason.message : 'Generation failed'
          const failedSlide = batch[batchResults.indexOf(result)] as Record<string, unknown> | undefined
          results.push({
            slide_index: Number(failedSlide?.slide_index ?? -1),
            archetype: String(failedSlide?.archetype ?? 'unknown'),
            image_url: null,
            prompt_used: '',
            error: errMsg,
          })
        }
      }

      if (batchIdx < batches.length - 1) {
        await new Promise((r) => setTimeout(r, 1200))
      }
    }

    return res.json({ images: results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Carousel image generation failed:', message)
    return res.status(500).json({ error: message })
  }
}
