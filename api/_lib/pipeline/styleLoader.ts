// ─── Style Loader ────────────────────────────────────────────────────────────
// Loads a style pack by ID. Uses a static import map so Vercel can bundle
// all style pack files into the serverless function.
//
// To add a new style: add an import + entry to STYLE_MAP below.

import type { StylePack } from './types.js'

// Static imports — Vercel needs these to bundle the files
import darkMuseum from '../styles/dark-museum/config.js'
import nytOpinion from '../styles/nyt-opinion/config.js'
import sicToile from '../styles/sic-toile/config.js'
import dispatch from '../styles/dispatch/config.js'

const STYLE_MAP: Record<string, StylePack> = {
  dark_museum: darkMuseum,
  nyt_opinion: nytOpinion,
  sic_toile: sicToile,
  dispatch: dispatch,
}

const styleCache = new Map<string, StylePack>()

/**
 * Load a style pack by ID. Caches after first load.
 * Throws if the style doesn't exist or is misconfigured.
 */
export async function loadStyle(styleId: string): Promise<StylePack> {
  const cached = styleCache.get(styleId)
  if (cached) return cached

  const pack = STYLE_MAP[styleId]
  if (!pack) {
    throw new Error(`Style pack "${styleId}" not found`)
  }

  if (pack.id !== styleId) {
    throw new Error(`Style pack "${styleId}" has mismatched id: "${pack.id}"`)
  }

  styleCache.set(styleId, pack)
  return pack
}

/**
 * Clear cached style packs (useful for testing).
 */
export function clearStyleCache(): void {
  styleCache.clear()
}
