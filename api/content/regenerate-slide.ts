import type { VercelRequest, VercelResponse } from '@vercel/node'
import { regenerateSingleSlide } from '../_lib/content/longForm.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { brief, theme_id, archetype, archetype_description, prev_headline, next_headline } =
      req.body

    if (!brief || !theme_id || !archetype) {
      return res.status(400).json({ error: 'Missing required fields: brief, theme_id, archetype' })
    }

    const result = await regenerateSingleSlide(
      brief,
      theme_id,
      archetype,
      archetype_description ?? archetype,
      prev_headline ?? null,
      next_headline ?? null,
    )

    return res.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Slide regeneration failed:', message)
    return res.status(500).json({ error: message })
  }
}
