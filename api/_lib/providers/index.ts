import { callGPTImage, isOpenAIAvailable } from './openai.js'

export type ImageModel = 'gpt-image-1.5' | 'nano-banana-2'

// Lazy-load Google provider — only imported when needed.
async function loadGoogleProvider() {
  const mod = await import('./google.js')
  return { callNanoBanana: mod.callNanoBanana, isGoogleAvailable: mod.isGoogleAvailable }
}

function isGoogleKeySet(): boolean {
  return !!process.env.GOOGLE_API_KEY
}

/**
 * Generate an image using the specified model.
 * Default: gpt-image-1.5 (OpenAI).
 * Fallback: if preferred provider key is missing, tries the other.
 */
export async function generateImage(
  prompt: string,
  themeId: string,
  model: ImageModel = 'gpt-image-1.5',
): Promise<Buffer> {
  console.log(`[providers] generateImage called — model: ${model}, theme: ${themeId}`)

  if (model === 'gpt-image-1.5') {
    // Primary: OpenAI GPT-Image-1.5
    if (isOpenAIAvailable()) {
      try {
        const result = await callGPTImage(prompt)
        return result.buffer
      } catch (err) {
        console.warn(`[providers] OpenAI failed: ${err instanceof Error ? err.message : err}`)
        // Fall through to Google fallback
      }
    }
    // Fallback: Nano Banana 2
    if (isGoogleKeySet()) {
      console.warn(`[providers] Falling back to Nano Banana 2 for ${themeId}`)
      const { callNanoBanana } = await loadGoogleProvider()
      const result = await callNanoBanana(prompt)
      return result.buffer
    }
    throw new Error('No image provider available (need OPENAI_API_KEY or GOOGLE_API_KEY)')
  }

  if (model === 'nano-banana-2') {
    // Primary: Google Nano Banana 2
    if (isGoogleKeySet()) {
      try {
        const { callNanoBanana } = await loadGoogleProvider()
        const result = await callNanoBanana(prompt)
        return result.buffer
      } catch (err) {
        console.warn(`[providers] Nano Banana 2 failed: ${err instanceof Error ? err.message : err}`)
        // Fall through to OpenAI fallback
      }
    }
    // Fallback: OpenAI
    if (isOpenAIAvailable()) {
      console.warn(`[providers] Falling back to OpenAI for ${themeId}`)
      const result = await callGPTImage(prompt)
      return result.buffer
    }
    throw new Error('No image provider available (need GOOGLE_API_KEY or OPENAI_API_KEY)')
  }

  throw new Error(`Unknown image model: ${model}`)
}

/**
 * Convert an image buffer to a data URI for passing to the frontend.
 */
export function bufferToDataURI(buffer: Buffer, mimeType = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

// Re-export individual providers
export { callClaude, isAnthropicAvailable } from './anthropic.js'
export { callGPTImage, isOpenAIAvailable } from './openai.js'
