import { create } from 'zustand'
import type { ThemeId } from '../types/theme'
import type {
  Brief,
  GoalKey,
  AudienceKey,
  ToneKey,
  ContentCategoryKey,
  FormatPreferenceKey,
} from '../types/brief'
import { runRubric, type RubricResult } from '../engine/rubric'
import rubricData from '../data/theme_suggestion_rubric.json'

// ─── Tension language markers ──────────────────────────────────────────────
const TENSION_MARKERS = [
  'but', 'actually', 'despite', 'the problem is', 'most people think',
  'the truth is', "isn't", "aren't", 'wrong', 'myth', 'hidden',
  'overlooked', 'contrary', 'misunderstood',
]

// ─── Mythology / archetype keywords for brand name check ──────────────────
// Drawn from pass_5 myth_archetype cluster + pass_6 brand name check spec
const MYTH_KEYWORDS_DIRECT = [
  'prometheus', 'olympus', 'atlas', 'titan', 'apollo', 'robin', 'odyssey',
  'navigator', 'pioneer', 'vanguard', 'oracle', 'mercury', 'diana',
  'amazon', 'sahara', 'patagonia', 'athena', 'hermes', 'zeus',
  'phoenix', 'sphinx', 'norse', 'viking', 'ares', 'poseidon',
]

const MYTH_ROOTS = [
  'jus', 'just', 'justice', 'forge', 'quest', 'ark', 'arch', 'neo', 'gen',
  'sol', 'luna', 'nova', 'terra', 'astra', 'aqua', 'ignis', 'myth',
  'hero', 'sage', 'titan', 'royal', 'crown', 'throne', 'sentinel',
]

const ARCHETYPE_CATEGORIES = [
  'explorer', 'builder', 'outlaw', 'sage', 'hero', 'trickster',
  'creator', 'sovereign',
]

// ─── Keyword clusters from rubric ─────────────────────────────────────────
type ClusterId = string
interface KeywordCluster {
  keywords: string[]
}

const keywordClusters: Record<ClusterId, KeywordCluster> =
  (rubricData as { scoring_passes: { pass_5_keyword_signals: { clusters: Record<ClusterId, KeywordCluster> } } })
    .scoring_passes.pass_5_keyword_signals.clusters

// ─── Store interface ──────────────────────────────────────────────────────
interface BriefStore {
  brief: Partial<Brief>

  // Bulk setter (for import)
  setBrief: (b: Partial<Brief>) => void

  // Setters
  setTopic: (v: string) => void
  setGoal: (v: GoalKey) => void
  setClaim: (v: string) => void
  setAudience: (v: AudienceKey) => void
  setTone: (v: ToneKey[]) => void
  setBrandName: (v: string) => void
  setBrandColor: (v: string | null) => void
  setContentNotes: (v: string | null) => void
  setContentCategory: (v: ContentCategoryKey) => void
  setFormatPreference: (v: FormatPreferenceKey) => void

  // Section completion
  isSection1Complete: () => boolean
  isSection2Complete: () => boolean
  isSection3Complete: () => boolean
  isSection4Complete: () => boolean
  isFormComplete: () => boolean

  // Derived signals
  hasTensionLanguage: () => boolean
  getKeywordMatches: () => string[]
  getBrandNameMythScore: () => 'strong' | 'weak' | 'none'

  // Rubric
  rubricResult: RubricResult | null
  runThemeRubric: () => void

  // Theme selection
  selectedTheme: ThemeId | null
  setSelectedTheme: (themeId: ThemeId) => void
}

