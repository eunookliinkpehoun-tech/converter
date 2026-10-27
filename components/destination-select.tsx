'use client'

import { FieldDescription, FieldLegend, FieldSet } from '@/components/ui/field'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
    <FieldSet className="rounded-xl border bg-card px-4 py-4 sm:px-5">
      <FieldLegend variant="label">Sell into</FieldLegend>
      <FieldDescription id="destination-asset-help" className="text-xs leading-relaxed">
        Selected assets will be sold into {selected?.symbol ?? 'the base asset'} on this network only. No cross-chain transfer is used.
      </FieldDescription>
      <ToggleGroup
        aria-label="Asset to receive"
        aria-describedby="destination-asset-help"
        value={[value]}
        onValueChange={(selection) => {
          const next = selection[0]
          if (next) onChange(next)
        }}
        disabled={disabled}
        multiple={false}
        variant="outline"
        className="w-full"
      >
        {options.map((target) => (
          <ToggleGroupItem
            key={target.mint}
            value={target.mint}
            className="flex h-auto min-h-12 flex-1 flex-col items-start justify-center gap-1 px-3 py-2 text-left"
          >
            <span className="text-sm font-medium">{target.symbol}</span>
            <span className="line-clamp-1 text-[10px] text-muted-foreground">{target.name}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </FieldSet>
  )
}
