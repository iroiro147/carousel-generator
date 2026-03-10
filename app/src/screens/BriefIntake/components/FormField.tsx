import { type ReactNode } from 'react'

interface FormFieldProps {
  label: string
  sublabel?: string
  error?: string
  optional?: boolean
  children: ReactNode
}

export default function FormField({ label, sublabel, error, optional, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <label className="text-sm font-semibold text-zinc-900">{label}</label>
        {optional && (
          <span className="text-[11px] font-medium text-muted bg-surface px-1.5 py-0.5 rounded">
            Optional
          </span>
        )}
      </div>
      {sublabel && (
        <p className="text-xs text-muted -mt-0.5">{sublabel}</p>
      )}
      {children}
      {error && (
        <p className="text-xs text-red-500 mt-0.5">{error}</p>
      )}
    </div>
  )
}
