import { useState, useEffect, useCallback, useRef } from 'react'
import { useCarouselStore } from '../../store/carouselStore'
import { useBriefStore } from '../../store/briefStore'
import { getSlideLabel } from './slideLabels'
import { getTheme } from '../../themes'
import { calculateContrast } from '../../engine/contrastCheck'
import { deriveSignatureColor } from '../../engine/colorSystem'
import { regenerateSlideText, regenerateCoverImage } from '../../api/slideRegeneration'
import { exportCarouselPNG, exportCarouselJSON, importCarouselJSON } from '../../api/export'
import type { Slide } from '../../types/carousel'
import type { ThemeId, CarouselFormat } from '../../types/theme'

// ─── Main Editor ─────────────────────────────────────────────────────────────

export default function Editor() {
  const carousel = useCarouselStore((s) => s.carousel)

  if (!carousel) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-muted text-sm">No carousel loaded</p>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-surface"
      style={{ display: 'grid', gridTemplateColumns: '220px 1fr 320px', gridTemplateRows: '48px 1fr' }}
    >
      <ExportToolbar />
      <SlideNavigator
        slides={carousel.slides}
        format={carousel.format}
      />
      <SlideCanvas
        slides={carousel.slides}
        themeId={carousel.theme_id}
      />
      <PropertiesPanel
        slides={carousel.slides}
        format={carousel.format}
        themeId={carousel.theme_id}
      />
    </div>
  )
}

// ─── Export Toolbar ──────────────────────────────────────────────────────────

