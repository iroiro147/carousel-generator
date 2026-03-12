import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { generateImage, bufferToDataURI } from '../_lib/providers/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const coverVariantsData = JSON.parse(
  readFileSync(join(__dirname, '../_lib/data/cover_variants_data.json'), 'utf-8')
) as { themes: Record<string, { variants: Record<string, unknown> }> }

interface AngleDefinition {
  angle_name: string
  angle_description: string
  composition_mode?: string
  object_state_preference?: string
  headline_structure: string
  headline_example?: string
  illustration_mode?: string
  scene_domain?: string
  pov_preference?: string
  wit_layer?: string
  figure_type?: string
  scene_rule?: string
  scene_preference?: string
  propagation_metadata: Record<string, unknown>
}

interface BriefPayload {
  topic: string
  claim: string
  brand_name: string
  brand_color?: string | null
  content_notes?: string | null
}

function getCoverAngles(themeId: string): Array<AngleDefinition & { angle_key: string }> {
  const themes = coverVariantsData.themes as Record<
    string,
    { variants: Record<string, AngleDefinition> }
  >
  const theme = themes[themeId]
  if (!theme) throw new Error(`Unknown theme: ${themeId}`)

  return Object.entries(theme.variants).map(([key, angle]) => ({
    ...angle,
    angle_key: key,
  }))
}

function buildHeadline(angle: AngleDefinition, brief: BriefPayload): string {
  const topic = brief.topic.trim()
  const brandName = brief.brand_name.trim()
  const claim = brief.claim.trim()
  const topicWords = topic.split(/\s+/).filter((w) => w.length > 3)
  const topicNoun = topicWords[0] ?? topic.split(/\s+/)[0] ?? 'Product'
  const shortClaim = claim.split(/[.!?]/)[0]?.trim() ?? claim.slice(0, 60)
  const structure = angle.headline_structure

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
  return angle.headline_example ?? `${brandName}. ${shortClaim}.`
}

function buildCoverPrompt(
  angle: AngleDefinition & { angle_key: string },
  brief: BriefPayload,
  themeId: string,
): string {
  const topicWords = brief.topic.trim().split(/\s+/).filter((w) => w.length > 3)
  const topicNoun = topicWords[0] ?? brief.topic.trim().split(/\s+/)[0] ?? 'object'

  switch (themeId) {
    case 'dark_museum':
      return `${topicNoun} rendered as a luxury museum specimen — precision-machined metal and glass, ${angle.object_state_preference ?? 'gleaming'} state, suspended in absolute darkness with a single overhead spotlight creating a precise cone of warm light (3200K), deep shadow falling directly below, photorealistic 3D render, ultra-high detail, composition mode: ${angle.composition_mode}`
    case 'nyt_opinion':
      return `Flat vector editorial illustration of ${topicNoun} as a commentary — bold saturated colors, clean confident outlines, flat color fills only, mid-century editorial illustration aesthetic, centered scene, white background`
    case 'sic_toile':
      return `Single-color copper-plate engraving illustration of ${topicNoun} — rendered entirely in indigo (#2A2ECD), fine parallel hatching, 18th-century French engraving aesthetic, ${angle.scene_preference ?? 'seven or more figures'}`
    default:
      return `Professional illustration of ${topicNoun} for ${themeId} theme, high quality, editorial aesthetic`
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { brief, theme_id } = req.body as { brief: BriefPayload; theme_id: string }

    if (!brief || !theme_id) {
      return res.status(400).json({ error: 'Missing required fields: brief, theme_id' })
    }

    const angles = getCoverAngles(theme_id)
    const prompts = angles.map((angle) => buildCoverPrompt(angle, brief, theme_id))

    const results = await Promise.allSettled(
      prompts.map((prompt) => generateImage(prompt, theme_id)),
    )

    const variants = angles.map((angle, i) => {
      const result = results[i]
      const succeeded = result.status === 'fulfilled'

      return {
        variant_id: randomUUID(),
        brief_id: 'current',
        theme: theme_id,
        angle_key: angle.angle_key,
        angle_name: angle.angle_name,
        angle_description: angle.angle_description,
        cover_slide: {
          composition_mode: angle.composition_mode ?? 'centered',
          headline: buildHeadline(angle, brief),
          headline_size: 48,
          text_position: 'center',
          image_prompt: prompts[i],
          thumbnail_url: succeeded ? bufferToDataURI(result.value) : null,
        },
        propagation_metadata: angle.propagation_metadata,
        generation_status: succeeded ? ('complete' as const) : ('failed' as const),
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
