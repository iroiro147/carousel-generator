import { callGPTImage, isOpenAIAvailable } from './openai.js'

// Theme → provider mapping
// OpenAI GPT Image: dark_museum, product_elevation, experience_capture
// Google Imagen 3: nyt_opinion, sic_toile, name_archaeology
// Fallback: if a provider's key is missing, try the other one.
type ThemeId = 'dark_museum' | 'product_elevation' | 'experience_capture'
  | 'nyt_opinion' | 'sic_toile' | 'name_archaeology'

const OPENAI_THEMES: ThemeId[] = ['dark_museum', 'product_elevation', 'experience_capture']
const GOOGLE_THEMES: ThemeId[] = ['nyt_opinion', 'sic_toile', 'name_archaeology']

// Lazy-load Google provider — only imported when a Google theme is actually requested.
// This prevents @google/genai from crashing the entire module at init time,
// which would kill OpenAI-only code paths too.
async function loadGoogleProvider() {
  const mod = await import('./google.js')
  return { callImagen: mod.callImagen, isGoogleAvailable: mod.isGoogleAvailable }
}

// Quick env check without loading the Google module
function isGoogleKeySet(): boolean {
  return !!process.env.GOOGLE_API_KEY
}

export async function generateImage(prompt: string, themeId: string): Promise<Buffer> {
  const wantsOpenAI = OPENAI_THEMES.includes(themeId as ThemeId)
  const wantsGoogle = GOOGLE_THEMES.includes(themeId as ThemeId)

  // Try preferred provider, fall back to the other if key is missing
  if (wantsOpenAI) {
    if (isOpenAIAvailable()) {
      const result = await callGPTImage(prompt)
      return result.buffer
    }
    // Fallback to Google (lazy-loaded)
    if (isGoogleKeySet()) {
      console.warn(`[providers] OpenAI key missing — falling back to Gemini for ${themeId}`)
      const { callImagen } = await loadGoogleProvider()
      const result = await callImagen(prompt) // default = PersonGeneration.ALLOW_ADULT
      return result.buffer
    }
    throw new Error('No image generation provider available (need OPENAI_API_KEY or GOOGLE_API_KEY)')
  }

  if (wantsGoogle) {
    if (isGoogleKeySet()) {
      const { callImagen } = await loadGoogleProvider()
      const result = await callImagen(prompt) // default = PersonGeneration.ALLOW_ADULT
      return result.buffer
    }
    // Fallback to OpenAI
    if (isOpenAIAvailable()) {
      console.warn(`[providers] Google key missing — falling back to OpenAI for ${themeId}`)
      const result = await callGPTImage(prompt)
      return result.buffer
    }
    throw new Error('No image generation provider available (need GOOGLE_API_KEY or OPENAI_API_KEY)')
  }

  throw new Error(`Unknown theme for image generation: ${themeId}`)
}

/**
 * Convert an image buffer to a data URI for passing to the frontend.
 */
export function bufferToDataURI(buffer: Buffer, mimeType = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

// Re-export individual providers (lazy — consumers must await import if needed)
export { callClaude, isAnthropicAvailable } from './anthropic.js'
export { callGPTImage, isOpenAIAvailable } from './openai.js'
