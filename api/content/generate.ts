import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateLongFormContent } from '../_lib/content/longForm.js'
import { generateShortFormContent } from '../_lib/content/shortForm.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { brief, theme_id, archetype_sequence, propagation_metadata } = req.body

    if (!brief || !theme_id) {
      return res.status(400).json({ error: 'Missing required fields: brief, theme_id' })
    }

    const format = theme_id === 'nyt_opinion' ? 'short_form' : 'long_form'

    if (format === 'short_form') {
      const result = await generateShortFormContent(brief)
      return res.json(result)
    }

    if (!archetype_sequence || archetype_sequence.length === 0) {
      return res.status(400).json({ error: 'Long-form generation requires archetype_sequence' })
    }

    const result = await generateLongFormContent(
      brief,
      theme_id,
      archetype_sequence,
      propagation_metadata,
    )
    return res.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Content generation failed:', message)
    return res.status(500).json({ error: message })
  }
}
