// POST /api/variants/generate
// Batch endpoint: generates all cover variants for a theme in parallel via the pipeline.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'crypto'
import type { ImageModel } from '../_lib/providers/index.js'
import { run as runPipeline } from '../_lib/pipeline/orchestrator.js'
import { loadStyle } from '../_lib/pipeline/styleLoader.js'

interface BriefPayload {
  topic: string
  claim: string
  brand_name: string
  brand_color?: string | null
  content_notes?: string | null
  [key: string]: unknown
}

function buildHeadline(
  angle: { headline_seed: string; label: string },
  brief: BriefPayload,
): string {
  const topic = (brief.topic ?? '').trim() || 'Product'
  const brandName = (brief.brand_name ?? '').trim() || 'Brand'
  const claim = (brief.claim ?? '').trim() || 'A better solution.'
  const topicWords = topic.split(/\s+/).filter((w) => w.length > 3)
  const topicNoun = topicWords[0] ?? topic.split(/\s+/)[0] ?? 'Product'
  const shortClaim = claim.split(/[.!?]/)[0]?.trim() ?? claim.slice(0, 60)
  const structure = angle.headline_seed

  if (structure.includes('[Object name]')) {
    return structure
      .replace('[Object name]', topicNoun)
      .replace('[Single declarative claim.]', shortClaim + '.')
  }
  if (structure.includes('[Old state]')) {
    return structure
      .replace('[Old state]', `The old ${topicNoun.toLowerCase()} fails`)
      .replace('[New state]', `${brandName} doesn't.`)
  }
  if (structure.includes('[Scope]')) {
    return [`Every ${topicNoun.toLowerCase()}`, 'Every device', 'Every market'].join('. ') + '.'
  }

  return `${brandName}. ${shortClaim}.`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { brief, theme_id, model } = req.body as {
      brief: BriefPayload
      theme_id: string
      model?: ImageModel
    }

    if (!brief || !theme_id) {
      return res.status(400).json({ error: 'Missing required fields: brief, theme_id' })
    }

    const imageModel = model ?? 'gpt-image-1.5'
    const style = await loadStyle(theme_id)
    const angles = style.angles

    console.log(`[generate] Batch: theme=${theme_id}, model=${imageModel}, angles=${angles.length}`)

    const results = await Promise.allSettled(
      angles.map(async (angle) => {
        const headline = buildHeadline(angle, brief)
        const ext = angle as unknown as Record<string, unknown>

        const result = await runPipeline({
          brief,
          styleId: theme_id,
          angle: angle.id,
          model: imageModel,
          headline,
          slideContent: `${brief.topic}. ${brief.claim}`,
          imageFocus: brief.topic,
        })

        if ('error' in result) {
          throw new Error(result.message)
        }

        return {
          variant_id: randomUUID(),
          brief_id: 'current',
          theme: theme_id,
          angle_key: angle.id,
          angle_name: angle.label,
          angle_description: angle.description,
          cover_slide: {
            composition_mode: (ext.composition_mode as string) ?? 'centered',
            headline: result.headline,
            headline_size: 48,
            text_position: 'center',
            image_prompt: result.stage2Prompt,
            thumbnail_url: result.imageBase64,
          },
          propagation_metadata: (ext.propagation_metadata as Record<string, unknown>) ?? {},
          generation_status: 'complete' as const,
          selected: false,
          created_at: new Date().toISOString(),
          visual_decision: result.visualDecision,
          provider: result.provider,
        }
      }),
    )

    const variants = results.map((result, i) => {
      if (result.status === 'fulfilled') {
        return result.value
      }
      // Failed — return a failed stub
      const angle = angles[i]
      const ext = angle as unknown as Record<string, unknown>
      return {
        variant_id: randomUUID(),
        brief_id: 'current',
        theme: theme_id,
        angle_key: angle.id,
        angle_name: angle.label,
        angle_description: angle.description,
        cover_slide: {
          composition_mode: (ext.composition_mode as string) ?? 'centered',
          headline: buildHeadline(angle, brief),
          headline_size: 48,
          text_position: 'center',
          image_prompt: null,
          thumbnail_url: null,
        },
        propagation_metadata: (ext.propagation_metadata as Record<string, unknown>) ?? {},
        generation_status: 'failed' as const,
        selected: false,
        created_at: new Date().toISOString(),
      }
    })

    return res.json({ variants })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Batch variant generation failed:', message)
    return res.status(500).json({ error: message })
  }
}
