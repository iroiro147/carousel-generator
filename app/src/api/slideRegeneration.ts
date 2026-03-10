// ─── Single-Slide Regeneration API ──────────────────────────────────────────
// Calls POST /api/content/regenerate-slide with brief context + neighboring slides

import type { Brief } from '../types/brief'
import type { ThemeId } from '../types/theme'

export interface RegenerateSlideParams {
  brief: Partial<Brief>
  theme_id: ThemeId
  archetype: string
  prev_headline: string | null
  next_headline: string | null
}

export interface RegenerateSlideResult {
  headline: string
  body_text: string | null
  dialogue: string | null
}

/**
 * Regenerates text for a single slide via the LLM backend.
 * Provides neighboring slide context (prev/next headlines) for coherence.
 */
export async function regenerateSlideText(
  params: RegenerateSlideParams,
): Promise<RegenerateSlideResult> {
  const response = await fetch('/api/content/regenerate-slide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brief: {
        topic: params.brief.topic ?? '',
        brand_name: params.brief.brand_name ?? '',
        claim: params.brief.claim ?? '',
      },
      theme_id: params.theme_id,
      archetype: params.archetype,
      prev_headline: params.prev_headline,
      next_headline: params.next_headline,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error ?? `Regeneration failed (${response.status})`)
  }

  return response.json()
}

/**
 * Regenerates a cover illustration for NYT Opinion short-form.
 * Returns new image URL from the image generation endpoint.
 */
export async function regenerateCoverImage(
  themeId: ThemeId,
  objectName: string,
): Promise<{ image_url: string; prompt_used: string }> {
  const response = await fetch('/api/images/generate-slide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      theme_id: themeId,
      object_name: objectName,
      object_state: 'editorial illustration',
      object_domain: 'opinion',
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error ?? `Image generation failed (${response.status})`)
  }

  return response.json()
}
