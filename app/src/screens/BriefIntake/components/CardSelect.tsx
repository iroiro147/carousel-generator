interface CardOption<T extends string> {
  key: T
  label: string
  sublabel?: string
}

interface CardSelectProps<T extends string> {
  options: CardOption<T>[]
  value: T | null
  onChange: (val: T) => void
  name: string
}

export default function CardSelect<T extends string>({
  options,
  value,
  onChange,
  name,
}: CardSelectProps<T>) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
      {options.map((opt) => {
        const selected = value === opt.key
        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={opt.label}
            data-name={name}
            onClick={() => onChange(opt.key)}
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
  )
}
