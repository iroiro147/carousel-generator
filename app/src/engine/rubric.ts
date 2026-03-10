import type { Brief, RubricScores, ConfidenceLevel, GateResults } from '../types/brief'
import type { ThemeId } from '../types/theme'
import rubricData from '../data/theme_suggestion_rubric.json'

// ─── Types ────────────────────────────────────────────────────────────────
export interface RubricResult {
  scores: RubricScores
  recommended_theme: ThemeId
  confidence: ConfidenceLevel
  alternative_theme: ThemeId | null
  gate_results: GateResults
  eliminated_themes: ThemeId[]
  score_explanation: string
}

type ThemeScoreMap = Partial<Record<ThemeId, number>>

const ALL_THEMES: ThemeId[] = [
  'dark_museum', 'product_elevation', 'experience_capture',
  'nyt_opinion', 'sic_toile', 'name_archaeology',
]

// ─── Tension language detection ───────────────────────────────────────────
const TENSION_MARKERS = [
  'but', 'actually', 'despite', 'the problem is', 'most people think',
  'the truth is', "isn't", "aren't", 'wrong', 'myth', 'hidden',
  'overlooked', 'contrary', 'misunderstood',
]

function hasTensionLanguage(claim: string): boolean {
  const lower = claim.toLowerCase()
  return TENSION_MARKERS.some((m) => lower.includes(m))
}

// ─── Mythology keywords for brand name check ─────────────────────────────
const MYTH_KEYWORDS_DIRECT = [
  'prometheus', 'olympus', 'atlas', 'titan', 'apollo', 'robin', 'odyssey',
  'navigator', 'pioneer', 'vanguard', 'oracle', 'mercury', 'diana',
  'amazon', 'sahara', 'patagonia', 'athena', 'hermes', 'zeus',
  'phoenix', 'sphinx', 'viking', 'ares', 'poseidon',
]

const MYTH_ROOTS = [
  'jus', 'just', 'justice', 'forge', 'quest', 'ark', 'arch', 'neo', 'gen',
  'sol', 'luna', 'nova', 'terra', 'astra', 'aqua', 'ignis', 'myth',
  'hero', 'sage', 'royal', 'crown', 'throne', 'sentinel',
]

const ARCHETYPE_CATEGORIES = [
  'explorer', 'builder', 'outlaw', 'sage', 'hero', 'trickster',
  'creator', 'sovereign',
]

function getBrandNameMythScore(brandName: string): 'strong' | 'weak' | 'none' {
  const lower = brandName.toLowerCase().trim()
  if (!lower) return 'none'
  const words = lower.split(/\s+/)
  if (words.some((w) => MYTH_KEYWORDS_DIRECT.includes(w))) return 'strong'
  if (words.some((w) => ARCHETYPE_CATEGORIES.includes(w))) return 'strong'
  if (words.some((w) => MYTH_ROOTS.some((root) => w.includes(root)))) return 'weak'
  return 'none'
}

// ─── Goal key mapping (brief type keys → rubric JSON keys) ────────────────
const GOAL_KEY_MAP: Record<string, string> = {
  shift_belief: 'shift_belief_or_provoke',
  build_authority: 'build_authority_or_credibility',
  educate_explain: 'educate_or_explain',
  product_awareness: 'generate_product_awareness',
  emotional_connection: 'build_emotional_connection',
  strategic_narrative: 'establish_strategic_narrative',
  direct_response: 'drive_direct_response',
}

// ─── Audience key mapping ────────────────────────────────────────────────
const AUDIENCE_KEY_MAP: Record<string, string> = {
  cold_consumer: 'cold_consumer',
  warm_consumer: 'warm_consumer',
  cold_b2b: 'cold_b2b',
  warm_b2b: 'warm_b2b',
  industry_peers: 'industry_peers',
  institutional_investors: 'institutional_investors',
  board_executive: 'board_level_executive',
  product_technical: 'product_or_technical',
}

// ─── Content category key mapping ─────────────────────────────────────────
const CATEGORY_KEY_MAP: Record<string, string> = {
  product_feature: 'product_feature_or_capability',
  market_analysis: 'market_or_competitive_analysis',
  customer_story: 'customer_or_user_story',
  institutional_narrative: 'institutional_narrative',
  technical_explanation: 'technical_explanation',
  opinion_argument: 'opinion_or_argument',
  industry_trend: 'industry_trend_or_insight',
  event_milestone: 'event_or_milestone',
  cross_border_global: 'cross_border_or_global',
  security_trust: 'security_or_trust',
}

