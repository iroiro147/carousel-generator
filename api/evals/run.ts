import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runEvals } from '../_lib/pipeline/evalRunner.js'

const ACTIVE_STYLES = [
  'dark_museum',
  'nyt_opinion',
  'sic_toile',
  'radial_departure',
  'editorial_minimal',
  'dispatch',
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const styleParam = req.query.style as string | undefined

  if (styleParam) {
    if (!ACTIVE_STYLES.includes(styleParam)) {
      return res.status(400).json({ error: `Unknown style: ${styleParam}` })
    }
    const result = await runEvals(styleParam)
    return res.json(result)
  }

  // Run all styles
  const results = await Promise.all(ACTIVE_STYLES.map((id) => runEvals(id)))
  return res.json({
    totalStyles: results.length,
    totalCases: results.reduce((sum, r) => sum + r.totalCases, 0),
    totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
    totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
    results,
  })
}
