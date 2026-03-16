// ─── Pipeline Orchestrator ───────────────────────────────────────────────────
// Two-stage pipeline: Stage 1 (Gemini reasoning) → Stage 2 (image generation).
//
// Timeout budget (Architecture Decision #2):
//   Stage 1: 15s per attempt, max 2 attempts (30s total)
//   Stage 2: 45s
//   Global backstop: 55s (within Vercel 60s maxDuration)
//
// ┌─ Stage 1 ─────────────────────────────────────────────────────────────┐
// │ analyzeContent → parseVisualDecision → validateVisualDecision         │
// │ If validation fails + attempt < 2: retry with error correction note   │
// │ If validation fails + attempt = 2: return structured error, STOP      │
// └───────────────────────────────────────────────────────────────────────┘
//        │
//        ▼
// ┌─ Stage 2 ─────────────────────────────────────────────────────────────┐
// │ buildStage2Prompt → generateImage (GPT primary, Nano Banana fallback) │
// └───────────────────────────────────────────────────────────────────────┘
//        │
//        ▼
// Log to Supabase (fire-and-forget) → Return GenerationResult

import { loadStyle } from './styleLoader.js'
import { analyzeContent } from './analyzeContent.js'
import { validate } from './xmlValidator.js'
import { buildStage2Prompt } from './stage2Builder.js'
import { generateImage, bufferToDataURI } from '../providers/index.js'
import { logGeneration } from './generationLogger.js'
import type { GenerationResult, GenerationError, VisualDecision } from './types.js'

const STAGE1_TIMEOUT_MS = 15_000
const STAGE1_MAX_ATTEMPTS = 2
const STAGE2_TIMEOUT_MS = 45_000
const GLOBAL_TIMEOUT_MS = 55_000

