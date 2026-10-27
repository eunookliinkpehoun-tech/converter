'use client'

import { FieldDescription, FieldLegend, FieldSet } from '@/components/ui/field'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { AVAILABLE_CHAINS, NETWORKS, type ChainId } from '@/lib/constants'

type Props = {
  value: ChainId
  disabled?: boolean
  onChange: (chain: ChainId) => void
}

const chainLabels: Record<ChainId, string> = {
  solana: 'Solana',
  bnb: 'BNB Chain',
  polygon: 'Polygon',
}

export function NetworkSelector({ value, disabled = false, onChange }: Props) {
  return (
    <FieldSet className="grid gap-x-6 gap-y-1 rounded-xl border bg-card px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
      <FieldLegend variant="label" className="mb-0">Wallet network</FieldLegend>
      <FieldDescription id="wallet-network-help" className="text-xs sm:row-start-2">
          Assets are sold on this network only; nothing is bridged to another chain.
      </FieldDescription>
      <ToggleGroup
        aria-label="Wallet network"
        aria-describedby="wallet-network-help"
        value={[value]}
        onValueChange={(selection) => {
          const next = selection[0] as ChainId | undefined
          if (next && AVAILABLE_CHAINS.includes(next)) onChange(next)
        }}
        disabled={disabled}
        multiple={false}
        variant="outline"
        size="sm"
        className="w-full sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:w-fit sm:justify-self-end"
      >
        {AVAILABLE_CHAINS.map((chain) => (
          <ToggleGroupItem
            key={chain}
            value={chain}
            className="min-w-0 flex-1 whitespace-nowrap px-2 sm:flex-none sm:px-3"
          >
            {chainLabels[chain] || NETWORKS[chain].displayName}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </FieldSet>
  )
}