export const useBriefStore = create<BriefStore>((set, get) => ({
  brief: {
    content_category: 'product_feature' as ContentCategoryKey,
    format_preference: 'engine_decides' as FormatPreferenceKey,
  },
  rubricResult: null,
  selectedTheme: null,

  // ── Bulk setter (for import) ─────────────────────────────────────────
  setBrief: (b) => set({ brief: b }),

  // ── Setters ──────────────────────────────────────────────────────────
  setTopic: (v) => set((s) => ({ brief: { ...s.brief, topic: v } })),
  setGoal: (v) => set((s) => ({ brief: { ...s.brief, goal: v } })),
  setClaim: (v) => set((s) => ({ brief: { ...s.brief, claim: v } })),
  setAudience: (v) => set((s) => ({ brief: { ...s.brief, audience: v } })),
  setTone: (v) =>
    set((s) => ({ brief: { ...s.brief, tone: v as Brief['tone'] } })),
  setBrandName: (v) => set((s) => ({ brief: { ...s.brief, brand_name: v } })),
  setBrandColor: (v) =>
    set((s) => ({ brief: { ...s.brief, brand_color: v } })),
  setContentNotes: (v) =>
    set((s) => ({ brief: { ...s.brief, content_notes: v } })),
  setContentCategory: (v) =>
    set((s) => ({ brief: { ...s.brief, content_category: v } })),
  setFormatPreference: (v) =>
    set((s) => ({ brief: { ...s.brief, format_preference: v } })),

  // ── Section completion ───────────────────────────────────────────────
  isSection1Complete: () => {
    const { topic, goal, claim } = get().brief
    return (
      (topic?.length ?? 0) >= 8 &&
      goal !== undefined &&
      goal !== null &&
      (claim?.length ?? 0) >= 20
    )
  },

  isSection2Complete: () => {
    const { audience, tone } = get().brief
    return (
      audience !== undefined &&
      audience !== null &&
      Array.isArray(tone) &&
      tone.length >= 1
    )
  },

  isSection3Complete: () => {
    const { brand_name } = get().brief
    return (brand_name?.length ?? 0) >= 1
  },

  isSection4Complete: () => {
    const { content_category, format_preference } = get().brief
    return (
      content_category !== undefined &&
      content_category !== null &&
      format_preference !== undefined &&
      format_preference !== null
    )
  },

  isFormComplete: () => {
    const store = get()
    return (
      store.isSection1Complete() &&
      store.isSection2Complete() &&
      store.isSection3Complete() &&
      store.isSection4Complete()
    )
  },

  // ── Derived signals ──────────────────────────────────────────────────
  hasTensionLanguage: () => {
    const claim = (get().brief.claim ?? '').toLowerCase()
    return TENSION_MARKERS.some((marker) => claim.includes(marker))
  },

  getKeywordMatches: () => {
    const { topic, claim } = get().brief
    const combined = `${topic ?? ''} ${claim ?? ''}`.toLowerCase()
    const tokens = combined.split(/\s+/)

    const matched: string[] = []
    for (const [clusterId, cluster] of Object.entries(keywordClusters)) {
      const hit = cluster.keywords.some(
        (kw) =>
          tokens.includes(kw) || combined.includes(kw)
      )
      if (hit) matched.push(clusterId)
    }
    return matched
  },

  getBrandNameMythScore: () => {
    const brandName = (get().brief.brand_name ?? '').toLowerCase().trim()
    if (!brandName) return 'none'

    const words = brandName.split(/\s+/)

    // Direct myth keyword match
    if (words.some((w) => MYTH_KEYWORDS_DIRECT.includes(w))) return 'strong'

    // Archetype category match
    if (words.some((w) => ARCHETYPE_CATEGORIES.includes(w))) return 'strong'

    // Root/weak match — check if any word's root maps to a mythological concept
    if (words.some((w) => MYTH_ROOTS.some((root) => w.includes(root)))) return 'weak'

    return 'none'
  },

  // ── Rubric ─────────────────────────────────────────────────────────
  runThemeRubric: () => {
    const { brief } = get()
    // Ensure all required fields are present before running
    if (!get().isFormComplete()) return
    const result = runRubric(brief as Brief)
    set({ rubricResult: result })
  },

  // ── Theme selection ────────────────────────────────────────────────
  setSelectedTheme: (themeId) => {
    set((s) => ({
      selectedTheme: themeId,
      brief: { ...s.brief, selected_theme: themeId },
    }))
  },
}))