interface RunParams {
  brief: {
    topic: string
    claim?: string
    goal?: string
    audience?: string
    brand_name?: string
    [key: string]: unknown
  }
  styleId: string
  angle: string
  /** Override image model. Default: style pack's primary */
  model?: 'gpt-image-1.5' | 'nano-banana-2'
  /** Pre-built headline from generate-one.ts */
  headline: string
  /** Content for Stage 1 reasoning */
  slideContent: string
  imageFocus: string
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise.then(
      (val) => { clearTimeout(timer); resolve(val) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}

/**
 * Run the two-stage pipeline for a single image generation.
 */
export async function run(params: RunParams): Promise<GenerationResult | GenerationError> {
  const globalTimer = setTimeout(() => {}, GLOBAL_TIMEOUT_MS)
  const startTime = Date.now()

  try {
    // ── Load style pack ──────────────────────────────────────────────
    const stylePack = await loadStyle(params.styleId)

    if (stylePack.status === 'stub') {
      return { error: true, stage: 'stage1', message: `Style "${params.styleId}" is not yet active (stub)` }
    }

    // ── Stage 1: Gemini Flash reasoning ──────────────────────────────
    let xmlResponse: string = ''
    let decision: VisualDecision | null = null
    let stage1Error: string | null = null

    for (let attempt = 1; attempt <= STAGE1_MAX_ATTEMPTS; attempt++) {
      try {
        const correctionNote = attempt > 1 && stage1Error
          ? `\n\nPREVIOUS ATTEMPT FAILED VALIDATION: ${stage1Error}\nPlease fix the issues and try again.`
          : ''

        xmlResponse = await withTimeout(
          analyzeContent({
            topic: params.brief.topic,
            slideContent: params.slideContent + correctionNote,
            imageFocus: params.imageFocus,
            systemPrompt: stylePack.stage1SystemPrompt,
          }),
          STAGE1_TIMEOUT_MS,
          `Stage 1 attempt ${attempt}`,
        )

        decision = stylePack.parseVisualDecision(xmlResponse)
        const validation = validate(decision, stylePack)

        if (validation.valid) {
          stage1Error = null
          break
        }

        stage1Error = validation.errors.join('; ')
        console.warn(`[orchestrator] Stage 1 validation failed (attempt ${attempt}): ${stage1Error}`)

        if (attempt === STAGE1_MAX_ATTEMPTS) {
          return {
            error: true,
            stage: 'validation',
            message: `Stage 1 validation failed after ${STAGE1_MAX_ATTEMPTS} attempts: ${stage1Error}`,
            attempts: STAGE1_MAX_ATTEMPTS,
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[orchestrator] Stage 1 attempt ${attempt} failed: ${msg}`)
        stage1Error = msg

        if (attempt === STAGE1_MAX_ATTEMPTS) {
          return {
            error: true,
            stage: 'stage1',
            message: `Stage 1 failed after ${STAGE1_MAX_ATTEMPTS} attempts: ${msg}`,
            attempts: STAGE1_MAX_ATTEMPTS,
          }
        }
      }
    }

    if (!decision) {
      return { error: true, stage: 'stage1', message: 'Stage 1 produced no decision' }
    }

    // Check global budget before proceeding to Stage 2
    const elapsed = Date.now() - startTime
    if (elapsed > GLOBAL_TIMEOUT_MS - 5_000) {
      return { error: true, stage: 'stage1', message: `Global timeout budget exhausted after Stage 1 (${elapsed}ms)` }
    }

    // ── Stage 2: Image generation ────────────────────────────────────
    const stage2Prompt = buildStage2Prompt(decision, stylePack)
    const model = params.model ?? (stylePack.stage2ModelPrimary as 'gpt-image-1.5' | 'nano-banana-2')

    let imageBuffer: Buffer
    let provider: string

    try {
      imageBuffer = await withTimeout(
        generateImage(stage2Prompt, params.styleId, model),
        STAGE2_TIMEOUT_MS,
        'Stage 2',
      )
      provider = model
    } catch (err) {
      // Fallback to secondary provider
      const fallbackModel = stylePack.stage2ModelFallback as 'gpt-image-1.5' | 'nano-banana-2'
      console.warn(`[orchestrator] Stage 2 primary (${model}) failed, falling back to ${fallbackModel}: ${err instanceof Error ? err.message : err}`)

      try {
        imageBuffer = await withTimeout(
          generateImage(stage2Prompt, params.styleId, fallbackModel),
          STAGE2_TIMEOUT_MS,
          'Stage 2 fallback',
        )
        provider = fallbackModel
      } catch (fallbackErr) {
        return {
          error: true,
          stage: 'stage2',
          message: `Both providers failed. Primary: ${err instanceof Error ? err.message : err}. Fallback: ${fallbackErr instanceof Error ? fallbackErr.message : fallbackErr}`,
        }
      }
    }

    const mimeType = 'image/jpeg' as const
    const imageBase64 = bufferToDataURI(imageBuffer, mimeType)

    // Size warning (Architecture Decision #14)
    const sizeBytes = imageBuffer.length
    if (sizeBytes > 2 * 1024 * 1024) {
      console.warn(`[orchestrator] Image exceeds 2MB after JPEG compression: ${(sizeBytes / 1024 / 1024).toFixed(1)}MB`)
    }

    const result: GenerationResult = {
      imageBase64,
      visualDecision: decision,
      stage2Prompt,
      provider,
      headline: params.headline,
      mimeType,
    }

    // ── Log to Supabase (fire-and-forget) ────────────────────────────
    logGeneration({
      styleId: params.styleId,
      angle: params.angle,
      brief: params.brief,
      visualDecisionXml: xmlResponse,
      stage2Prompt,
      provider,
      durationMs: Date.now() - startTime,
    }).catch((err) => {
      console.warn(`[orchestrator] Supabase logging failed (non-fatal): ${err instanceof Error ? err.message : err}`)
    })

    return result
  } finally {
    clearTimeout(globalTimer)
  }
}
