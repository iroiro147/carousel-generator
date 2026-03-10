interface MultiCardOption<T extends string> {
  key: T
  label: string
  sublabel?: string
}

interface MultiCardSelectProps<T extends string> {
  options: MultiCardOption<T>[]
  value: T[]
  onChange: (val: T[]) => void
  max: number
  name: string
}

export default function MultiCardSelect<T extends string>({
  options,
  value,
  onChange,
  max,
  name,
}: MultiCardSelectProps<T>) {
  function handleClick(key: T) {
    if (value.includes(key)) {
      // Deselect
      onChange(value.filter((v) => v !== key))
    } else if (value.length < max) {
      // Add
      onChange([...value, key])
    } else {
      // FIFO: drop the first, add the new one
      onChange([...value.slice(1), key])
    }
  }

  return (
    <div>
      <p className="text-xs text-muted mb-2">Select up to {max}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {options.map((opt) => {
          const selected = value.includes(opt.key)
          return (
            <button
              key={opt.key}
              type="button"
              role="checkbox"
              aria-checked={selected}
              aria-label={opt.label}
              data-name={name}
              onClick={() => handleClick(opt.key)}
              className={`
                text-left rounded-xl px-4 py-3 transition-all duration-150 cursor-pointer
                ${selected
                  ? 'border-2 border-accent bg-blue-50'
                  : 'border border-border bg-white hover:border-accent/50'
                }
              `}
            >
              <span className="block text-sm font-medium text-zinc-900">
                {opt.label}
              </span>
              {opt.sublabel && (
                <span className="block text-xs text-muted mt-0.5">
                  {opt.sublabel}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
