// ─── XML Parser Utilities ────────────────────────────────────────────────────
// Generic extraction helpers used by all style packs' parseVisualDecision().
// Ported verbatim from design-ai 2/demo/lib/xmlParser.ts.

/**
 * Extracts text content from an XML tag.
 * Returns empty string if tag not found.
 */
export function extractTag(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i')
  const match = xml.match(regex)
  return match ? match[1].trim() : ''
}

/**
 * Extracts all occurrences of a tag, returning each full match (including tags).
 * Useful for repeated blocks like <artifact>...</artifact>.
 */
export function extractAllTags(xml: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}>[\\s\\S]*?</${tagName}>`, 'gi')
  const matches = xml.match(regex)
  return matches ? matches : []
}

/**
 * Extracts the inner content of a wrapping block (e.g. <visual_decision>).
 * Returns the full string if the wrapper isn't found.
 */
export function extractBlock(xml: string, blockName: string): string {
  const regex = new RegExp(`<${blockName}>([\\s\\S]*?)</${blockName}>`, 'i')
  const match = xml.match(regex)
  return match ? match[0] : xml
}
