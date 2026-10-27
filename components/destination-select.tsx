'use client'

import { ChevronDown } from 'lucide-react'
import type { SwapTarget } from '@/lib/constants'

type Props = {
  options: SwapTarget[]
  value: string
  disabled?: boolean
  onChange: (mint: string) => void
}

export function DestinationSelect({ options, value, disabled, onChange }: Props) {
  const selected = options.find((target) => target.mint === value)

  return (
    <div className="rounded-xl border bg-card px-4 py-4 sm:px-5">
      <label htmlFor="destination-asset" className="flex flex-col gap-2">
        <span className="text-sm font-medium">Sell into</span>
        <span className="relative">
          <select
            id="destination-asset"
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.currentTarget.value)}
            aria-describedby="destination-asset-help"
            className="h-11 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-10 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {options.map((target) => (
              <option key={target.mint} value={target.mint}>
                {target.symbol} — {target.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        </span>
      </label>
      <p id="destination-asset-help" className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Selected assets will be sold into {selected?.symbol ?? 'the base asset'} on this network only. No cross-chain transfer is used.
      </p>
    </div>
  )
}
