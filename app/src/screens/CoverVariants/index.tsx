import { useEffect, useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCarouselStore } from '../../store/carouselStore'
import { useBriefStore } from '../../store/briefStore'
import { generateCoverVariants, retrySingleVariant } from '../../api/imageGen'
import { assembleLongFormCarousel } from '../../api/carousel'
import { assembleShortFormCarousel } from '../../api/carouselShortForm'
import type { Brief } from '../../types/brief'
import type { CoverVariant } from '../../types/variant'
import type { ThemeId } from '../../types/theme'

// ─── Assembly loading overlay ─────────────────────────────────────────────────
function AssemblyOverlay({ progress }: { progress: number }) {
  const phase =
    progress < 30
      ? 'Writing copy...'
      : progress < 90
        ? 'Generating images...'
        : 'Assembling slides...'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 px-8 max-w-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Building your carousel</h2>
        <p className="text-sm text-muted">{phase}</p>
        <div className="w-full h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-zinc-400">This takes 15–30 seconds</p>
      </div>
    </div>
  )
}

// ─── Variant Card component ──────────────────────────────────────────────────
function VariantCard({
  variant,
  isSelected,
  isDimmed,
  onSelect,
  onRetry,
}: {
  variant: CoverVariant
  isSelected: boolean
  isDimmed: boolean
  onSelect: () => void
  onRetry: () => void
}) {
  const isPending = variant.generation_status === 'pending'
  const isFailed = variant.generation_status === 'failed'
  const thumbnailUrl = variant.cover_slide.thumbnail_url

  return (
    <button
      type="button"
      onClick={isFailed ? undefined : onSelect}
      className={`group relative flex flex-col sm:flex-row md:flex-col rounded-xl border overflow-hidden transition-all duration-200 text-left cursor-pointer ${
        isSelected
          ? 'border-accent border-2 shadow-sm'
          : isFailed
            ? 'border-border bg-zinc-50'
            : 'border-border hover:border-accent/50'
      } ${isDimmed && !isSelected ? 'opacity-60' : 'opacity-100'}`}
    >
      {/* Thumbnail area — 16:20 ratio on desktop, fixed width on mobile */}
      <div
        className={`relative w-full sm:w-[140px] sm:shrink-0 md:w-full aspect-[16/20] sm:aspect-auto sm:h-full md:aspect-[16/20] md:h-auto overflow-hidden ${
          isFailed ? 'bg-zinc-200' : 'bg-zinc-100'
        }`}
      >
        {isPending ? (
          // Skeleton loading
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-100" />
        ) : isFailed ? (
          // Failed state
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
            <p className="text-xs text-zinc-400 text-center">This one didn't work</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRetry()
              }}
              className="text-xs font-medium text-accent hover:text-accent/80 transition-colors cursor-pointer"
            >
              Retry ↻
            </button>
          </div>
        ) : thumbnailUrl ? (
          // Real generated image
          <img
            src={thumbnailUrl}
            alt={variant.angle_name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
          />
        ) : (
          // Placeholder thumbnail (no image yet)
          <div className="absolute inset-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-[1.04]">
            <span className="text-sm font-medium text-zinc-400 text-center px-4">
              {variant.angle_name}
            </span>
          </div>
        )}
      </div>

      {/* Text area */}
      <div className="flex flex-col gap-1.5 p-4 flex-1">
        <h3 className="text-sm font-semibold text-zinc-900">
          {variant.angle_name}
        </h3>
        <p className="text-xs text-muted leading-relaxed line-clamp-2">
          {variant.angle_description}
        </p>
        {variant.cover_slide.headline && !isPending && !isFailed && (
          <p className="text-xs text-zinc-500 italic line-clamp-1 mt-0.5">
            &ldquo;{variant.cover_slide.headline}&rdquo;
          </p>
        )}
        {!isFailed && (
          <span
            className={`mt-auto pt-2 text-xs font-medium ${
              isSelected ? 'text-accent' : 'text-zinc-400 group-hover:text-accent'
            } transition-colors`}
          >
            {isSelected ? '✓ Selected' : 'Select'}
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function CoverVariants() {
  const navigate = useNavigate()
  const { selectedTheme, brief } = useBriefStore()
  const {
    variants,
    selectedVariantId,
    regenerationCount,
    variantsLoading,
    selectVariant,
    setVariantComplete,
    setVariantFailed,
    initVariantStubs,
    regenerateVariants,
    confirmVariant,
  } = useCarouselStore()

  const generationFired = useRef(false)

  const themeId = (selectedTheme ?? 'dark_museum') as ThemeId

  // ─── Fire generation on mount ──────────────────────────────────────────
  const fireGeneration = useCallback(() => {
    initVariantStubs(3)

    const { angles } = generateCoverVariants(brief, themeId, {
      onVariantComplete: (index: number, variant: CoverVariant) => {
        setVariantComplete(index, variant)
      },
      onVariantFailed: (index: number) => {
        setVariantFailed(index)
      },
    })

    // If we got no angles (unknown theme), show all as failed
    if (angles.length === 0) {
      ;[0, 1, 2].forEach((i) => setVariantFailed(i))
    }
  }, [brief, themeId, initVariantStubs, setVariantComplete, setVariantFailed])

  useEffect(() => {
    if (!generationFired.current) {
      generationFired.current = true
      fireGeneration()
    }
  }, [fireGeneration])

  // ─── Regenerate handler ────────────────────────────────────────────────
  function handleRegenerate() {
    regenerateVariants()
    // Fire new generation after store resets
    setTimeout(() => {
      generateCoverVariants(brief, themeId, {
        onVariantComplete: (index: number, variant: CoverVariant) => {
          setVariantComplete(index, variant)
        },
        onVariantFailed: (index: number) => {
          setVariantFailed(index)
        },
      })
    }, 50)
  }

  // ─── Retry single variant ─────────────────────────────────────────────
  async function handleRetry(index: number) {
    // Set to pending
    useCarouselStore.getState().retryVariant(index)

    const result = await retrySingleVariant(brief, themeId, index)
    if (result) {
      setVariantComplete(index, result)
    } else {
      setVariantFailed(index)
    }
  }

  const hasSelection = selectedVariantId !== null
  const canRegenerate = regenerationCount < 3
  const { assembling, setAssembling, setCarousel } = useCarouselStore()
  const [assemblyProgress, setAssemblyProgress] = useState(0)

  async function handleConfirm() {
    if (!hasSelection) return

    // Find selected variant
    const selectedVariant = variants.find((v) => v.variant_id === selectedVariantId)
    if (!selectedVariant) return

    confirmVariant()
    setAssembling(true)
    setAssemblyProgress(0)

    // Decorative progress bar — 0→100% over ~25 seconds
    const progressInterval = setInterval(() => {
      setAssemblyProgress((prev) => {
        if (prev >= 95) return prev
        // Slow down as we approach 90%
        const increment = prev < 30 ? 1.5 : prev < 80 ? 0.8 : 0.3
        return Math.min(prev + increment, 95)
      })
    }, 250)

    try {
      const carousel = themeId === 'nyt_opinion'
        ? await assembleShortFormCarousel(brief as Brief, selectedVariant)
        : await assembleLongFormCarousel(brief as Brief, themeId, selectedVariant)
      clearInterval(progressInterval)
      setAssemblyProgress(100)
      setCarousel(carousel)
      // Brief pause to show 100%
      setTimeout(() => navigate('/editor'), 300)
    } catch (err) {
      clearInterval(progressInterval)
      setAssembling(false)
      setAssemblyProgress(0)
      console.error('Carousel assembly failed:', err)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      {assembling && <AssemblyOverlay progress={assemblyProgress} />}
      <div className="max-w-[860px] mx-auto px-6 py-10 flex flex-col gap-6">
        {/* Back link */}
        <button
          onClick={() => navigate('/theme-confirmation')}
          className="self-start text-sm text-muted hover:text-zinc-900 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span>←</span>
          <span>Back to theme selection</span>
        </button>

        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Cover Variants</h1>
            <p className="text-sm text-muted mt-1">
              Three interpretations of your brief. Choose one.
            </p>
          </div>

          {/* Regenerate */}
          {canRegenerate ? (
            <button
              onClick={handleRegenerate}
              disabled={variantsLoading}
              className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium text-zinc-600 hover:border-accent/50 hover:text-accent transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {variantsLoading ? 'Generating...' : 'Regenerate'}
            </button>
          ) : (
            <span className="shrink-0 text-xs text-zinc-400 py-2">
              Max regenerations reached
            </span>
          )}
        </div>

        {/* Regeneration counter */}
        {regenerationCount > 0 && canRegenerate && (
          <p className="text-xs text-zinc-400 -mt-4">
            Regeneration {regenerationCount} of 3
          </p>
        )}

        {/* Variant grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {variants.length > 0
            ? variants.map((variant, index) => (
                <VariantCard
                  key={variant.variant_id}
                  variant={variant}
                  isSelected={selectedVariantId === variant.variant_id}
                  isDimmed={hasSelection && selectedVariantId !== variant.variant_id}
                  onSelect={() => selectVariant(variant.variant_id)}
                  onRetry={() => handleRetry(index)}
                />
              ))
            : // Empty skeleton state
              [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border overflow-hidden"
                >
                  <div className="aspect-[16/20] bg-zinc-100 animate-pulse" />
                  <div className="p-4 flex flex-col gap-2">
                    <div className="h-4 bg-zinc-100 rounded animate-pulse w-2/3" />
                    <div className="h-3 bg-zinc-100 rounded animate-pulse w-full" />
                    <div className="h-3 bg-zinc-100 rounded animate-pulse w-4/5" />
                  </div>
                </div>
              ))}
        </div>

        {/* Confirm button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={!hasSelection || assembling}
            onClick={handleConfirm}
            className="w-full rounded-xl bg-accent text-white font-semibold py-3 text-sm transition-all hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {assembling ? 'Building...' : 'Build Carousel →'}
          </button>
        </div>
      </div>
    </div>
  )
}