// ─── Helper: add scores to accumulator ────────────────────────────────────
function addScores(
  scores: RubricScores,
  additions: ThemeScoreMap | undefined,
  eliminated: Set<ThemeId>,
): void {
  if (!additions) return
  for (const [theme, pts] of Object.entries(additions)) {
    if (!eliminated.has(theme as ThemeId) && pts != null) {
      scores[theme as keyof RubricScores] += pts
    }
  }
}

// ─── Helper: merge max scores from multiple tone selections ───────────────
function mergeMaxScores(scoreSets: ThemeScoreMap[]): ThemeScoreMap {
  const result: ThemeScoreMap = {}
  for (const theme of ALL_THEMES) {
    const values = scoreSets
      .map((s) => s[theme] ?? 0)
      .filter((v) => v != null)
    if (values.length > 0) {
      result[theme] = Math.max(...values)
    }
  }
  return result
}

// ─── Helper: match keyword clusters ───────────────────────────────────────
function matchKeywordClusters(
  brief: Brief,
): Array<{ scores: ThemeScoreMap }> {
  const text = `${brief.topic} ${brief.claim} ${brief.content_notes ?? ''}`.toLowerCase()
  const clusters = (rubricData as any).scoring_passes.pass_5_keyword_signals.clusters as Record<
    string,
    { keywords: string[]; scores: ThemeScoreMap }
  >
  return Object.values(clusters).filter((cluster) =>
    cluster.keywords.some((kw) => text.includes(kw)),
  )
}

// ─── Pass 0: Gate checks ──────────────────────────────────────────────────
function runGates(
  brief: Brief,
  scores: RubricScores,
  eliminated: Set<ThemeId>,
): GateResults {
  const gateResults: GateResults = {
    name_archaeology: 'passed',
    nyt_opinion: 'passed',
  }

  // Gate 1: Name Archaeology
  const mythScore = getBrandNameMythScore(brief.brand_name)
  const topicHasMythKeywords = checkTopicForMyth(brief.topic)

  // A weak brand name match only passes the gate if the topic/goal supports
  // a mythological narrative (e.g. strategic narrative, heritage topic).
  // Per spec: "The name must carry a world, not just a word."
  const topicSupportsMyth = topicHasMythKeywords ||
    brief.goal === 'strategic_narrative' ||
    brief.tone.some((t) => t === 'heritage_institutional' || t === 'mythological_epic')

  if (mythScore === 'strong' || topicHasMythKeywords) {
    // Gate passes — add +4 bonus
    gateResults.name_archaeology = 'passed'
    scores.name_archaeology += 4
  } else if (mythScore === 'weak' && topicSupportsMyth) {
    // Weak match with supporting context — gate passes with smaller bonus
    gateResults.name_archaeology = 'bonus'
    scores.name_archaeology += 1
  } else {
    // No match, or weak match without supporting context — eliminate
    gateResults.name_archaeology = 'failed'
    eliminated.add('name_archaeology')
  }

  // Gate 2: NYT Opinion
  const hasTension = hasTensionLanguage(brief.claim)
  const goalIsArgument = brief.goal === 'shift_belief'

  if (hasTension && goalIsArgument) {
    gateResults.nyt_opinion = 'passed'
  } else if (hasTension || goalIsArgument) {
    gateResults.nyt_opinion = 'passed'
  } else {
    // Soft fail — apply penalty but don't eliminate
    gateResults.nyt_opinion = 'soft_fail'
    scores.nyt_opinion -= 3
  }

  return gateResults
}

// Check if topic contains exploration/discovery/mythology keywords
function checkTopicForMyth(topic: string): boolean {
  const lower = topic.toLowerCase()
  const mythTopicKeywords = [
    'myth', 'legend', 'ancient', 'heritage', 'odyssey', 'exploration',
    'discovery', 'voyage', 'navigation', 'pioneer', 'archetype',
    'prometheus', 'atlas', 'apollo', 'oracle', 'titan',
  ]
  return mythTopicKeywords.some((kw) => lower.includes(kw))
}

// ─── Pass 6: Brand name bonus ─────────────────────────────────────────────
function applyBrandNameBonus(
  brief: Brief,
  scores: RubricScores,
  eliminated: Set<ThemeId>,
): void {
  if (eliminated.has('name_archaeology')) return

  const mythScore = getBrandNameMythScore(brief.brand_name)
  if (mythScore === 'strong') {
    scores.name_archaeology += 3
  } else if (mythScore === 'weak') {
    scores.name_archaeology += 1
  }
  // 'none' → no additional bonus (gate should have already handled elimination)
}

