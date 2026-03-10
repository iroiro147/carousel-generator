import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateImage, bufferToDataURI } from '../_lib/providers/index.js'
import { buildImagePrompt } from '../_lib/images/promptBuilder.js'
import type { PromptParams } from '../_lib/images/promptBuilder.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const params = req.body as PromptParams

    if (!params.theme_id || !params.object_name) {
      return res.status(400).json({ error: 'Missing required fields: theme_id, object_name' })
    }

    const prompt = buildImagePrompt(params)
    const imageBuffer = await generateImage(prompt, params.theme_id)
    const dataURI = bufferToDataURI(imageBuffer)

    return res.json({ image_url: dataURI, prompt_used: prompt })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Slide image generation failed:', message)
    return res.status(500).json({ error: message })
  }
}
