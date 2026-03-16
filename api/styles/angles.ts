// ─── GET /api/styles/angles?id=dark_museum ───────────────────────────────────
// Returns angle definitions for a style pack.
// Client fetches this instead of local JSON (Architecture Decision #3).

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { loadStyle } from '../_lib/pipeline/styleLoader.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const styleId = req.query.id as string | undefined

  if (!styleId) {
    return res.status(400).json({ error: 'Missing required query parameter: id' })
  }

  try {
    const stylePack = await loadStyle(styleId)
    return res.json({
      style_id: stylePack.id,
      style_name: stylePack.name,
      status: stylePack.status,
      angles: stylePack.angles,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(404).json({ error: message })
  }
}
