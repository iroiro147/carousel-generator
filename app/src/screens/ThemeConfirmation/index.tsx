import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBriefStore } from '../../store/briefStore'
import type { ThemeId } from '../../types/theme'

// ─── Theme display names ────────────────────────────────────────────────────
const THEME_NAMES: Record<ThemeId, string> = {
  dark_museum: 'Dark Museum',
  product_elevation: 'Product Elevation',
  experience_capture: 'Experience Capture',
  nyt_opinion: 'NYT Opinion',
  sic_toile: 'SIC Toile',
  name_archaeology: 'Name Archaeology',
}

const THEME_DESCRIPTIONS: Record<ThemeId, string> = {
  dark_museum: 'Near-black canvas, museum lighting, editorial luxury',
  product_elevation: 'Aspirational product showcase, conversion-focused',
  experience_capture: 'Reader-first storytelling, scroll-stopping recognition',
  nyt_opinion: 'Bold editorial statement, 4-slide argument format',
  sic_toile: 'Institutional heritage, copper-plate engraving aesthetic',
  name_archaeology: 'Brand as protagonist in historical/mythological narrative',
}

const ALL_THEMES: ThemeId[] = [
  'dark_museum', 'product_elevation', 'experience_capture',
  'nyt_opinion', 'sic_toile', 'name_archaeology',
]

// ─── Tradeoff text for winner/alternative pairs ──────────────────────────────
const TRADEOFFS: Record<string, string> = {
  // From spec worked examples
  'dark_museum|product_elevation':
    'Dark Museum treats the technology as timeless artifact — high authority. Product Elevation treats it as aspirational product — high conversion.',
  'product_elevation|dark_museum':
    'Product Elevation leads with aspiration and conversion. Dark Museum leads with authority and timelessness.',
  'experience_capture|product_elevation':
    'Experience Capture starts with the reader\'s frustration — recognition stops the scroll. Product Elevation starts with aspiration — desire drives the click.',
  'product_elevation|experience_capture':
    'Product Elevation leads with aspirational product framing. Experience Capture leads with the reader\'s lived frustration.',
  'sic_toile|name_archaeology':
    'SIC Toile positions the brand as a built institution. Name Archaeology positions it as protagonist in a larger historical pattern.',
  'name_archaeology|sic_toile':
    'Name Archaeology weaves the brand into historical narrative. SIC Toile frames it as established institutional authority.',
  'nyt_opinion|dark_museum':
    'NYT Opinion makes the argument as an editorial statement — 4 slides, shareable. Dark Museum makes the same argument through objects — educational, authoritative.',
  'dark_museum|nyt_opinion':
    'Dark Museum presents the argument through curated objects. NYT Opinion delivers it as a bold editorial statement.',
  // Additional common pairs
  'dark_museum|experience_capture':
    'Dark Museum frames through authority and artifacts. Experience Capture frames through the reader\'s own experience.',
  'experience_capture|dark_museum':
    'Experience Capture connects through recognition. Dark Museum connects through reverence.',
  'dark_museum|sic_toile':
    'Dark Museum uses contemporary luxury aesthetics. SIC Toile uses historical institutional weight.',
  'sic_toile|dark_museum':
    'SIC Toile brings institutional gravitas. Dark Museum brings editorial sophistication.',
  'nyt_opinion|experience_capture':
    'NYT Opinion argues a position directly. Experience Capture lets the reader discover the position through their own frustration.',
  'experience_capture|nyt_opinion':
    'Experience Capture builds empathy first. NYT Opinion leads with the argument.',
  'product_elevation|sic_toile':
    'Product Elevation drives conversion with aspirational framing. SIC Toile drives prestige with institutional weight.',
}

function getTradeoffText(winner: ThemeId, alternative: ThemeId): string {
  const key = `${winner}|${alternative}`
  if (TRADEOFFS[key]) return TRADEOFFS[key]
  return `Both themes work here — ${THEME_NAMES[winner]} emphasises visual storytelling, ${THEME_NAMES[alternative]} emphasises a different creative dimension.`
}

// ─── Gate failure tooltip text ───────────────────────────────────────────────
function getEliminatedReason(theme: ThemeId, gateResults: { name_archaeology: string; nyt_opinion: string }): string | null {
  if (theme === 'name_archaeology' && gateResults.name_archaeology === 'failed') {
    return "Brand name doesn't have mythological resonance."
  }
  if (theme === 'nyt_opinion' && gateResults.nyt_opinion === 'failed') {
    return 'Requires a genuine argument — this brief reads as broadly agreeable.'
  }
  return null
}

