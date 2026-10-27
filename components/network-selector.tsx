import { ChevronDown } from 'lucide-react'
import { AVAILABLE_CHAINS, NETWORKS, type ChainId } from '@/lib/constants'

type Props = {
  value: ChainId
  disabled?: boolean
  onChange: (chain: ChainId) => void
}

export function NetworkSelector({ value, disabled = false, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div>
        <label htmlFor="wallet-network" className="text-sm font-medium">
          Wallet network
        </label>
        <p id="wallet-network-help" className="mt-1 text-xs text-muted-foreground">
          Swaps stay on this network. Cross-chain transfers are not used.
        </p>
      </div>
      <span className="relative w-full sm:w-56">
        <select
          id="wallet-network"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.value as ChainId)}
          aria-describedby="wallet-network-help"
          className="h-11 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-10 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {AVAILABLE_CHAINS.map((chain) => (
            <option key={chain} value={chain}>
              {NETWORKS[chain].displayName}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      </span>
    </div>
  )
}
