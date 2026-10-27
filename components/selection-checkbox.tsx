'use client'

import { Check, Minus } from 'lucide-react'
import { useEffect, useRef } from 'react'

type Props = {
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  onChange: () => void
  label: string
}

export function SelectionCheckbox({ checked, indeterminate = false, disabled, onChange, label }: Props) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <span className="relative inline-flex size-5 shrink-0">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={label}
        className="peer size-5 cursor-pointer appearance-none rounded-md border border-input bg-background transition-colors checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      {(checked || indeterminate) && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-primary-foreground">
          {indeterminate && !checked ? (
            <Minus className="size-3.5" strokeWidth={3} aria-hidden="true" />
          ) : (
            <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
          )}
        </span>
      )}
    </span>
  )
}
