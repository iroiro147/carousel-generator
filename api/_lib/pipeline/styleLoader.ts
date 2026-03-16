// ─── Style Loader ────────────────────────────────────────────────────────────
// Loads a style pack by ID from the /styles/ directory.
// Adding a new style = adding a directory. Zero changes to this file.

import type { StylePack } from './types.js'

const styleCache = new Map<string, StylePack>()

/**
 * Load a style pack by ID. Caches after first load.
 * Throws if the style doesn't exist or is misconfigured.
 */
export async function loadStyle(styleId: string): Promise<StylePack> {
  const cached = styleCache.get(styleId)
  if (cached) return cached

  try {
    // Dynamic import from /styles/{id}/config.ts
    // Each config.ts exports a default StylePack
    const mod = await import(`../../../styles/${styleId}/config.js`)
    const pack: StylePack = mod.default

    if (!pack.id || pack.id !== styleId) {
      throw new Error(`Style pack "${styleId}" has mismatched id: "${pack.id}"`)
    }

    styleCache.set(styleId, pack)
    return pack
  } catch (err) {
    if (err instanceof Error && err.message.includes('mismatched id')) throw err
    throw new Error(
      `Style pack "${styleId}" not found or failed to load: ${err instanceof Error ? err.message : err}`,
    )
  }
}

/**
 * Clear cached style packs (useful for testing).
 */
export function clearStyleCache(): void {
  styleCache.clear()
}
