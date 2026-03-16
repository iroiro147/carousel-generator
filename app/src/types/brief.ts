import type { ThemeId, CarouselFormat } from './theme'

export type GoalKey =
  | 'shift_belief' | 'build_authority' | 'educate_explain'
  | 'product_awareness' | 'emotional_connection'
  | 'strategic_narrative' | 'direct_response'

export type AudienceKey =
  | 'cold_consumer' | 'warm_consumer' | 'cold_b2b' | 'warm_b2b'
  | 'industry_peers' | 'institutional_investors'
  | 'board_executive' | 'product_technical'

export type ToneKey =
  | 'authoritative_confident' | 'provocative_challenging'
  | 'aspirational_elevated' | 'empathetic_human'
  | 'technical_precise' | 'heritage_institutional'
  | 'mythological_epic' | 'documentary_real'

export type ContentCategoryKey =
  | 'product_feature' | 'market_analysis' | 'customer_story'
  | 'institutional_narrative' | 'technical_explanation'
  | 'opinion_argument' | 'industry_trend' | 'event_milestone'
  | 'cross_border_global' | 'security_trust'

export type FormatPreferenceKey = 'engine_decides' | 'prefer_short' | 'prefer_long'

export interface Brief {
  brief_id: string
  created_at: string
  user_id?: string

  // Section 1
  topic: string
  goal: GoalKey
  claim: string

  // Section 2
  audience: AudienceKey
  tone: [ToneKey] | [ToneKey, ToneKey]

  // Section 3
  brand_name: string
  brand_color: string | null
  brand_color_hex?: string | null
  content_notes: string | null

  // Section 4
  content_category: ContentCategoryKey
  format_preference: FormatPreferenceKey

  // Engine outputs
  rubric_scores?: RubricScores
  recommended_theme?: ThemeId
  confidence?: ConfidenceLevel
  gate_results?: GateResults
  selected_theme?: ThemeId
  format?: CarouselFormat
}

export interface RubricScores {
  dark_museum: number
  nyt_opinion: number
  sic_toile: number
}

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW'

export interface GateResults {
  nyt_opinion: 'passed' | 'failed' | 'soft_fail'
}
