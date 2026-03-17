import { useState } from 'react'
import FormField from './components/FormField'

interface Section3Props {
  brandName: string
  brandColor: string
  contentNotes: string
  onBrandNameChange: (v: string) => void
  onBrandColorChange: (v: string) => void
  onContentNotesChange: (v: string) => void
}

export default function Section3_Brand({
  brandName, brandColor, contentNotes,
  onBrandNameChange, onBrandColorChange, onContentNotesChange,
}: Section3Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validateColor() {
    if (brandColor && !/^#[0-9A-Fa-f]{6}$/.test(brandColor)) {
      setErrors(e => ({ ...e, color: "Looks like that hex code isn't quite right — try #RRGGBB format." }))
    } else {
      setErrors(e => { const { color: _, ...rest } = e; return rest })
    }
  }

  // Keep hex input and color picker in sync
  function handleHexInput(val: string) {
    // Allow partial typing — add # if missing
    if (val && !val.startsWith('#')) val = '#' + val
    onBrandColorChange(val)
  }

  function handlePickerChange(val: string) {
    onBrandColorChange(val)
  }

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-6 flex flex-col gap-5">
      <h2 className="text-base font-semibold text-zinc-900">The Brand</h2>

      <FormField
        label="Brand or product name"
      >
        <input
          type="text"
          value={brandName}
          maxLength={80}
          placeholder="Juspay"
          onChange={e => onBrandNameChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
        />
      </FormField>

      <FormField
        label="Primary brand color"
        sublabel="Used as the starting point for the visual system. Hex code or pick from the swatch."
        optional
        error={errors.color}
      >
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={brandColor}
            placeholder="#RRGGBB"
            onChange={e => handleHexInput(e.target.value)}
            onBlur={validateColor}
            className="w-32 rounded-lg border border-border bg-white px-3 py-2 text-sm text-zinc-900 font-mono placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
          />
          <input
            type="color"
            value={/^#[0-9A-Fa-f]{6}$/.test(brandColor) ? brandColor : '#0561e2'} /* matches --color-accent */
            onChange={e => handlePickerChange(e.target.value)}
            className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5"
          />
        </div>
        <p className="text-[11px] text-muted mt-1">
          Some themes use this directly. Others have fixed palettes.
        </p>
      </FormField>

      <FormField
        label="Anything the carousel must include or avoid?"
        sublabel="Specific stats, required phrases, things to stay away from. Optional but useful."
        optional
      >
        <div className="relative">
          <textarea
            value={contentNotes}
            maxLength={500}
            rows={3}
            placeholder="Must mention the 40% drop-off reduction stat. Avoid mentioning competitor names. The tone should not be preachy."
            onChange={e => onContentNotesChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition resize-none"
          />
          {contentNotes.length >= 400 && (
            <span className="absolute right-2 bottom-2 text-[11px] text-muted">
              {contentNotes.length}/500
            </span>
          )}
        </div>
      </FormField>
    </div>
  )
}
