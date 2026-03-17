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

    // Map style pack angle shape (id, label, description, headline_seed)
    // to client AngleDefinition shape (angle_key, angle_name, etc.)
    const mappedAngles = stylePack.angles.map((a: Record<string, unknown>) => ({
      angle_key: a.id,
      angle_name: a.label,
      angle_description: a.description,
      headline_structure: a.headline_seed,
      headline_example: a.headline_example ?? null,
      composition_mode: a.composition_mode ?? 'centered',
      object_state_preference: a.object_state_preference ?? null,
      object_selection_rule: a.object_selection_rule ?? null,
      rhetorical_register: a.rhetorical_register ?? null,
      illustration_mode: a.illustration_mode ?? null,
      illustration_rule: a.illustration_rule ?? null,
      scene_domain: a.scene_domain ?? null,
      pov_preference: a.pov_preference ?? null,
      scene_preference: a.scene_preference ?? null,
      propagation_metadata: a.propagation_metadata ?? {},
    }))

    return res.json({
      style_id: stylePack.id,
      style_name: stylePack.name,
      status: stylePack.status,
      angles: mappedAngles,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(404).json({ error: message })
  }
}
