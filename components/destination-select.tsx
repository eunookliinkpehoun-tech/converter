'use client'

import { ChevronDown } from 'lucide-react'
import { DEFAULT_SWAP_TARGETS, type SwapTarget } from '@/lib/constants'
import { shortAddress } from '@/lib/format'

type Props = {
  options: SwapTarget[]
  value: string
  disabled?: boolean
  onChange: (mint: string) => void
}

export function DestinationSelect({ options, value, disabled, onChange }: Props) {
  const baseMints = new Set(DEFAULT_SWAP_TARGETS.map((target) => target.mint))
  const baseOptions = options.filter((target) => baseMints.has(target.mint))
  const walletOptions = options.filter((target) => !baseMints.has(target.mint))
  const selected = options.find((target) => target.mint === value)

  const getOptionLabel = (target: SwapTarget, isBase: boolean) =>
    `${target.symbol} — ${target.name}${isBase ? '' : ` · ${shortAddress(target.mint)}`}`

  return (
    <div className="rounded-xl border bg-card px-4 py-4 sm:px-5">
      <label htmlFor="destination-asset" className="flex flex-col gap-2">
        <span className="text-sm font-medium">Receive asset</span>
        <span className="relative">
          <select
            id="destination-asset"
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.currentTarget.value)}
            aria-describedby="destination-asset-help"
            className="h-11 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-10 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <optgroup label="Base assets">
              {baseOptions.map((target) => (
                <option key={target.mint} value={target.mint}>
                  {getOptionLabel(target, true)}
                </option>
              ))}
            </optgroup>
            {walletOptions.length > 0 ? (
              <optgroup label="Assets in this wallet">
                {walletOptions.map((target) => (
                  <option key={target.mint} value={target.mint}>
                    {getOptionLabel(target, false)}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        </span>
      </label>
      <p id="destination-asset-help" className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Selected assets will be swapped to {selected?.symbol ?? 'your chosen asset'}. The destination is excluded from
        the source assets.
      </p>
    </div>
  )
}
