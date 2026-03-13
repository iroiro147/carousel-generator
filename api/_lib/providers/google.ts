import { GoogleGenAI } from '@google/genai'

// Lazy-init: don't crash if GOOGLE_API_KEY is missing
let ai: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) throw new Error('GOOGLE_API_KEY is not set')
    ai = new GoogleGenAI({ apiKey })
  }
  return ai
}

export function isGoogleAvailable(): boolean {
  return !!process.env.GOOGLE_API_KEY
}

export interface GeneratedImage {
  buffer: Buffer
  provider: 'google_nano_banana'
  model: string
}

/**
 * Generate an image using Google Nano Banana 2 (Gemini 3.1 Flash Image).
 * Uses the generateContent API (not the deprecated generateImages API).
 */
export async function callNanoBanana(prompt: string): Promise<GeneratedImage> {
  const response = await getClient().models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: prompt,
    config: {
      responseModalities: ['IMAGE'],
    },
  })

  // Extract image from response parts
  const candidates = response.candidates
  if (!candidates || candidates.length === 0) {
    throw new Error('Nano Banana 2 returned no candidates')
  }

  const parts = candidates[0].content?.parts
  if (!parts) {
    throw new Error('Nano Banana 2 returned no content parts')
  }

  // Find the image part (inlineData with image mime type)
  for (const part of parts) {
    if (part.inlineData?.data) {
      const buffer = Buffer.from(part.inlineData.data, 'base64')
      return { buffer, provider: 'google_nano_banana', model: 'gemini-3.1-flash-image-preview' }
    }
  }

  throw new Error('Nano Banana 2 returned no image data in response parts')
}