function ExportToolbar() {
  const carousel = useCarouselStore((s) => s.carousel)
  const selectSlide = useCarouselStore((s) => s.selectSlide)
  const setCarousel = useCarouselStore((s) => s.setCarousel)
  const brief = useBriefStore((s) => s.brief)
  const setBrief = useBriefStore((s) => s.setBrief)

  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const savedIndexRef = useRef(0)

  const handleExportPNG = async () => {
    if (!carousel || exporting) return
    savedIndexRef.current = useCarouselStore.getState().selectedSlideIndex
    setExporting(true)
    setExportProgress('Preparing…')
    try {
      await exportCarouselPNG(carousel, selectSlide, (p) => {
        setExportProgress(`Exporting slide ${p.current}/${p.total}…`)
      })
    } catch (err) {
      console.error('PNG export failed:', err)
    } finally {
      // Restore original slide selection
      selectSlide(savedIndexRef.current)
      setExporting(false)
      setExportProgress('')
    }
  }

  const handleExportJSON = () => {
    if (!carousel) return
    exportCarouselJSON(carousel, brief)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    try {
      const result = await importCarouselJSON(file)
      setCarousel(result.carousel)
      setBrief(result.brief)
      selectSlide(0)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    }
    // Reset file input so same file can be re-imported
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div
      className="bg-white border-b border-border flex items-center justify-between px-4"
      style={{ gridColumn: '1 / -1' }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-zinc-800">Editor</span>
        {exporting && (
          <span className="text-[11px] text-accent font-medium">{exportProgress}</span>
        )}
        {importError && (
          <span className="text-[11px] text-red-600">{importError}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
        <button
          className="text-[11px] font-medium px-3 py-1.5 rounded-md bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          Open JSON
        </button>

        {/* Export PNG */}
        <button
          className="text-[11px] font-medium px-3 py-1.5 rounded-md bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleExportPNG}
          disabled={exporting}
          title="1200×1500 · LinkedIn auto-scales"
        >
          {exporting ? 'Exporting…' : 'Export PNG ↓'}
        </button>

        {/* Export JSON */}
        <button
          className="text-[11px] font-medium px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent/90 transition-colors"
          onClick={handleExportJSON}
        >
          Export JSON ↓
        </button>
      </div>
    </div>
  )
}

// ─── Editable Text Component ─────────────────────────────────────────────────

function EditableText({
  value,
  field,
  slideIndex,
  style,
  className = '',
}: {
  value: string
  field: 'headline' | 'body_text' | 'quote_text' | 'byline'
  slideIndex: number
  style?: React.CSSProperties
  className?: string
}) {
  const updateSlide = useCarouselStore((s) => s.updateSlide)
  const ref = useRef<HTMLDivElement>(null)

  const handleBlur = useCallback(() => {
    if (!ref.current) return
    const newText = ref.current.innerText.trim()
    if (newText === value) return

    const editFlag = field === 'headline' ? 'headline_edited'
      : field === 'body_text' ? 'body_text_edited'
      : undefined

    updateSlide(slideIndex, {
      [field]: newText,
      ...(editFlag ? { [editFlag]: true } : {}),
      last_edited_at: new Date().toISOString(),
    })
  }, [value, field, slideIndex, updateSlide])

  // Sync text when value changes from outside (e.g., regeneration)
  useEffect(() => {
    if (ref.current && ref.current.innerText.trim() !== value) {
      ref.current.innerText = value
    }
  }, [value])

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      className={`outline-none cursor-text border border-transparent hover:border-dashed hover:border-white/30 focus:border-solid focus:border-white/50 transition-colors ${className}`}
      style={style}
    >
      {value}
    </div>
  )
}

// ─── Slide Navigator (left panel) ────────────────────────────────────────────

function SlideNavigator({
  slides,
  format,
}: {
  slides: Slide[]
  format: CarouselFormat
}) {
  const selectedSlideIndex = useCarouselStore((s) => s.selectedSlideIndex)
  const selectSlide = useCarouselStore((s) => s.selectSlide)
  const moveSlide = useCarouselStore((s) => s.moveSlide)
  const duplicateSlide = useCarouselStore((s) => s.duplicateSlide)
  const deleteSlide = useCarouselStore((s) => s.deleteSlide)
  const addEvidenceSlide = useCarouselStore((s) => s.addEvidenceSlide)
  const removeEvidenceSlide = useCarouselStore((s) => s.removeEvidenceSlide)

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    index: number
  } | null>(null)

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [contextMenu])

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, index })
  }

  return (
    <div className="bg-white border-r border-border flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Slides</h2>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {slides.map((slide, i) => {
          const isActive = i === selectedSlideIndex
          return (
            <button
              key={slide.slide_id}
              className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors cursor-pointer ${
                isActive
                  ? 'border-l-2 border-accent bg-accent/5'
                  : 'border-l-2 border-transparent hover:bg-zinc-50'
              }`}
              onClick={() => selectSlide(i)}
              onContextMenu={(e) => handleContextMenu(e, i)}
            >
              <span className="flex-shrink-0 w-5 h-5 rounded bg-zinc-100 text-[10px] font-medium flex items-center justify-center text-zinc-500">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-zinc-700 truncate">
                    {getSlideLabel(slide.archetype, format)}
                  </span>
                  {slide.needs_review && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-muted truncate mt-0.5">
                  {slide.headline || '(empty)'}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {format === 'short_form' && (
        <div className="px-3 py-2 border-t border-border flex gap-2">
          <button
            className="flex-1 text-[11px] px-2 py-1.5 rounded bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={addEvidenceSlide}
            disabled={slides.length >= 4}
          >
            + Evidence
          </button>
          <button
            className="flex-1 text-[11px] px-2 py-1.5 rounded bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={removeEvidenceSlide}
            disabled={slides.length <= 3}
          >
            − Evidence
          </button>
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed bg-white border border-border rounded-lg shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <ContextMenuItem
            label="Move Up"
            disabled={contextMenu.index === 0}
            onClick={() => moveSlide(contextMenu.index, 'up')}
          />
          <ContextMenuItem
            label="Move Down"
            disabled={contextMenu.index === slides.length - 1}
            onClick={() => moveSlide(contextMenu.index, 'down')}
          />
          <div className="h-px bg-border my-1" />
          <ContextMenuItem
            label="Duplicate"
            onClick={() => duplicateSlide(contextMenu.index)}
          />
          <ContextMenuItem
            label="Delete"
            disabled={slides.length <= (format === 'short_form' ? 3 : 1)}
            onClick={() => deleteSlide(contextMenu.index)}
            danger
          />
        </div>
      )}
    </div>
  )
}

function ContextMenuItem({
  label,
  onClick,
  disabled,
  danger,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
        disabled
          ? 'text-zinc-300 cursor-not-allowed'
          : danger
            ? 'text-red-600 hover:bg-red-50'
            : 'text-zinc-700 hover:bg-zinc-50'
      }`}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

// ─── Slide Canvas (center panel) ─────────────────────────────────────────────

function SlideCanvas({
  slides,
  themeId,
}: {
  slides: Slide[]
  themeId: ThemeId
}) {
  const selectedSlideIndex = useCarouselStore((s) => s.selectedSlideIndex)
  const [zoom, setZoom] = useState(0.45)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const { clientHeight } = containerRef.current
    const targetZoom = (clientHeight - 80) / 1500
    setZoom(Math.max(0.25, Math.min(targetZoom, 0.65)))
  }, [])

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.1, 2)), [])
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.1, 0.25)), [])

  const currentSlide = slides[selectedSlideIndex]

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center overflow-hidden"
      style={{
        background: '#f7f8fa',
        backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {currentSlide && (
        <div
          id={`slide-canvas-${currentSlide.slide_index}`}
          className="shadow-2xl rounded-sm"
          style={{
            width: 1200,
            height: 1500,
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <SlidePreview slide={currentSlide} themeId={themeId} slideIndex={selectedSlideIndex} />
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white border border-border rounded-lg shadow-sm px-1.5 py-1">
        <button
          className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-zinc-800 rounded transition-colors"
          onClick={zoomOut}
        >
          <span className="text-sm font-medium">−</span>
        </button>
        <span className="text-[11px] text-zinc-500 font-medium w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-zinc-800 rounded transition-colors"
          onClick={zoomIn}
        >
          <span className="text-sm font-medium">+</span>
        </button>
      </div>
    </div>
  )
}

// ─── Slide Preview (theme-aware) ─────────────────────────────────────────────

function SlidePreview({
  slide,
  themeId,
  slideIndex,
}: {
  slide: Slide
  themeId: ThemeId
  slideIndex: number
}) {
  if (themeId === 'dark_museum') {
    return <DarkMuseumPreview slide={slide} themeId={themeId} slideIndex={slideIndex} />
  }

  if (themeId === 'sic_toile') {
    return <CartouchePreview slide={slide} themeId={themeId} slideIndex={slideIndex} />
  }

  if (themeId === 'nyt_opinion') {
    if (slide.content_type === 'illustration') {
      return <NYTCoverPreview slide={slide} slideIndex={slideIndex} />
    }
    return <NYTQuotePreview slide={slide} slideIndex={slideIndex} />
  }

  if (themeId === 'radial_departure') {
    return <RadialDeparturePreview slide={slide} slideIndex={slideIndex} />
  }

  if (themeId === 'editorial_minimal') {
    return <EditorialMinimalPreview slide={slide} slideIndex={slideIndex} />
  }

  return (
    <div className="w-full h-full bg-zinc-200 flex items-center justify-center">
      <p className="text-zinc-500 text-sm">Preview unavailable</p>
    </div>
  )
}

// ─── Dark Museum / Product Elevation Preview ─────────────────────────────────

function DarkMuseumPreview({ slide, themeId, slideIndex }: { slide: Slide; themeId: ThemeId; slideIndex: number }) {
  const theme = getTheme(themeId) as Record<string, any>
  const colors = theme.colors ?? {}

  return (
    <div
      className="w-full h-full flex flex-col justify-end relative overflow-hidden"
      style={{ backgroundColor: colors.bg ?? '#0A0A0A' }}
    >
      {slide.image_url && (
        <div className="absolute inset-0">
          <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="relative z-10 p-[89px] flex flex-col gap-4">
        <EditableText
          value={slide.headline}
          field="headline"
          slideIndex={slideIndex}
          className="leading-[0.95]"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 900,
            fontSize: slide.headline_size ?? 64,
            color: colors.text_primary ?? '#FFFFFF',
          }}
        />
        {slide.body_text && (
          <EditableText
            value={slide.body_text}
            field="body_text"
            slideIndex={slideIndex}
            className="leading-relaxed"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 400,
              fontSize: 22,
              color: colors.text_secondary ?? '#E0E0E0',
            }}
          />
        )}
      </div>

      {slide.archetype !== 'cover_hook' && slide.cta_text && (
        <div
          className="relative z-10 px-[89px] pb-8"
          style={{
            color: colors.accent_gold ?? '#C4A44A',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          {slide.cta_text}
        </div>
      )}
    </div>
  )
}

// ─── SIC Toile Preview (placeholder) ─────────────────────────────────────────

function CartouchePreview({ slide, themeId, slideIndex }: { slide: Slide; themeId: ThemeId; slideIndex: number }) {
  const strokeColor = '#2A2ECD'

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-6"
      style={{ backgroundColor: '#F5F0E8' }}
    >
      <p style={{ color: strokeColor, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: "'DM Sans', sans-serif" }}>
        Cartouche preview
      </p>

      <div
        className="flex items-center justify-center"
        style={{
          width: 700,
          height: 350,
          border: `2px solid ${strokeColor}`,
          borderRadius: '50%',
          padding: 40,
        }}
      >
        <EditableText
          value={slide.headline}
          field="headline"
          slideIndex={slideIndex}
          className="text-center leading-tight"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 900,
            fontSize: 40,
            color: strokeColor,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        />
      </div>

      {slide.annotation_label && (
        <p style={{ color: strokeColor, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'DM Sans', sans-serif", opacity: 0.6 }}>
          {slide.annotation_label}
        </p>
      )}
    </div>
  )
}

// ─── NYT Opinion Cover Preview ───────────────────────────────────────────────

function NYTCoverPreview({ slide, slideIndex }: { slide: Slide; slideIndex: number }) {
  const sigColor = slide.signature_color ?? '#C2185B'

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: sigColor }}>
      <div className="flex-1 relative">
        {slide.illustration_url ? (
          <img src={slide.illustration_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-black/10 flex items-center justify-center">
            <p className="text-white/40 text-xs uppercase tracking-wider">Illustration</p>
          </div>
        )}
      </div>

      <div className="px-[89px] py-12" style={{ backgroundColor: sigColor }}>
        <EditableText
          value={slide.headline}
          field="headline"
          slideIndex={slideIndex}
          className="leading-tight"
          style={{
            fontFamily: "'Lora', serif",
            fontWeight: 700,
            fontSize: slide.headline_size ?? 56,
            color: '#FFFFFF',
          }}
        />
      </div>
    </div>
  )
}

// ─── NYT Opinion Quote Preview ───────────────────────────────────────────────

function NYTQuotePreview({ slide, slideIndex }: { slide: Slide; slideIndex: number }) {
  const sigColor = slide.signature_color ?? '#C2185B'

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center px-[120px]"
      style={{ backgroundColor: sigColor }}
    >
      <EditableText
        value={slide.quote_text || slide.headline}
        field="quote_text"
        slideIndex={slideIndex}
        className="text-center leading-snug"
        style={{
          fontFamily: "'Lora', serif",
          fontWeight: 400,
          fontSize: 44,
          color: '#FFFFFF',
        }}
      />
      {slide.byline && (
        <EditableText
          value={slide.byline}
          field="byline"
          slideIndex={slideIndex}
          className="mt-8"
          style={{
            fontFamily: "'Libre Franklin', sans-serif",
            fontWeight: 400,
            fontSize: 18,
            color: 'rgba(255,255,255,0.72)',
          }}
        />
      )}
    </div>
  )
}

// ─── Radial Departure Preview ───────────────────────────────────────────────

function RadialDeparturePreview({ slide, slideIndex }: { slide: Slide; slideIndex: number }) {
  const isCover = slideIndex === 0

  return (
    <div
      className="w-full h-full flex flex-col justify-end relative overflow-hidden"
      style={{ backgroundColor: '#1A1A1A' }}
    >
      {slide.image_url && (
        <div className="absolute inset-0">
          <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{
            background: isCover
              ? 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.6) 80%)'
              : 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7) 100%)',
          }} />
        </div>
      )}

      <div className="relative z-10 p-[89px] flex flex-col gap-4">
        <EditableText
          value={slide.headline}
          field="headline"
          slideIndex={slideIndex}
          className="leading-[1.05]"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 800,
            fontSize: slide.headline_size ?? 72,
            color: '#FFFFFF',
            textTransform: 'uppercase' as const,
          }}
        />
        {slide.body_text && (
          <EditableText
            value={slide.body_text}
            field="body_text"
            slideIndex={slideIndex}
            className="leading-relaxed"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 300,
              fontSize: 28,
              color: '#CCCCCC',
            }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Editorial Minimal Preview ──────────────────────────────────────────────

function EditorialMinimalPreview({ slide, slideIndex }: { slide: Slide; slideIndex: number }) {
  // Determine slide type from archetype or content_type
  const slideType = slide.slide_type ?? 'A'
  const bgColors: Record<string, string> = {
    A: '#FFFFFF', B: '#1A1A1A', C: '#1669D3',
    D: '#EBEBEB', E: '#3D3D28', F: '#1A1A1A', G: '#1A1A1A',
  }
  const textColors: Record<string, string> = {
    A: '#2A2A2A', B: '#FFFFFF', C: '#FFFFFF',
    D: '#2A2A2A', E: '#FFFFFF', F: '#EEFF88', G: '#FFFFFF',
  }
  const bg = bgColors[slideType] ?? '#FFFFFF'
  const textColor = textColors[slideType] ?? '#2A2A2A'
  const hasPhoto = ['D', 'E', 'F', 'G'].includes(slideType)
  const useSerif = ['E', 'G'].includes(slideType)

  return (
    <div
      className="w-full h-full flex flex-col relative overflow-hidden"
      style={{ backgroundColor: bg }}
    >
      {hasPhoto && slide.image_url && (
        <div className={slideType === 'E' ? 'absolute bottom-0 left-0 right-0 h-[52%]' : 'absolute inset-0'}>
          <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
          {(slideType === 'F' || slideType === 'G') && (
            <div className="absolute inset-0" style={{
              background: slideType === 'F'
                ? 'rgba(0,0,0,0.35)'
                : 'linear-gradient(to bottom, transparent 55%, rgba(26,26,26,0.7) 70%, #1A1A1A 82%)',
            }} />
          )}
        </div>
      )}

      <div className={`relative z-10 flex flex-col gap-4 ${
        slideType === 'E' ? 'p-[89px] h-[48%] justify-center' :
        slideType === 'G' ? 'p-[89px] mt-auto' :
        'p-[89px] justify-center flex-1'
      }`}>
        <EditableText
          value={slide.headline}
          field="headline"
          slideIndex={slideIndex}
          className="leading-[1.05]"
          style={{
            fontFamily: useSerif ? "'EB Garamond', serif" : "'DM Sans', sans-serif",
            fontWeight: slideType === 'F' ? 800 : useSerif ? 400 : 300,
            fontSize: slide.headline_size ?? (slideType === 'F' ? 96 : slideType === 'D' ? 52 : 76),
            color: textColor,
            textTransform: slideType === 'F' ? 'uppercase' as const : 'none' as const,
          }}
        />
        {slide.body_text && slideType !== 'F' && (
          <EditableText
            value={slide.body_text}
            field="body_text"
            slideIndex={slideIndex}
            className="leading-relaxed"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 400,
              fontSize: 38,
              color: textColor,
              opacity: 0.8,
            }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Confirm Dialog ──────────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  confirmLabel = 'Regenerate',
  cancelLabel = 'Keep my edit',
  onConfirm,
  onCancel,
}: {
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
      <p className="text-amber-800">{message}</p>
      <div className="flex gap-2 mt-2">
        <button
          className="px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
        <button
          className="px-3 py-1 rounded bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  )
}

// ─── Properties Panel (right panel — Design tab) ─────────────────────────────

function PropertiesPanel({
  slides,
  format,
  themeId,
}: {
  slides: Slide[]
  format: CarouselFormat
  themeId: ThemeId
}) {
  const selectedSlideIndex = useCarouselStore((s) => s.selectedSlideIndex)
  const updateSlide = useCarouselStore((s) => s.updateSlide)
  const carousel = useCarouselStore((s) => s.carousel)
  const setCarousel = useCarouselStore((s) => s.setCarousel)
  const brief = useBriefStore((s) => s.brief)
  const currentSlide = slides[selectedSlideIndex]

  const [regenerating, setRegenerating] = useState(false)
  const [showEditConfirm, setShowEditConfirm] = useState(false)
  const [showCoverConfirm, setShowCoverConfirm] = useState(false)
  const [regenError, setRegenError] = useState<string | null>(null)

  if (!currentSlide) return null

  const isShortForm = format === 'short_form'
  const isQuoteSlide = currentSlide.content_type === 'quote'
  const isCoverSlide = currentSlide.archetype === 'cover_hook'
  const hasImage = !!(currentSlide.image_url || currentSlide.illustration_url)

  // ─── Text regeneration handler ──────────────────

  const doRegenerate = async () => {
    setRegenerating(true)
    setRegenError(null)
    setShowEditConfirm(false)
    try {
      const prevSlide = slides[selectedSlideIndex - 1]
      const nextSlide = slides[selectedSlideIndex + 1]

      const result = await regenerateSlideText({
        brief,
        theme_id: themeId,
        archetype: currentSlide.archetype,
        prev_headline: prevSlide?.headline ?? null,
        next_headline: nextSlide?.headline ?? null,
      })

      updateSlide(selectedSlideIndex, {
        headline: result.headline,
        body_text: result.body_text,
        dialogue: result.dialogue,
        headline_edited: false,
        body_text_edited: false,
        last_edited_at: new Date().toISOString(),
      })
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : 'Regeneration failed')
    } finally {
      setRegenerating(false)
    }
  }

  const handleRegenerateText = () => {
    if (currentSlide.headline_edited) {
      setShowEditConfirm(true)
    } else {
      doRegenerate()
    }
  }

  // ─── Cover regeneration handler (NYT) ──────────

  const handleRegenerateCover = async () => {
    if (!carousel) return
    setShowCoverConfirm(false)
    setRegenerating(true)
    setRegenError(null)
    try {
      const result = await regenerateCoverImage(
        themeId,
        currentSlide.headline,
      )

      // Derive new signature color
      let newColor = currentSlide.signature_color ?? '#C2185B'
      try {
        const colorResult = await deriveSignatureColor(result.image_url)
        newColor = colorResult.signature_color
      } catch {
        // Keep existing color if derivation fails
      }

      // Update cover slide
      updateSlide(selectedSlideIndex, {
        illustration_url: result.image_url,
        signature_color: newColor,
      })

      // Update all slides with new signature color
      const updatedSlides = carousel.slides.map((s, i) => ({
        ...s,
        signature_color: newColor,
        ...(i === selectedSlideIndex ? { illustration_url: result.image_url } : {}),
      }))
      setCarousel({ ...carousel, slides: updatedSlides, signature_color: newColor })
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : 'Cover regeneration failed')
    } finally {
      setRegenerating(false)
    }
  }

  // ─── Signature color handler (NYT) ─────────────

  const handleSignatureColorChange = (newColor: string) => {
    if (!carousel) return
    const updatedSlides = carousel.slides.map((s) => ({
      ...s,
      signature_color: newColor,
    }))
    setCarousel({
      ...carousel,
      slides: updatedSlides,
      signature_color: newColor,
      signature_color_source: 'manual',
    })
  }

  const contrastRatio = currentSlide.signature_color
    ? calculateContrast('#1A1A1A', currentSlide.signature_color)
    : null
  const lowContrast = contrastRatio !== null && contrastRatio < 4.5

  // ─── Textarea change handler ───────────────────

  const handleFieldChange = (field: string, value: string) => {
    const editFlag = field === 'headline' ? 'headline_edited'
      : field === 'body_text' ? 'body_text_edited'
      : undefined

    updateSlide(selectedSlideIndex, {
      [field]: value,
      ...(editFlag ? { [editFlag]: true } : {}),
      last_edited_at: new Date().toISOString(),
    })
  }

  return (
    <div className="bg-white border-l border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">Design</h2>
        <span className="text-[10px] text-muted">
          {selectedSlideIndex + 1}/{slides.length}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Archetype info */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">
            {getSlideLabel(currentSlide.archetype, format)}
          </span>
          <span className="text-[10px] text-zinc-400">{currentSlide.content_type}</span>
        </div>

        {currentSlide.needs_review && (
          <div className="px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-700">
            Needs review
          </div>
        )}

        {/* ─── Short-form Quote Slide ──────────────────── */}
        {isShortForm && isQuoteSlide && !isCoverSlide && (
          <>
            <FieldLabel label="Pull quote">
              <textarea
                className="w-full text-sm border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-accent min-h-[120px]"
                value={currentSlide.quote_text ?? ''}
                onChange={(e) => handleFieldChange('quote_text', e.target.value)}
              />
            </FieldLabel>

            <FieldLabel label="Byline">
              <input
                className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
                value={currentSlide.byline ?? ''}
                onChange={(e) => handleFieldChange('byline', e.target.value)}
              />
            </FieldLabel>

            <FieldLabel label="Signature color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentSlide.signature_color ?? '#C2185B'}
                  onChange={(e) => handleSignatureColorChange(e.target.value)}
                  className="w-8 h-8 rounded border border-border cursor-pointer"
                />
                <input
                  className="flex-1 text-xs font-mono border border-border rounded px-2 py-1.5 focus:outline-none focus:border-accent uppercase"
                  value={currentSlide.signature_color ?? '#C2185B'}
                  onChange={(e) => {
                    const v = e.target.value
                    if (/^#[0-9a-fA-F]{6}$/.test(v)) handleSignatureColorChange(v)
                  }}
                />
              </div>
              {lowContrast && (
                <p className="text-[10px] text-amber-600 mt-1">
                  ⚠ Low contrast ({contrastRatio?.toFixed(1)}:1) — text may be hard to read
                </p>
              )}
            </FieldLabel>

            <ActionButton
              label="Regenerate quote"
              loading={regenerating}
              onClick={handleRegenerateText}
            />
          </>
        )}

        {/* ─── Short-form Cover Slide ──────────────────── */}
        {isShortForm && isCoverSlide && (
          <>
            <FieldLabel label="Headline">
              <textarea
                className="w-full text-sm border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-accent min-h-[80px]"
                value={currentSlide.headline}
                onChange={(e) => handleFieldChange('headline', e.target.value)}
              />
            </FieldLabel>

            {!showCoverConfirm ? (
              <ActionButton
                label="Regenerate cover"
                loading={regenerating}
                onClick={() => setShowCoverConfirm(true)}
              />
            ) : (
              <ConfirmDialog
                message="Regenerating the cover will update the colour on all quote slides."
                confirmLabel="Regenerate"
                cancelLabel="Cancel"
                onConfirm={handleRegenerateCover}
                onCancel={() => setShowCoverConfirm(false)}
              />
            )}
          </>
        )}

        {/* ─── Long-form Slide ─────────────────────────── */}
        {!isShortForm && (
          <>
            <FieldLabel label="Headline">
              <textarea
                className="w-full text-sm border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-accent min-h-[80px]"
                value={currentSlide.headline}
                onChange={(e) => handleFieldChange('headline', e.target.value)}
              />
            </FieldLabel>

            <FieldLabel label="Body text">
              <textarea
                className="w-full text-sm border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-accent min-h-[100px]"
                value={currentSlide.body_text ?? ''}
                onChange={(e) => handleFieldChange('body_text', e.target.value)}
              />
            </FieldLabel>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Font size</span>
              <span className="text-zinc-600 font-mono">{currentSlide.headline_size}px</span>
            </div>

            {/* Edit confirm dialog */}
            {showEditConfirm && (
              <ConfirmDialog
                message="This slide has been manually edited. Regenerate and discard your changes?"
                onConfirm={doRegenerate}
                onCancel={() => setShowEditConfirm(false)}
              />
            )}

            <ActionButton
              label="Regenerate text"
              loading={regenerating}
              onClick={handleRegenerateText}
            />

            {hasImage && (
              <ActionButton
                label="Regenerate image"
                loading={false}
                onClick={() => {
                  // Image regeneration wired in future task
                }}
                secondary
              />
            )}
          </>
        )}

        {/* Error display */}
        {regenError && (
          <p className="text-[11px] text-red-600 px-1">{regenError}</p>
        )}

        {/* Edit confirm dialog for short-form */}
        {isShortForm && isQuoteSlide && !isCoverSlide && showEditConfirm && (
          <ConfirmDialog
            message="This slide has been manually edited. Regenerate and discard your changes?"
            onConfirm={doRegenerate}
            onCancel={() => setShowEditConfirm(false)}
          />
        )}
      </div>
    </div>
  )
}

// ─── Shared UI helpers ───────────────────────────────────────────────────────

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-muted uppercase tracking-wider mb-1 block">
        {label}
      </span>
      {children}
    </label>
  )
}

function ActionButton({
  label,
  loading,
  onClick,
  secondary,
}: {
  label: string
  loading: boolean
  onClick: () => void
  secondary?: boolean
}) {
  return (
    <button
      className={`w-full text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        secondary
          ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          : 'bg-accent text-white hover:bg-accent/90'
      }`}
      disabled={loading}
      onClick={onClick}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Regenerating…
        </span>
      ) : (
        label
      )}
    </button>
  )
}
