import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Stub: returns hardcoded signature color.
  // Full implementation (image color analysis) is a Phase 3 polish item.
  res.json({
    signature_color: '#4A7FC1',
    tonal_variant: '#5A8FD1',
    passes_wcag_aa: true,
    contrast_ratio: 5.2,
  })
}