// ─── Pass 7: Negative signals ─────────────────────────────────────────────
function applyNegativeSignals(
  brief: Brief,
  scores: RubricScores,
  eliminated: Set<ThemeId>,
): void {
  // 1. Cold audience + heritage/mythological tone
  if (
    brief.audience === 'cold_consumer' &&
    brief.tone.some((t) => t === 'heritage_institutional' || t === 'mythological_epic')
  ) {
    applyPenalty(scores, eliminated, { sic_toile: -4, name_archaeology: -2 })
  }

  // 2. Short brief — claim + notes combined < 200 chars
  const combinedLen = (brief.claim?.length ?? 0) + (brief.content_notes?.length ?? 0)
  if (combinedLen < 200) {
    applyPenalty(scores, eliminated, { sic_toile: -3, name_archaeology: -3, dark_museum: -2 })
  }

  // 3. Product demo primary — goal is product_awareness + category is product_feature
  if (brief.goal === 'product_awareness' && brief.content_category === 'product_feature') {
    applyPenalty(scores, eliminated, {
      sic_toile: -4, name_archaeology: -4, nyt_opinion: -3, experience_capture: -2,
    })
  }

  // 4. No narrative arc — goal is product_awareness + claim has no tension language
  if (brief.goal === 'product_awareness' && !hasTensionLanguage(brief.claim)) {
    applyPenalty(scores, eliminated, {
      name_archaeology: -5, experience_capture: -3, sic_toile: -2,
    })
  }

  // 5. NYT broadly agreeable — goal is shift_belief but claim has no tension
  if (brief.goal === 'shift_belief' && !hasTensionLanguage(brief.claim)) {
    applyPenalty(scores, eliminated, { nyt_opinion: -4 })
  }
}

function applyPenalty(
  scores: RubricScores,
  eliminated: Set<ThemeId>,
  penalties: ThemeScoreMap,
): void {
  for (const [theme, pts] of Object.entries(penalties)) {
    if (!eliminated.has(theme as ThemeId) && pts != null) {
      scores[theme as keyof RubricScores] += pts
    }
  }
}

// ─── Resolve final result ─────────────────────────────────────────────────
function resolveResult(
  scores: RubricScores,
  eliminated: Set<ThemeId>,
  gateResults: GateResults,
  brief: Brief,
): RubricResult {
  // Sort themes by score (descending), excluding eliminated
  const ranked = ALL_THEMES
    .filter((t) => !eliminated.has(t))
    .sort((a, b) => scores[b] - scores[a])

  let winner = ranked[0]
  const runnerUp = ranked[1] ?? null
  const gap = runnerUp ? scores[winner] - scores[runnerUp] : 999

  // Tie-break if within 3 points
  if (runnerUp && gap <= 3) {
    winner = applyTieBreak(winner, runnerUp, brief, scores)
  }

  // Confidence
  let confidence: ConfidenceLevel
  if (gap > 5) confidence = 'HIGH'
  else if (gap >= 2) confidence = 'MEDIUM'
  else confidence = 'LOW'

  // Alternative — show if confidence is MEDIUM or LOW
  const alternative = confidence !== 'HIGH' && runnerUp && runnerUp !== winner
    ? runnerUp
    : null

  // Explanation
  const explanation = generateExplanation(winner, brief)

  return {
    scores,
    recommended_theme: winner,
    confidence,
    alternative_theme: alternative,
    gate_results: gateResults,
    eliminated_themes: Array.from(eliminated),
    score_explanation: explanation,
  }
}

// ─── Tie-break logic ──────────────────────────────────────────────────────
function applyTieBreak(
  first: ThemeId,
  second: ThemeId,
  brief: Brief,
  scores: RubricScores,
): ThemeId {
  const passes = (rubricData as any).scoring_passes

  // Rule 1: Brief goal wins
  const goalKey = GOAL_KEY_MAP[brief.goal]
  const goalScores = passes.pass_1_brief_goal.goals[goalKey]?.scores as ThemeScoreMap | undefined
  if (goalScores) {
    const g1 = goalScores[first] ?? 0
    const g2 = goalScores[second] ?? 0
    if (g1 !== g2) return g1 > g2 ? first : second
  }

  // Rule 2: Audience specificity wins
  const audKey = AUDIENCE_KEY_MAP[brief.audience]
  const audScores = passes.pass_2_audience.audiences[audKey]?.scores as ThemeScoreMap | undefined
  if (audScores) {
    const a1 = audScores[first] ?? 0
    const a2 = audScores[second] ?? 0
    if (a1 !== a2) return a1 > a2 ? first : second
  }

  // Rule 3: NYT Opinion beats 14-slide in tie if genuine argument
  const hasTension = hasTensionLanguage(brief.claim)
  if (first === 'nyt_opinion' && hasTension) return first
  if (second === 'nyt_opinion' && hasTension) return second

  // Rule 4: Still tied — keep the one with higher total score
  return scores[first] >= scores[second] ? first : second
}

