import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'crypto'
import { generateImage, bufferToDataURI } from '../_lib/providers/index.js'
import coverVariantsData from '../_lib/data/cover_variants_data.json' with { type: 'json' }

interface AngleDefinition {
  angle_name: string
  angle_description: string
  composition_mode?: string
  object_state_preference?: string
  object_selection_rule?: string
  headline_structure: string
  headline_example?: string
  rhetorical_register?: string
  illustration_mode?: string
  illustration_rule?: string
  scene_domain?: string
  pov_preference?: string
  dialogue_pool?: string
  overlay_pattern?: string
  wit_layer?: string
  figure_type?: string
  scene_rule?: string
  scene_preference?: string
  cartouche_style?: string
  propagation_metadata: Record<string, unknown>
}

interface BriefPayload {
  topic: string
  claim: string
  brand_name: string
  brand_color?: string | null
  content_notes?: string | null
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
    const scopes = [`Every ${topicNoun.toLowerCase()}`, 'Every device', 'Every market']
    return scopes.join('. ') + '.'
  }
  if (structure.includes('Before [state]')) {
    return structure
      .replace('Before [state]', `Before ${brandName}`)
      .replace('After, [better state]', `After, ${shortClaim.toLowerCase()}.`)
  }
  if (structure.includes('[Number/precision]')) {
    return structure
      .replace('[Number/precision]', `One ${topicNoun.toLowerCase()}`)
      .replace('[Absence]', 'No friction')
      .replace('[Absence]', 'No compromise.')
  }
  if (structure.includes('In [context]')) {
    return structure
      .replace('In [context]', `In every ${topicNoun.toLowerCase()}`)
      .replace('On [context]', `On every device.`)
  }
  if (structure.includes('[The moment named')) {
    return `The ${topicNoun.toLowerCase()} that almost didn't go through.`
  }
  if (structure.includes('[The unexpected speed')) {
    return `Faster than you expected ${topicNoun.toLowerCase()} to be.`
  }
  if (structure.includes('[The same story')) {
    return `What it looks like from the other side of ${topicNoun.toLowerCase()}.`
  }
  if (structure.includes('The [Unexpected Adj]')) {
    return `The Invisible Cost of the Familiar ${topicNoun}.`
  }
  if (structure.includes("What We Don't Understand")) {
    return structure.replace('[X]', topicNoun)
  }
  if (structure.includes('[Question]')) {
    return `Is Your ${topicNoun} Secure? ${shortClaim}.`
  }
  if (structure.includes('[Activity]')) {
    return structure
      .replace('[Activity]', topicNoun)
      .replace('[Historical claim.]', `The oldest infrastructure.`)
  }
  if (structure.includes('Built to [purpose]')) {
    return `Built to endure. As the great systems of ${topicNoun.toLowerCase()} were.`
  }
  if (structure.includes('[routes/territory]')) {
    return `The routes of ${topicNoun.toLowerCase()} are being drawn now.`
  }
  if (structure.includes("[Hero's act]")) {
    return `The ${topicNoun.toLowerCase()} given freely. The ${brandName} advantage.`
  }
  if (structure.includes('[animal archetype noun]')) {
    return `The fox always finds a way through ${topicNoun.toLowerCase()}.`
  }
  if (structure.includes('[beneficiary]')) {
    return `Every user. Every ${topicNoun.toLowerCase()}. Every market.`
  }

  return angle.headline_example ?? `${brandName}. ${shortClaim}.`
}

