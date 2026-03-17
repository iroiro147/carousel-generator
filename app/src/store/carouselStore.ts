import { create } from 'zustand'
import type { CoverVariant, PropagationMetadata, ImageModel } from '../types/variant'
import type { Carousel, Slide } from '../types/carousel'

// ─── Store interface ──────────────────────────────────────────────────────────
interface CarouselStore {
  // Cover variants
  variants: CoverVariant[]
  selectedVariantId: string | null
  variantsLoading: boolean
  regenerationCount: number // max 3

  // Actions
  setVariants: (v: CoverVariant[]) => void
  selectVariant: (id: string) => void
  deselectVariant: () => void
  retryVariant: (index: number) => void
  regenerateVariants: () => void
  setVariantLoading: (index: number, loading: boolean) => void
  setVariantFailed: (index: number) => void
  setVariantComplete: (index: number, variant: CoverVariant) => void
  initVariantStubs: (count: number) => void
  appendVariantStubs: (count: number, model: ImageModel) => number // returns start index of new stubs

  // Confirm selection
  selectedPropagationMetadata: PropagationMetadata | null
  confirmVariant: () => void

  // Carousel assembly (Task 14)
  carousel: Carousel | null
  assembling: boolean
  setCarousel: (c: Carousel) => void
  setAssembling: (v: boolean) => void
  updateSlide: (index: number, updates: Partial<Slide>) => void
  getSlide: (index: number) => Slide | undefined

  // Editor (Task 18)
  selectedSlideIndex: number
  selectSlide: (index: number) => void
  moveSlide: (index: number, direction: 'up' | 'down') => void
  duplicateSlide: (index: number) => void
  deleteSlide: (index: number) => void
  addEvidenceSlide: () => void
  removeEvidenceSlide: () => void
}

