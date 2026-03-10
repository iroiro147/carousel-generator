import { useState } from 'react'
import type { ContentCategoryKey, FormatPreferenceKey } from '../../types/brief'
import FormField from './components/FormField'
import CardSelect from './components/CardSelect'

const CATEGORY_OPTIONS: Array<{ key: ContentCategoryKey; label: string }> = [
  { key: 'product_feature', label: 'Product feature or capability' },
  { key: 'market_analysis', label: 'Market or competitive landscape' },
  { key: 'customer_story', label: 'Customer or user story' },
  { key: 'institutional_narrative', label: 'Company story or institutional narrative' },
  { key: 'technical_explanation', label: 'Technical explanation' },
  { key: 'opinion_argument', label: 'Opinion or argument' },
  { key: 'industry_trend', label: 'Industry trend or insight' },
  { key: 'event_milestone', label: 'Event or milestone announcement' },
  { key: 'cross_border_global', label: 'Cross-border or global expansion' },
  { key: 'security_trust', label: 'Security or trust' },
]

const FORMAT_OPTIONS: Array<{ key: FormatPreferenceKey; label: string; sublabel: string }> = [
  { key: 'engine_decides', label: 'Engine decides (recommended)', sublabel: 'Based on your brief' },
  { key: 'prefer_short', label: 'Short (3-4 slides)', sublabel: 'Fast read, one strong argument' },
  { key: 'prefer_long', label: 'Long (14 slides)', sublabel: 'Full narrative, complete argument' },
]

interface Section4Props {
  contentCategory: ContentCategoryKey | null
  formatPreference: FormatPreferenceKey
  onContentCategoryChange: (v: ContentCategoryKey) => void
  onFormatPreferenceChange: (v: FormatPreferenceKey) => void
}

export default function Section4_Constraints({
  contentCategory, formatPreference,
  onContentCategoryChange, onFormatPreferenceChange,
}: Section4Props) {
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-6 flex flex-col gap-5">
      <h2 className="text-base font-semibold text-zinc-900">Constraints</h2>

      <FormField
        label="What kind of content is this?"
        error={touched.category && !contentCategory ? 'What kind of content is this?' : undefined}
      >
        <div onBlur={() => setTouched(t => ({ ...t, category: true }))}>
          <CardSelect<ContentCategoryKey>
            options={CATEGORY_OPTIONS}
            value={contentCategory}
            onChange={onContentCategoryChange}
            name="content_category"
          />
        </div>
      </FormField>

      <FormField
        label="Any format preference?"
        sublabel="Leave blank and we'll recommend. Or override if you have a reason."
      >
        <CardSelect<FormatPreferenceKey>
          options={FORMAT_OPTIONS}
          value={formatPreference}
          onChange={onFormatPreferenceChange}
          name="format_preference"
        />
      </FormField>
    </div>
  )
}
