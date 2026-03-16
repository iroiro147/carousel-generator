// ─── Dispatch Style Pack (Stub) ──────────────────────────────────────────────
// Placeholder for future Dispatch style. Not yet active.

import type { StylePack, VisualDecision, ValidationResult, Tokens } from '../../pipeline/types.js'

const dispatch: StylePack = {
  id: 'dispatch',
  name: 'Dispatch',
  status: 'stub',

  maxSlides: 14,
  imagesPerCarousel: 'per-slide',
  stage1Model: 'gemini-2.5-flash',
  stage2ModelPrimary: 'gpt-image-1.5',
  stage2ModelFallback: 'nano-banana-2',

  slideWidth: 1080,
  slideHeight: 1350,
  aspectRatio: '4:5',
  imageAspectRatio: '4:5',

  angles: [],
  slideRouter: [],

  stage1SystemPrompt: '',
  parseVisualDecision: (_xml: string): VisualDecision => {
    throw new Error('Dispatch style is not yet active')
  },
  validateVisualDecision: (_decision: VisualDecision): ValidationResult => {
    return { valid: false, errors: ['Dispatch style is not yet active'] }
  },
  buildStage2Prompt: (_decision: VisualDecision, _tokens: Tokens): string => {
    throw new Error('Dispatch style is not yet active')
  },

  tokens: {},
}

export default dispatch
