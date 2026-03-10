import { useNavigate } from 'react-router-dom'
import { useBriefStore } from '../../store/briefStore'
import Section1_Brief from './Section1_Brief'
import Section2_Audience from './Section2_Audience'
import Section3_Brand from './Section3_Brand'
import Section4_Constraints from './Section4_Constraints'

export default function BriefIntake() {
  const navigate = useNavigate()
  const store = useBriefStore()
  const { brief } = store

  // Read values from store (with defaults for optional/unset)
  const topic = brief.topic ?? ''
  const goal = brief.goal ?? null
  const claim = brief.claim ?? ''
  const audience = brief.audience ?? null
  const tone = (brief.tone as string[] | undefined) ?? []
  const brandName = brief.brand_name ?? ''
  const brandColor = brief.brand_color ?? ''
  const contentNotes = brief.content_notes ?? ''
  const contentCategory = brief.content_category ?? null
  const formatPreference = brief.format_preference ?? 'engine_decides'

  // Section completion from store
  const section1Complete = store.isSection1Complete()
  const section2Complete = store.isSection2Complete()
  const section3Complete = store.isSection3Complete()
  const section4Complete = store.isSection4Complete()

  const allValid = store.isFormComplete()
    && (!brandColor || /^#[0-9A-Fa-f]{6}$/.test(brandColor))

  function handleSubmit() {
    if (!allValid) return
    store.runThemeRubric()
    navigate('/theme-confirmation')
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-[640px] mx-auto px-6 py-10 flex flex-col gap-6">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-xl font-semibold text-zinc-900">New Carousel</h1>
          <p className="text-sm text-muted mt-1">
            Brief the engine. Every field feeds the visual system.
          </p>
        </div>

        {/* Section 1 — always visible */}
        <Section1_Brief
          topic={topic}
          goal={goal}
          claim={claim}
          onTopicChange={store.setTopic}
          onGoalChange={store.setGoal}
          onClaimChange={store.setClaim}
        />

        {/* Section 2 — revealed after Section 1 complete */}
        <div
          className={`transition-all duration-200 ${
            section1Complete
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2 pointer-events-none h-0 overflow-hidden'
          }`}
        >
          <Section2_Audience
            audience={audience}
            tone={tone}
            onAudienceChange={store.setAudience}
            onToneChange={store.setTone}
          />
        </div>

        {/* Section 3 — revealed after Section 2 complete */}
        <div
          className={`transition-all duration-200 ${
            section1Complete && section2Complete
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2 pointer-events-none h-0 overflow-hidden'
          }`}
        >
          <Section3_Brand
            brandName={brandName}
            brandColor={brandColor}
            contentNotes={contentNotes}
            onBrandNameChange={store.setBrandName}
            onBrandColorChange={store.setBrandColor}
            onContentNotesChange={store.setContentNotes}
          />
        </div>

        {/* Section 4 — revealed after Section 3 complete */}
        <div
          className={`transition-all duration-200 ${
            section1Complete && section2Complete && section3Complete
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2 pointer-events-none h-0 overflow-hidden'
          }`}
        >
          <Section4_Constraints
            contentCategory={contentCategory}
            formatPreference={formatPreference}
            onContentCategoryChange={store.setContentCategory}
            onFormatPreferenceChange={store.setFormatPreference}
          />
        </div>

        {/* Submit button — revealed after Section 4 complete */}
        <div
          className={`transition-all duration-200 ${
            section1Complete && section2Complete && section3Complete && section4Complete
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2 pointer-events-none h-0 overflow-hidden'
          }`}
        >
          <button
            type="button"
            disabled={!allValid}
            onClick={handleSubmit}
            className="w-full rounded-xl bg-accent text-white font-semibold py-3 text-sm transition-all hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Find My Theme &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}