function buildCoverPrompt(
  angle: AngleDefinition & { angle_key: string },
  brief: BriefPayload,
  themeId: string,
): string {
  const topic = brief.topic.trim()
  const topicWords = topic.split(/\s+/).filter((w) => w.length > 3)
  const topicNoun = topicWords[0] ?? topic.split(/\s+/)[0] ?? 'object'

  switch (themeId) {
    case 'dark_museum':
      return `${topicNoun} rendered as a luxury museum specimen — precision-machined metal and glass, ${angle.object_state_preference ?? 'gleaming'} state, suspended in absolute darkness with a single overhead spotlight creating a precise cone of warm light (3200K), deep shadow falling directly below, micro-scratches visible on surface, photorealistic 3D render, studio product photography quality, no background elements, object positioned center-canvas, object fills 70% of frame, ultra-high detail, 8K render quality, composition mode: ${angle.composition_mode}`
    case 'product_elevation':
      return `${topicNoun} product in ${angle.object_state_preference ?? 'pristine'} state — luxury studio product photography, precision metal and glass surface with mirror-polished finish, three-point studio lighting with key light at 45° upper-left fill at 30% power right rim light creating thin white highlight on upper edge, pure platinum white #F8F5F0 background, shot on medium format camera 85mm equivalent f/4 shallow depth of field, ${angle.composition_mode} composition, commercial product photography, aspirational register, clean isolated product`
    case 'experience_capture':
      return `First-person POV photograph from ${angle.pov_preference ?? 'over shoulder screen visible'} — looking at ${topicNoun} interaction, practical light sources only: screen glow and ambient room light, silhouette of user visible, ${angle.scene_domain ?? 'digital'} environment, cinematic color grade, crushed blacks with color retained only in practical light sources, anonymous perspective, night, urban interior, documentary photography aesthetic, no faces visible, no studio lighting`
    case 'nyt_opinion': {
      const mode = angle.illustration_mode ?? 'editorial_cartoon'
      if (mode === 'editorial_cartoon') {
        return `Flat vector editorial illustration of ${topicNoun} as a commentary — bold saturated colors in a limited palette of 2-3 colors, clean confident outlines with no gradients, flat color fills only, mid-century editorial illustration aesthetic — Ben Shahn meets Push Pin Studios, centered scene composition, white or light background, black outlines throughout, no photographic elements, no gradients, no shadows — pure flat vector aesthetic`
      }
      if (mode === 'fine_art_expressive') {
        return `Drypoint etching of a figure contemplating ${topicNoun} — haunted emotional register, heavy texture throughout from drypoint burr, figure partially visible in shadow, muted palette dominated by warm ochre, atmospheric and expressive rather than precise, somber mood, the mark-making is the emotional content, museum-quality fine art print aesthetic`
      }
      return `Studio chiaroscuro photograph of ${topicNoun} as symbolic object — single dramatic light source from upper left, isolated against pure black background, strong specular highlight on edges, cinematic and slightly uncomfortable register, photorealistic, high material quality surface detail`
    }
    case 'sic_toile':
      return `Single-color copper-plate engraving illustration of a ${angle.scene_domain ?? 'commerce exchange'} scene related to ${topicNoun} — rendered entirely in indigo (#2A2ECD) on white/transparent ground, fine parallel hatching for mid-tone areas, cross-hatching for deep shadows, stippling for soft textures, clean confident contour lines, 18th-century French engraving aesthetic — Encyclopédie Diderot plates register, full narrative scene with ground plane and architectural setting, ${angle.scene_preference ?? 'seven or more figures'}, elaborate but legible at carousel scale, no color other than this single indigo — no fills, no gradients, pure line and mark work`
    case 'name_archaeology':
      return `19th century steel engraving of ${angle.figure_type ?? 'a mythological hero'} scene related to ${topicNoun} and ${brief.brand_name} — ${angle.wit_layer === 'full_anthropomorphized_animal' ? 'anthropomorphized animal in period clothing' : 'human figures in historically accurate costume'}, ${angle.scene_rule ?? 'defining moment'}, crosshatching technique for deep shadows, fine line work on figures, monochromatic sepia tint on aged parchment background, no color fills — pure line and mark work, high detail centered composition, encyclopedic plate aesthetic`
    default:
      return `Professional illustration of ${topicNoun} for ${themeId} theme, high quality, editorial aesthetic`
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { brief, theme_id, angle } = req.body as {
      brief: BriefPayload
      theme_id: string
      angle: AngleDefinition & { angle_key: string }
    }

    if (!brief || !theme_id || !angle) {
      return res.status(400).json({ error: 'Missing required fields: brief, theme_id, angle' })
    }

    const prompt = buildCoverPrompt(angle, brief, theme_id)
    const headline = buildHeadline(angle, brief)
    const imageBuffer = await generateImage(prompt, theme_id)
    const thumbnailUrl = bufferToDataURI(imageBuffer)

    const variant = {
      variant_id: randomUUID(),
      brief_id: 'current',
      theme: theme_id,
      angle_key: angle.angle_key,
      angle_name: angle.angle_name,
      angle_description: angle.angle_description,
      cover_slide: {
        composition_mode: angle.composition_mode ?? 'centered',
        headline,
        headline_size: 48,
        text_position: 'center',
        image_prompt: prompt,
        thumbnail_url: thumbnailUrl,
      },
      propagation_metadata: angle.propagation_metadata,
      generation_status: 'complete' as const,
      selected: false,
      created_at: new Date().toISOString(),
    }

    return res.json(variant)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Variant generation failed:', message)
    return res.status(500).json({ error: message })
  }
}
