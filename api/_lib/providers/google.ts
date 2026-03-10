import { GoogleGenAI, PersonGeneration, SafetyFilterLevel } from '@google/genai'

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
  provider: 'google_imagen'
  model: string
}

export async function callImagen(
  prompt: string,
  personGeneration: PersonGeneration = PersonGeneration.ALLOW_ADULT,
): Promise<GeneratedImage> {
  const response = await getClient().models.generateImages({
    model: 'imagen-3.0-generate-002',
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/png',
      aspectRatio: '3:4',
      personGeneration,
      safetyFilterLevel: SafetyFilterLevel.BLOCK_ONLY_HIGH,
    },
  })

  const generatedImages = response.generatedImages
  if (!generatedImages || generatedImages.length === 0) {
    throw new Error('Imagen returned no images')
  }

  const imageData = generatedImages[0].image
  if (!imageData || !imageData.imageBytes) {
    throw new Error('Imagen returned no image bytes')
  }

  const buffer = Buffer.from(imageData.imageBytes, 'base64')

  return { buffer, provider: 'google_imagen', model: 'imagen-3.0-generate-002' }
}
