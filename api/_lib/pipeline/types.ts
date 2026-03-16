// ─── Pipeline Types ──────────────────────────────────────────────────────────
// Shared interfaces for the two-stage generation pipeline.

// ─── Style Pack ──────────────────────────────────────────────────────────────

export interface AngleDefinition {
  id: string
  label: string
  description: string
  headline_seed: string
}

export interface SlideArchetype {
  key: string
  label: string
  has_image: boolean
}

export interface CropSpec {
  type: 'full_bleed' | 'right_strip' | 'corner_accent' | 'vignette' | 'none'
  /** Percentage of slide width, e.g. 0.28 for 28% */
  widthFraction?: number
}

export interface Tokens {
  [key: string]: string | number | boolean | Tokens
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface VisualDecision {
  /** Raw XML from Stage 1, preserved for logging */
  rawXml: string
  /** Style-specific parsed fields */
  [key: string]: unknown
}

export interface StylePack {
  id: string
  name: string
  status: 'active' | 'stub'

  // Generation
  maxSlides: number
  imagesPerCarousel: 'per-slide' | 'cover-only' | 'conditional'
  stage1Model: string
  stage2ModelPrimary: string
  stage2ModelFallback: string

  // Layout
  slideWidth: number
  slideHeight: number
  aspectRatio: string
  imageAspectRatio: string

  // Content
  angles: AngleDefinition[]
  slideRouter: SlideArchetype[]
  cropSpecs?: Record<string, CropSpec>

  // Pipeline functions
  stage1SystemPrompt: string
  parseVisualDecision: (xml: string) => VisualDecision
  validateVisualDecision: (decision: VisualDecision) => ValidationResult
  buildStage2Prompt: (decision: VisualDecision, tokens: Tokens) => string

  // Tokens
  tokens: Tokens
}

// ─── Generation Result ───────────────────────────────────────────────────────

export interface GenerationResult {
  imageBase64: string
  visualDecision: VisualDecision
  stage2Prompt: string
  provider: string
  headline: string
  mimeType: 'image/jpeg' | 'image/png'
}

export interface GenerationError {
  error: true
  stage: 'stage1' | 'stage2' | 'validation'
  message: string
  attempts?: number
}
