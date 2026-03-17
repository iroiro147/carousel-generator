// POST /api/feedback/submit
// Logs user feedback (thumbs up/down) on generated cover variants.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServerSupabase } from '../_lib/supabase.js'

interface FeedbackPayload {
  variant_id: string
  style_id: string
  rating: 'up' | 'down'
  angle?: string
  brief_topic?: string
  comment?: string
  provider?: string
  model?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = req.body as FeedbackPayload

    if (!body.variant_id || !body.style_id || !body.rating) {
      return res.status(400).json({ error: 'Missing required fields: variant_id, style_id, rating' })
    }

    if (body.rating !== 'up' && body.rating !== 'down') {
      return res.status(400).json({ error: 'rating must be "up" or "down"' })
    }

    const supabase = getServerSupabase()
    if (!supabase) {
      // Supabase not configured — accept silently
      return res.json({ ok: true, stored: false })
    }

    const { error } = await supabase.from('generation_feedback').insert({
      variant_id: body.variant_id,
      style_id: body.style_id,
      angle: body.angle ?? null,
      brief_topic: body.brief_topic ?? null,
      rating: body.rating,
      comment: body.comment ?? null,
      provider: body.provider ?? null,
      model: body.model ?? null,
    })

    if (error) {
      console.warn(`[feedback] Insert failed: ${error.message}`)
      return res.json({ ok: true, stored: false })
    }

    return res.json({ ok: true, stored: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[feedback] Error:', message)
    return res.status(500).json({ error: message })
  }
}
