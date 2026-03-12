import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    node_version: process.version,
    env_keys: {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    },
    providers: {} as Record<string, unknown>,
  }

  // Test OpenAI module load
  try {
    const openai = await import('../_lib/providers/openai.js')
    results.providers = {
      ...(results.providers as Record<string, unknown>),
      openai: {
        module_loaded: true,
        available: openai.isOpenAIAvailable(),
      },
    }
  } catch (err) {
    results.providers = {
      ...(results.providers as Record<string, unknown>),
      openai: {
        module_loaded: false,
        error: err instanceof Error ? err.message : String(err),
      },
    }
  }

  // Test Google module load
  try {
    const google = await import('../_lib/providers/google.js')
    results.providers = {
      ...(results.providers as Record<string, unknown>),
      google: {
        module_loaded: true,
        available: google.isGoogleAvailable(),
      },
    }
  } catch (err) {
    results.providers = {
      ...(results.providers as Record<string, unknown>),
      google: {
        module_loaded: false,
        error: err instanceof Error ? err.message : String(err),
      },
    }
  }

  // Test Anthropic module load
  try {
    const anthropic = await import('../_lib/providers/anthropic.js')
    results.providers = {
      ...(results.providers as Record<string, unknown>),
      anthropic: {
        module_loaded: true,
        available: anthropic.isAnthropicAvailable(),
      },
    }
  } catch (err) {
    results.providers = {
      ...(results.providers as Record<string, unknown>),
      anthropic: {
        module_loaded: false,
        error: err instanceof Error ? err.message : String(err),
      },
    }
  }

  // Test the main index module load
  try {
    await import('../_lib/providers/index.js')
    results.index_module_loaded = true
  } catch (err) {
    results.index_module_loaded = false
    results.index_module_error = err instanceof Error ? err.message : String(err)
  }

  return res.json(results)
}
