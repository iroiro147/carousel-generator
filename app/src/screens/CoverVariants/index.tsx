import { useEffect, useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCarouselStore } from '../../store/carouselStore'
import { useBriefStore } from '../../store/briefStore'
import { generateCoverVariants, retrySingleVariant } from '../../api/imageGen'
import { assembleLongFormCarousel } from '../../api/carousel'
import { assembleShortFormCarousel } from '../../api/carouselShortForm'
import type { Brief } from '../../types/brief'
import type { CoverVariant, ImageModel } from '../../types/variant'
import type { ThemeId } from '../../types/theme'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Run {
  model: ImageModel
  startIndex: number
  count: number
}

const MODEL_LABELS: Record<ImageModel, string> = {
  'gpt-image-1.5': 'GPT-Image-1.5',
  'nano-banana-2': 'Nano Banana 2',
}

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

// ─── Animated dots ────────────────────────────────────────────────────────────
function PulseDots() {
  return (
    <span className="dot-pulse inline-flex gap-[3px] ml-1">
      <span className="w-[3px] h-[3px] rounded-full bg-current inline-block" />
      <span className="w-[3px] h-[3px] rounded-full bg-current inline-block" />
      <span className="w-[3px] h-[3px] rounded-full bg-current inline-block" />
    </span>
  )
}

