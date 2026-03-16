import OpenAI from 'openai'

// Lazy-init: don't crash if OPENAI_API_KEY is missing
let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
    client = new OpenAI({ apiKey })
  }
  return client
}

export function isOpenAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY
}

export interface GeneratedImage {
  buffer: Buffer
  provider: 'openai_gpt_image'
  model: string
}

export async function callGPTImage(prompt: string): Promise<GeneratedImage> {
  const response = await getClient().images.generate({
    model: 'gpt-image-1.5',
    prompt,
    n: 1,
    size: '1024x1536',
    quality: 'high',
    output_format: 'jpeg',
    response_format: 'b64_json',
  } as Parameters<OpenAI['images']['generate']>[0])

  if (!response.data || response.data.length === 0) {
    throw new Error('OpenAI returned no image data')
  }
  const b64 = response.data[0].b64_json!
  const buffer = Buffer.from(b64, 'base64')

  return { buffer, provider: 'openai_gpt_image', model: 'gpt-image-1.5' }
}
