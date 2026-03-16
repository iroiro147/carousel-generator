export type ImageModel = 'gpt-image-1.5' | 'nano-banana-2'

export interface CoverVariant {
  variant_id: string
  brief_id: string
  theme: string
  angle_key: string
  angle_name: string
  angle_description: string

  cover_slide: VariantCoverSlide
  propagation_metadata: PropagationMetadata

  generation_status: 'pending' | 'complete' | 'failed'
  selected: boolean
  created_at: string
  model?: ImageModel

  // Pipeline fields (Stage 1 output)
  visual_decision?: Record<string, unknown>
  provider?: string
}

export interface VariantCoverSlide {
  composition_mode: string
  object_domain?: string
  object_name?: string
  object_state?: string
  headline: string
  headline_size: number
  text_position: string
  object_position?: string
  image_prompt: string
  thumbnail_url?: string
  illustration_url?: string
  illustration_mode?: string
}

export interface PropagationMetadata {
  creative_angle: string
  narrative_frame: string
  body_slide_tone?: string
  object_domain_lock?: string
  headline_style?: string
  state_progression?: string[]
  scene_domain_arc?: string[]
  quote_structure_preference?: string[]
  wit_layer_consistency?: string
}
