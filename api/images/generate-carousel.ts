import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateImage, bufferToDataURI } from '../_lib/providers/index.js'
import { buildImagePrompt } from '../_lib/images/promptBuilder.js'

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

    const imageSlides = slides.filter(
      (s: { content_type?: string; archetype: string }) =>
        s.content_type !== 'text_only' && !TEXT_ONLY_ARCHETYPES.has(s.archetype),
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
        batch.map(async (slide: { slide_index: number; archetype: string; [key: string]: unknown }) => {
          const prompt = buildImagePrompt({ ...slide, theme_id } as Parameters<typeof buildImagePrompt>[0])
          const imageBuffer = await generateImage(prompt, theme_id)
          const dataURI = bufferToDataURI(imageBuffer)
          return {
            slide_index: slide.slide_index,
            archetype: slide.archetype,
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
          const slideIdx = batch[batchResults.indexOf(result)]
          results.push({
            slide_index: slideIdx?.slide_index ?? -1,
            archetype: slideIdx?.archetype ?? 'unknown',
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
