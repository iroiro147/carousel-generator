import Anthropic from '@anthropic-ai/sdk'

// Lazy-init: don't crash if ANTHROPIC_API_KEY is missing
let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
    client = new Anthropic({ apiKey })
  }
  return client
}

export function isAnthropicAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1024,
): Promise<string> {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })
  return (response.content[0] as { text: string }).text
}