export const useCarouselStore = create<CarouselStore>((set, get) => ({
  variants: [],
  selectedVariantId: null,
  variantsLoading: false,
  regenerationCount: 0,
  selectedPropagationMetadata: null,

  // Carousel assembly state
  carousel: null,
  assembling: false,

  setVariants: (v) => set({ variants: v, variantsLoading: false }),

  selectVariant: (id) => {
    const current = get().selectedVariantId
    // Toggle: clicking already-selected card deselects
    if (current === id) {
      set({ selectedVariantId: null })
    } else {
      set({ selectedVariantId: id })
    }
  },

  deselectVariant: () => set({ selectedVariantId: null }),

  retryVariant: (index) => {
    set((s) => {
      const variants = [...s.variants]
      if (variants[index]) {
        variants[index] = {
          ...variants[index],
          generation_status: 'pending',
        }
      }
      return { variants }
    })
    // Actual retry logic wired in Task 09
  },

  regenerateVariants: () => {
    const { regenerationCount } = get()
    if (regenerationCount >= 3) return
    set({
      variants: [],
      selectedVariantId: null,
      variantsLoading: true,
      regenerationCount: regenerationCount + 1,
    })
    // Actual generation wired in Task 09
  },

  setVariantLoading: (index, loading) => {
    set((s) => {
      const variants = [...s.variants]
      if (variants[index]) {
        variants[index] = {
          ...variants[index],
          generation_status: loading ? 'pending' : 'complete',
        }
      }
      return { variants }
    })
  },

  setVariantFailed: (index) => {
    set((s) => {
      const variants = [...s.variants]
      if (variants[index]) {
        variants[index] = {
          ...variants[index],
          generation_status: 'failed',
        }
      }
      return { variants }
    })
  },

  setVariantComplete: (index, variant) => {
    set((s) => {
      const variants = [...s.variants]
      variants[index] = variant
      return { variants, variantsLoading: false }
    })
  },

  initVariantStubs: (count) => {
    const stubs: CoverVariant[] = Array.from({ length: count }, (_, i) => ({
      variant_id: `stub-${i}`,
      brief_id: 'current',
      theme: '',
      angle_key: '',
      angle_name: `Variant ${i + 1}`,
      angle_description: 'Generating...',
      cover_slide: {
        composition_mode: 'centered',
        headline: '',
        headline_size: 48,
        text_position: 'center',
        image_prompt: '',
      },
      propagation_metadata: {
        creative_angle: '',
        narrative_frame: '',
      },
      generation_status: 'pending' as const,
      selected: false,
      created_at: new Date().toISOString(),
    }))
    set({ variants: stubs, variantsLoading: true, selectedVariantId: null })
  },

  appendVariantStubs: (count, model) => {
    const existing = get().variants
    const startIndex = existing.length
    const stubs: CoverVariant[] = Array.from({ length: count }, (_, i) => ({
      variant_id: `stub-${startIndex + i}-${Date.now()}`,
      brief_id: 'current',
      theme: '',
      angle_key: '',
      angle_name: `Variant ${startIndex + i + 1}`,
      angle_description: 'Generating...',
      cover_slide: {
        composition_mode: 'centered',
        headline: '',
        headline_size: 48,
        text_position: 'center',
        image_prompt: '',
      },
      propagation_metadata: {
        creative_angle: '',
        narrative_frame: '',
      },
      generation_status: 'pending' as const,
      selected: false,
      created_at: new Date().toISOString(),
      model,
    }))
    set({ variants: [...existing, ...stubs], variantsLoading: true })
    return startIndex
  },

  confirmVariant: () => {
    const { variants, selectedVariantId } = get()
    const selected = variants.find((v) => v.variant_id === selectedVariantId)
    if (selected) {
      set({ selectedPropagationMetadata: selected.propagation_metadata })
    }
  },

  // Carousel assembly actions
  setCarousel: (carousel) => set({ carousel, assembling: false }),

  setAssembling: (assembling) => set({ assembling }),

  updateSlide: (index, updates) =>
    set((state) => {
      if (!state.carousel) return state
      const slides = [...state.carousel.slides]
      slides[index] = { ...slides[index], ...updates }
      return { carousel: { ...state.carousel, slides } }
    }),

  getSlide: (index) => get().carousel?.slides[index],

  // ─── Editor actions (Task 18) ────────────────────────────────────────────────

  selectedSlideIndex: 0,

  selectSlide: (index) => set({ selectedSlideIndex: index }),

  moveSlide: (index, direction) =>
    set((state) => {
      if (!state.carousel) return state
      const slides = [...state.carousel.slides]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= slides.length) return state
      ;[slides[index], slides[target]] = [slides[target], slides[index]]
      // Re-index
      slides.forEach((s, i) => (s.slide_index = i))
      return {
        carousel: { ...state.carousel, slides },
        selectedSlideIndex: target,
      }
    }),

  duplicateSlide: (index) =>
    set((state) => {
      if (!state.carousel) return state
      const source = state.carousel.slides[index]
      if (!source) return state
      const dup: Slide = {
        ...structuredClone(source),
        slide_id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        slide_index: index + 1,
      }
      const slides = [...state.carousel.slides]
      slides.splice(index + 1, 0, dup)
      slides.forEach((s, i) => (s.slide_index = i))
      return {
        carousel: { ...state.carousel, slides },
        selectedSlideIndex: index + 1,
      }
    }),

  deleteSlide: (index) =>
    set((state) => {
      if (!state.carousel) return state
      const minSlides = state.carousel.format === 'short_form' ? 3 : 1
      if (state.carousel.slides.length <= minSlides) return state
      const slides = state.carousel.slides.filter((_, i) => i !== index)
      slides.forEach((s, i) => (s.slide_index = i))
      const newIndex = Math.min(state.selectedSlideIndex, slides.length - 1)
      return {
        carousel: { ...state.carousel, slides },
        selectedSlideIndex: newIndex,
      }
    }),

  addEvidenceSlide: () =>
    set((state) => {
      if (!state.carousel) return state
      if (state.carousel.format !== 'short_form') return state
      if (state.carousel.slides.length >= 4) return state
      const evidence: Slide = {
        slide_id: `slide-${Date.now()}-evidence`,
        carousel_id: state.carousel.carousel_id,
        slide_index: 2,
        archetype: 'evidence',
        content_type: 'quote',
        headline: 'Evidence',
        headline_size: 48,
        quote_text: '',
        signature_color: state.carousel.signature_color ?? null,
      }
      const slides = [...state.carousel.slides]
      slides.splice(2, 0, evidence)
      slides.forEach((s, i) => (s.slide_index = i))
      return { carousel: { ...state.carousel, slides, slide_count: 4 } }
    }),

  removeEvidenceSlide: () =>
    set((state) => {
      if (!state.carousel) return state
      if (state.carousel.format !== 'short_form') return state
      if (state.carousel.slides.length <= 3) return state
      const evidenceIdx = state.carousel.slides.findIndex(
        (s) => s.archetype === 'evidence',
      )
      if (evidenceIdx === -1) return state
      const slides = state.carousel.slides.filter((_, i) => i !== evidenceIdx)
      slides.forEach((s, i) => (s.slide_index = i))
      const newIndex = Math.min(state.selectedSlideIndex, slides.length - 1)
      return {
        carousel: { ...state.carousel, slides, slide_count: 3 },
        selectedSlideIndex: newIndex,
      }
    }),
}))