// ─── Score explanation ────────────────────────────────────────────────────
function generateExplanation(winner: ThemeId, brief: Brief): string {
  const themeNames: Record<ThemeId, string> = {
    dark_museum: 'Dark Museum',
    product_elevation: 'Product Elevation',
    experience_capture: 'Experience Capture',
    nyt_opinion: 'NYT Opinion',
    sic_toile: 'SIC Toile',
    name_archaeology: 'Name Archaeology',
  }

  const audienceLabels: Record<string, string> = {
    cold_consumer: 'cold consumer',
    warm_consumer: 'warm consumer',
    cold_b2b: 'cold B2B',
    warm_b2b: 'warm B2B',
    industry_peers: 'industry peer',
    institutional_investors: 'institutional investor',
    board_executive: 'board/executive',
    product_technical: 'product/technical',
  }

  const goalLabels: Record<string, string> = {
    shift_belief: 'belief-shifting',
    build_authority: 'authority-building',
    educate_explain: 'educational',
    product_awareness: 'product awareness',
    emotional_connection: 'emotional connection',
    strategic_narrative: 'strategic narrative',
    direct_response: 'direct response',
  }

  const aud = audienceLabels[brief.audience] ?? brief.audience
  const goal = goalLabels[brief.goal] ?? brief.goal
  const name = themeNames[winner]

  return `${aud.charAt(0).toUpperCase() + aud.slice(1)} audience, ${goal} goal, and topic keywords strongly matched ${name}.`
}

// ─── Main scoring function ────────────────────────────────────────────────
export function runRubric(brief: Brief): RubricResult {
  const scores: RubricScores = {
    dark_museum: 0,
    product_elevation: 0,
    experience_capture: 0,
    nyt_opinion: 0,
    sic_toile: 0,
    name_archaeology: 0,
  }

  const eliminated: Set<ThemeId> = new Set()

  // Pass 0: Topic Gates
  const gateResults = runGates(brief, scores, eliminated)

  // Pass 1: Brief Goal
  const passes = (rubricData as any).scoring_passes
  const goalKey = GOAL_KEY_MAP[brief.goal]
  if (goalKey && passes.pass_1_brief_goal.goals[goalKey]) {
    addScores(scores, passes.pass_1_brief_goal.goals[goalKey].scores, eliminated)
  }

  // Pass 2: Audience
  const audKey = AUDIENCE_KEY_MAP[brief.audience]
  if (audKey && passes.pass_2_audience.audiences[audKey]) {
    addScores(scores, passes.pass_2_audience.audiences[audKey].scores, eliminated)
  }

  // Pass 3: Tone (max of each selected tone — not average)
  const toneScores: ThemeScoreMap[] = brief.tone.map((t) => {
    const toneData = passes.pass_3_tone.tones[t]
    return (toneData?.scores ?? {}) as ThemeScoreMap
  })
  const maxTones = mergeMaxScores(toneScores)
  addScores(scores, maxTones, eliminated)

  // Pass 4: Content Category
  const catKey = CATEGORY_KEY_MAP[brief.content_category]
  if (catKey && passes.pass_4_content_category.categories[catKey]) {
    addScores(scores, passes.pass_4_content_category.categories[catKey].scores, eliminated)
  }

  // Pass 5: Keyword Signals (cumulative)
  const matchedClusters = matchKeywordClusters(brief)
  for (const cluster of matchedClusters) {
    addScores(scores, cluster.scores, eliminated)
  }

  // Pass 6: Brand Name Check
  applyBrandNameBonus(brief, scores, eliminated)

  // Pass 7: Negative Signals
  applyNegativeSignals(brief, scores, eliminated)

  // Resolve
  return resolveResult(scores, eliminated, gateResults, brief)
}
