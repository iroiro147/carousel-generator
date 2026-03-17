// ─── Single Body Slide Image Generation ─────────────────────────────────────
// POST /api/images/generate-slide
// Routes through the style pack system (no more legacy promptBuilder switch-case).

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateImage, bufferToDataURI } from '../_lib/providers/index.js'
import { loadStyle } from '../_lib/pipeline/styleLoader.js'
import type { BodySlideParams } from '../_lib/pipeline/types.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { theme_id, ...slideParams } = req.body as BodySlideParams & { theme_id: string }

    if (!theme_id || !slideParams.object_name) {
      return res.status(400).json({ error: 'Missing required fields: theme_id, object_name' })
    }

    const stylePack = await loadStyle(theme_id)

    if (!stylePack.buildBodySlidePrompt) {
      return res.status(400).json({
        error: `Style pack "${theme_id}" does not support per-slide body image generation`,
      })
    }

    const prompt = stylePack.buildBodySlidePrompt(slideParams)
    const imageBuffer = await generateImage(prompt, theme_id)
    const dataURI = bufferToDataURI(imageBuffer)

    return res.json({ image_url: dataURI, prompt_used: prompt })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Slide image generation failed:', message)
    return res.status(500).json({ error: message })
  }
}