// ─── Confidence badge component ──────────────────────────────────────────────
function ConfidenceBadge({ level }: { level: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const styles = {
    HIGH: 'bg-green-100 text-green-700',
    MEDIUM: 'bg-amber-100 text-amber-700',
    LOW: 'bg-zinc-100 text-zinc-600',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[level]}`}>
      {level === 'LOW' ? 'Two strong options' : `${level} confidence`}
    </span>
  )
}

// ─── Toast component ─────────────────────────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-zinc-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-3">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function ThemeConfirmation() {
  const navigate = useNavigate()
  const { rubricResult, setSelectedTheme } = useBriefStore()
  const [toast, setToast] = useState<string | null>(null)

  // If no rubric result, redirect back
  if (!rubricResult) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted text-sm mb-3">No theme analysis found.</p>
          <button
            onClick={() => navigate('/')}
            className="text-accent text-sm font-medium hover:underline cursor-pointer"
          >
            ← Go back to brief
          </button>
        </div>
      </div>
    )
  }

  const {
    recommended_theme,
    confidence,
    score_explanation,
    alternative_theme,
    eliminated_themes,
    gate_results,
  } = rubricResult

  function handleSelectTheme(themeId: ThemeId) {
    // Check if eliminated
    if (eliminated_themes.includes(themeId)) {
      setToast("This theme isn't recommended for your brief")
      setTimeout(() => setToast(null), 3000)
      return
    }
    setSelectedTheme(themeId)
    navigate('/cover-variants')
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-[640px] mx-auto px-6 py-10 flex flex-col gap-6">
        {/* Back link */}
        <button
          onClick={() => navigate('/')}
          className="self-start text-sm text-muted hover:text-zinc-900 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span>←</span>
          <span>Edit brief</span>
        </button>

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Your Theme</h1>
          <p className="text-sm text-muted mt-1">
            The engine analysed your brief across 7 scoring dimensions.
          </p>
        </div>

        {/* ── Recommended theme card ─────────────────────────────────── */}
        <div className="bg-white rounded-xl border-2 border-accent p-5 flex flex-col gap-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-accent uppercase tracking-wide mb-1">
                Recommended
              </p>
              <h2 className="text-lg font-semibold text-zinc-900">
                {THEME_NAMES[recommended_theme]}
              </h2>
            </div>
            <ConfidenceBadge level={confidence} />
          </div>

          <p className="text-sm text-muted leading-relaxed">
            {score_explanation}
          </p>

          <p className="text-xs text-zinc-400">
            {THEME_DESCRIPTIONS[recommended_theme]}
          </p>

          <button
            onClick={() => handleSelectTheme(recommended_theme)}
            className="self-end mt-1 rounded-lg bg-accent text-white font-medium px-4 py-2 text-sm transition-all hover:bg-accent/90 cursor-pointer"
          >
            Use This →
          </button>
        </div>

        {/* ── Alternative theme card (MEDIUM / LOW only) ─────────────── */}
        {alternative_theme && (confidence === 'MEDIUM' || confidence === 'LOW') && (
          <div className="bg-white rounded-xl border border-border p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1">
                  Alternative
                </p>
                <h2 className="text-base font-semibold text-zinc-900">
                  {THEME_NAMES[alternative_theme]}
                </h2>
              </div>
            </div>

            <p className="text-sm text-muted leading-relaxed">
              {getTradeoffText(recommended_theme, alternative_theme)}
            </p>

            <p className="text-xs text-zinc-400">
              {THEME_DESCRIPTIONS[alternative_theme]}
            </p>

            <button
              onClick={() => handleSelectTheme(alternative_theme)}
              className="self-end mt-1 rounded-lg border border-accent text-accent font-medium px-4 py-2 text-sm transition-all hover:bg-accent/5 cursor-pointer"
            >
              Switch to this
            </button>
          </div>
        )}

        {/* ── Manual theme selection ─────────────────────────────────── */}
        <div className="pt-2">
          <p className="text-sm text-muted mb-3">Or choose a different theme</p>
          <div className="grid grid-cols-3 gap-2">
            {ALL_THEMES.map((themeId) => {
              const isEliminated = eliminated_themes.includes(themeId)
              const isRecommended = themeId === recommended_theme
              const isAlternative = themeId === alternative_theme
              const eliminatedReason = isEliminated ? getEliminatedReason(themeId, gate_results) : null

              return (
                <div key={themeId} className="relative group">
                  <button
                    onClick={() => handleSelectTheme(themeId)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all text-xs font-medium cursor-pointer ${
                      isEliminated
                        ? 'opacity-40 cursor-not-allowed border-border bg-zinc-50 text-zinc-400'
                        : isRecommended
                          ? 'border-accent bg-blue-50 text-accent'
                          : isAlternative
                            ? 'border-accent/40 bg-white text-zinc-700 hover:border-accent'
                            : 'border-border bg-white text-zinc-700 hover:border-accent/50'
                    }`}
                  >
                    {THEME_NAMES[themeId]}
                  </button>

                  {/* Tooltip for eliminated themes */}
                  {isEliminated && eliminatedReason && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 px-3 py-2 bg-zinc-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center leading-relaxed">
                      {eliminatedReason}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
