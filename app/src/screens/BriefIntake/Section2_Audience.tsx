import { useState } from 'react'
import type { AudienceKey, ToneKey } from '../../types/brief'
import FormField from './components/FormField'
import CardSelect from './components/CardSelect'
import MultiCardSelect from './components/MultiCardSelect'

const AUDIENCE_OPTIONS: Array<{ key: AudienceKey; label: string; sublabel: string }> = [
  { key: 'cold_consumer', label: 'Cold consumer', sublabel: 'Has never heard of the brand. Scrolling without intent.' },
  { key: 'warm_consumer', label: 'Warm consumer', sublabel: 'Knows the brand. Mild intent.' },
  { key: 'cold_b2b', label: 'Cold B2B', sublabel: "Decision-maker who doesn't know us. High trust bar." },
  { key: 'warm_b2b', label: 'Warm B2B', sublabel: 'Decision-maker in active evaluation.' },
  { key: 'industry_peers', label: 'Industry peers', sublabel: 'Colleagues, press, analysts. Will notice quality.' },
  { key: 'institutional_investors', label: 'Investors', sublabel: 'VCs, PE, sovereign funds. Long-horizon evaluation.' },
  { key: 'board_executive', label: 'Board / C-suite', sublabel: 'Strategic fit, not product features.' },
  { key: 'product_technical', label: 'Product / Technical', sublabel: 'Engineers and PMs. Want precision.' },
]

const TONE_OPTIONS: Array<{ key: ToneKey; label: string }> = [
  { key: 'authoritative_confident', label: 'Authoritative' },
  { key: 'provocative_challenging', label: 'Provocative' },
  { key: 'aspirational_elevated', label: 'Aspirational' },
  { key: 'empathetic_human', label: 'Empathetic' },
  { key: 'technical_precise', label: 'Technical' },
  { key: 'heritage_institutional', label: 'Institutional / Heritage' },
  { key: 'mythological_epic', label: 'Mythological / Epic' },
  { key: 'documentary_real', label: 'Documentary / Real' },
]

interface Section2Props {
  audience: AudienceKey | null
  tone: ToneKey[]
  onAudienceChange: (v: AudienceKey) => void
  onToneChange: (v: ToneKey[]) => void
}

export default function Section2_Audience({
  audience, tone,
  onAudienceChange, onToneChange,
}: Section2Props) {
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-6 flex flex-col gap-5">
      <h2 className="text-base font-semibold text-zinc-900">The Audience</h2>

      <FormField
        label="Who is this for?"
        error={touched.audience && !audience ? "Who's reading this? Pick the closest match." : undefined}
      >
        <div onBlur={() => setTouched(t => ({ ...t, audience: true }))}>
          <CardSelect<AudienceKey>
            options={AUDIENCE_OPTIONS}
            value={audience}
            onChange={onAudienceChange}
            name="audience"
          />
        </div>
      </FormField>

      <FormField
        label="What register should this feel like?"
        error={touched.tone && tone.length === 0 ? 'How should this feel? Pick at least one.' : undefined}
      >
        <div onBlur={() => setTouched(t => ({ ...t, tone: true }))}>
          <MultiCardSelect<ToneKey>
            options={TONE_OPTIONS}
            value={tone}
            onChange={onToneChange}
            max={2}
            name="tone"
          />
        </div>
      </FormField>
    </div>
  )
}