// ─── Variant Card component ──────────────────────────────────────────────────
function VariantCard({
  variant,
  isSelected,
  isDimmed,
  errorMessage,
  entryDelay,
  onSelect,
  onRetry,
}: {
  variant: CoverVariant
  isSelected: boolean
  isDimmed: boolean
  errorMessage: string | null
  entryDelay: number
  onSelect: () => void
  onRetry: () => void
}) {
  const isPending = variant.generation_status === 'pending'
  const isFailed = variant.generation_status === 'failed'
  const isComplete = variant.generation_status === 'complete'
  const thumbnailUrl = variant.cover_slide.thumbnail_url
  const [imageLoaded, setImageLoaded] = useState(false)

  // Reset imageLoaded when variant changes status
  useEffect(() => {
    if (isPending || isFailed) setImageLoaded(false)
  }, [isPending, isFailed])

  return (
    <div
      className="animate-fade-in-up"
      style={{ animationDelay: `${entryDelay}ms` }}
    >
      <button
        type="button"
        onClick={isFailed ? undefined : onSelect}
        className={`group relative flex flex-col sm:flex-row md:flex-col rounded-xl border overflow-hidden transition-all duration-300 text-left w-full ${
          isSelected
            ? 'border-accent border-2 shadow-sm'
            : isFailed
              ? 'border-border bg-zinc-50'
              : 'border-border hover:border-zinc-300 cursor-pointer'
        } ${isDimmed && !isSelected ? 'opacity-50 scale-[0.98]' : 'opacity-100'}`}
      >
        {/* Thumbnail area */}
        <div
          className={`relative w-full sm:w-[140px] sm:shrink-0 md:w-full aspect-[16/20] sm:aspect-auto sm:h-full md:aspect-[16/20] md:h-auto overflow-hidden ${
            isFailed ? 'bg-zinc-100' : 'bg-zinc-50'
          }`}
        >
          {isPending ? (
            // Shimmer loading state
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="absolute inset-0 shimmer-bg" />
              <div className="relative z-10 flex flex-col items-center gap-2 px-6">
                <div className="w-8 h-8 rounded-full border-2 border-zinc-300 border-t-zinc-500 animate-spin" />
                <p className="text-[11px] font-medium text-zinc-400 flex items-center">
                  Creating image<PulseDots />
                </p>
              </div>
            </div>
          ) : isFailed ? (
            // Failed state with error context
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
              <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-zinc-400">
                  <path d="M8 5v3.5M8 10.5h.007M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-xs text-zinc-400 text-center">Generation failed</p>
              {errorMessage && (
                <p className="text-[10px] text-zinc-300 text-center line-clamp-2">{errorMessage}</p>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRetry()
                }}
                className="text-xs font-medium text-accent hover:text-accent/80 transition-colors cursor-pointer px-3 py-1.5 rounded-lg border border-accent/20 hover:border-accent/40"
              >
                Try again
              </button>
            </div>
          ) : thumbnailUrl ? (
            // Completed — image with fade-in reveal
            <>
              {!imageLoaded && <div className="absolute inset-0 shimmer-bg" />}
              <img
                src={thumbnailUrl}
                alt={variant.angle_name}
                onLoad={() => setImageLoaded(true)}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                  imageLoaded
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-[1.02]'
                } group-hover:scale-[1.03]`}
              />
            </>
          ) : (
            // Placeholder (no image)
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-medium text-zinc-300 text-center px-4">
                {variant.angle_name}
              </span>
            </div>
          )}
        </div>

        {/* Text area — always shows angle name + description */}
        <div className="flex flex-col gap-1.5 p-4 flex-1">
          <h3 className="text-sm font-semibold text-zinc-900">
            {variant.angle_name}
          </h3>
          <p className="text-xs text-muted leading-relaxed line-clamp-2">
            {isPending ? (
              <span className="text-zinc-400">{variant.angle_description}</span>
            ) : (
              variant.angle_description
            )}
          </p>
          {isComplete && variant.cover_slide.headline && (
            <p className="text-xs text-zinc-500 italic line-clamp-1 mt-0.5">
              &ldquo;{variant.cover_slide.headline}&rdquo;
            </p>
          )}
          {!isFailed && (
            <span
              className={`mt-auto pt-2 text-xs font-medium transition-colors ${
                isSelected ? 'text-accent' : isPending ? 'text-zinc-300' : 'text-zinc-400 group-hover:text-accent'
              }`}
            >
              {isSelected ? '✓ Selected' : isPending ? '' : 'Select'}
            </span>
          )}
        </div>
      </button>
    </div>
  )
}

// ─── Model Selector ───────────────────────────────────────────────────────────
function ModelSelector({
  selectedModel,
  onSelect,
  disabled,
  runs,
}: {
  selectedModel: ImageModel
  onSelect: (model: ImageModel) => void
  disabled: boolean
  runs: Run[]
}) {
  const models: ImageModel[] = ['gpt-image-1.5', 'nano-banana-2']
  const runModels = new Set(runs.map((r) => r.model))

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-white">
      {models.map((model) => {
        const isActive = selectedModel === model
        const alreadyRan = runModels.has(model)
        return (
          <button
            key={model}
            type="button"
            disabled={disabled || alreadyRan}
            onClick={() => onSelect(model)}
            className={`relative px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              isActive
                ? 'bg-zinc-900 text-white shadow-sm'
                : alreadyRan
                  ? 'text-zinc-300 cursor-not-allowed'
                  : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
            } disabled:cursor-not-allowed`}
            title={alreadyRan && !isActive ? `Already generated with ${MODEL_LABELS[model]}` : undefined}
          >
            {MODEL_LABELS[model]}
            {alreadyRan && !isActive && (
              <span className="ml-1 text-[10px]">✓</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Run Section Header ───────────────────────────────────────────────────────
function RunHeader({ model, index }: { model: ImageModel; index: number }) {
  return (
    <div className="flex items-center gap-2 mt-2 mb-1">
      <div className="flex items-center gap-1.5">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            model === 'gpt-image-1.5' ? 'bg-emerald-400' : 'bg-violet-400'
          }`}
        />
        <span className="text-xs font-medium text-zinc-500">
          {MODEL_LABELS[model]}
        </span>
      </div>
      {index > 0 && (
        <div className="flex-1 h-px bg-zinc-100" />
      )}
    </div>
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
    appendVariantStubs,
    regenerateVariants,
    confirmVariant,
  } = useCarouselStore()

  const generationFired = useRef(false)
  const [errorMessages, setErrorMessages] = useState<Record<number, string>>({})
  const [runs, setRuns] = useState<Run[]>([])
  const [activeModel, setActiveModel] = useState<ImageModel>('gpt-image-1.5')

  const themeId = (selectedTheme ?? 'dark_museum') as ThemeId

  // Track how many are still generating
  const pendingCount = variants.filter((v) => v.generation_status === 'pending').length
  const completeCount = variants.filter((v) => v.generation_status === 'complete').length
  const allDone = variants.length > 0 && pendingCount === 0

  // ─── Fire a generation run for a given model ─────────────────────────
  const fireRun = useCallback(
    (model: ImageModel, isInitial: boolean) => {
      let startIndex = 0

      if (isInitial) {
        initVariantStubs(3)
        setErrorMessages({})
        setRuns([{ model, startIndex: 0, count: 3 }])
      } else {
        startIndex = appendVariantStubs(3, model)
        setRuns((prev) => [...prev, { model, startIndex, count: 3 }])
      }

      const { angles } = generateCoverVariants(brief, themeId, model, {
        onVariantComplete: (index: number, variant: CoverVariant) => {
          const globalIndex = startIndex + index
          setVariantComplete(globalIndex, variant)
        },
        onVariantFailed: (index: number, error: string) => {
          const globalIndex = startIndex + index
          setVariantFailed(globalIndex)
          setErrorMessages((prev) => ({ ...prev, [globalIndex]: error }))
        },
      })

      if (angles.length === 0) {
        ;[0, 1, 2].forEach((i) => {
          const globalIndex = startIndex + i
          setVariantFailed(globalIndex)
          setErrorMessages((prev) => ({
            ...prev,
            [globalIndex]: 'No angles available for this theme',
          }))
        })
      }
    },
    [brief, themeId, initVariantStubs, appendVariantStubs, setVariantComplete, setVariantFailed],
  )

  // ─── Fire initial generation on mount ────────────────────────────────
  useEffect(() => {
    if (!generationFired.current) {
      generationFired.current = true
      fireRun('gpt-image-1.5', true)
    }
  }, [fireRun])

  // ─── Model selector handler ─────────────────────────────────────────
  function handleModelSelect(model: ImageModel) {
    // Don't re-run a model we already ran
    if (runs.some((r) => r.model === model)) return

    setActiveModel(model)
    fireRun(model, false)
  }

  // ─── Regenerate handler (resets all runs) ────────────────────────────
  function handleRegenerate() {
    regenerateVariants()
    setErrorMessages({})
    setRuns([])
    setActiveModel('gpt-image-1.5')
    setTimeout(() => {
      fireRun('gpt-image-1.5', true)
    }, 50)
  }

  // ─── Retry single variant ───────────────────────────────────────────
  async function handleRetry(globalIndex: number) {
    // Find which run this variant belongs to
    const run = runs.find(
      (r) => globalIndex >= r.startIndex && globalIndex < r.startIndex + r.count,
    )
    const model = run?.model ?? 'gpt-image-1.5'
    const angleIndex = run ? globalIndex - run.startIndex : globalIndex

    useCarouselStore.getState().retryVariant(globalIndex)
    setErrorMessages((prev) => {
      const next = { ...prev }
      delete next[globalIndex]
      return next
    })

    const result = await retrySingleVariant(brief, themeId, angleIndex, model)
    if (result) {
      setVariantComplete(globalIndex, result)
    } else {
      setVariantFailed(globalIndex)
      setErrorMessages((prev) => ({
        ...prev,
        [globalIndex]: 'Retry failed — try again or regenerate all',
      }))
    }
  }

  const hasSelection = selectedVariantId !== null
  const canRegenerate = regenerationCount < 3
  const { assembling, setAssembling, setCarousel } = useCarouselStore()
  const [assemblyProgress, setAssemblyProgress] = useState(0)

  async function handleConfirm() {
    if (!hasSelection) return

    const selectedVariant = variants.find((v) => v.variant_id === selectedVariantId)
    if (!selectedVariant) return

    confirmVariant()
    setAssembling(true)
    setAssemblyProgress(0)

    const progressInterval = setInterval(() => {
      setAssemblyProgress((prev) => {
        if (prev >= 95) return prev
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
      setTimeout(() => navigate('/editor'), 300)
    } catch (err) {
      clearInterval(progressInterval)
      setAssembling(false)
      setAssemblyProgress(0)
      console.error('Carousel assembly failed:', err)
    }
  }

  // ─── Dynamic header ────────────────────────────────────────────────────
  const subtitle = allDone
    ? 'Choose the direction that resonates.'
    : `Interpreting your brief${completeCount > 0 ? ` — ${completeCount} ready` : ''}`

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
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Cover Variants</h1>
            <p className="text-sm text-muted mt-1 transition-all duration-300">
              {subtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Model selector */}
            <ModelSelector
              selectedModel={activeModel}
              onSelect={handleModelSelect}
              disabled={variantsLoading}
              runs={runs}
            />

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
        </div>

        {/* Regeneration counter */}
        {regenerationCount > 0 && canRegenerate && (
          <p className="text-xs text-zinc-400 -mt-4">
            Regeneration {regenerationCount} of 3
          </p>
        )}

        {/* Variant grid — grouped by run */}
        {runs.length > 0 ? (
          <div className="flex flex-col gap-4">
            {runs.map((run, runIndex) => {
              const runVariants = variants.slice(run.startIndex, run.startIndex + run.count)
              return (
                <div key={`${run.model}-${run.startIndex}`}>
                  {/* Run header — show model label for multi-run */}
                  {(runs.length > 1 || runIndex > 0) && (
                    <RunHeader model={run.model} index={runIndex} />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {runVariants.map((variant, localIndex) => {
                      const globalIndex = run.startIndex + localIndex
                      return (
                        <VariantCard
                          key={variant.variant_id}
                          variant={variant}
                          isSelected={selectedVariantId === variant.variant_id}
                          isDimmed={hasSelection && selectedVariantId !== variant.variant_id}
                          errorMessage={errorMessages[globalIndex] ?? null}
                          entryDelay={localIndex * 150}
                          onSelect={() => selectVariant(variant.variant_id)}
                          onRetry={() => handleRetry(globalIndex)}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          // Initial loading skeleton
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="aspect-[16/20] shimmer-bg" />
                <div className="p-4 flex flex-col gap-2">
                  <div className="h-4 bg-zinc-100 rounded w-2/3" />
                  <div className="h-3 bg-zinc-100 rounded w-full" />
                  <div className="h-3 bg-zinc-100 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

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
