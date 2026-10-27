'use client'

import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AssetRow } from '@/components/asset-row'
import { ConvertBar } from '@/components/convert-bar'
import { DestinationSelect } from '@/components/destination-select'
import { NetworkSelector } from '@/components/network-selector'
import { SelectionCheckbox } from '@/components/selection-checkbox'
import { Button } from '@/components/ui/button'
import { formatUsd } from '@/lib/format'
import {
  getBaseTargets,
  NETWORKS,
  type Asset,
  type ChainId,
  type ConversionStatus,
  type SwapTarget,
} from '@/lib/constants'

type Props = {
  chain: ChainId
  onChangeChain: (chain: ChainId) => void
  assets: Asset[]
  usdtBalance: number
  isLoading: boolean
  isValidating: boolean
  error: string | null
  truncated?: boolean
  statuses: Record<string, ConversionStatus>
  running: boolean
  onRefresh: () => void
  onSell: (assets: Asset[], destination: SwapTarget) => void
  onDismiss: () => void
}

function sameMint(chain: ChainId, left: string, right: string) {
  return chain === 'solana' ? left === right : left.toLowerCase() === right.toLowerCase()
}

export function PortfolioCore({
  chain,
  onChangeChain,
  assets,
  usdtBalance,
  isLoading,
  isValidating,
  error,
  truncated = false,
  statuses,
  running,
  onRefresh,
  onSell,
  onDismiss,
}: Props) {
  const network = NETWORKS[chain]
  const [destinationMint, setDestinationMint] = useState(() => getBaseTargets(chain)[0].mint)
  const destinations = useMemo(
    () =>
      getBaseTargets(chain).map((target) => {
        const walletAsset = assets.find((asset) => sameMint(chain, asset.mint, target.mint))
        return walletAsset ? { ...target, icon: walletAsset.icon } : target
      }),
    [assets, chain],
  )
  const destination = destinations.find((target) => sameMint(chain, target.mint, destinationMint)) ?? destinations[0]
  const selectableAssets = assets.filter(
    (asset) => !sameMint(chain, asset.mint, destination.mint) && asset.amount !== '0',
  )
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const isSelected = (asset: Asset) =>
    !sameMint(chain, asset.mint, destination.mint) &&
    asset.amount !== '0' &&
    (overrides[asset.mint] ?? true)
  const selected = selectableAssets.filter(isSelected)
  const unpricedCount = selected.filter((asset) => asset.usdValue === null).length
  const allSelected = selectableAssets.length > 0 && selected.length === selectableAssets.length

  const totals = useMemo(() => {
    const portfolio = assets.reduce((sum, asset) => sum + (asset.usdValue ?? 0), 0)
    const selection = selected.reduce(
      (sum, asset) => sum + (asset.usdPrice !== null ? asset.uiAmount * asset.usdPrice : asset.usdValue ?? 0),
      0,
    )
    return { portfolio, selection }
  }, [assets, selected])

  const toggleAll = () => {
    const value = !allSelected
    setOverrides((previous) => ({
      ...previous,
      ...Object.fromEntries(selectableAssets.map((asset) => [asset.mint, value])),
    }))
  }

  const changeDestination = (mint: string) => {
    if (sameMint(chain, mint, destination.mint)) return
    setDestinationMint(mint)
    onDismiss()
  }

  const successful = Object.values(statuses).filter((status) => status.state === 'success')
  const received = successful.reduce((sum, status) => sum + status.received, 0)
  const feeNote =
    chain === 'solana'
      ? `A reserve of ${network.feeReserveDisplay} is kept for network fees. The sale estimate may change before you approve it.`
      : `A reserve of ${network.feeReserveDisplay} is kept for network fees. Sale estimates use a 1% slippage limit and may change before approval.`

  return (
    <section aria-labelledby="portfolio-title" className="flex flex-col gap-6">
      <NetworkSelector value={chain} onChange={onChangeChain} disabled={running} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Estimated wallet value" value={isLoading ? null : formatUsd(totals.portfolio)} />
        <Stat label="USDT balance" value={isLoading ? null : formatUsd(usdtBalance)} accent />
        <Stat label="Assets found" value={isLoading ? null : String(assets.length)} />
      </div>

      <DestinationSelect
        options={destinations}
        value={destination.mint}
        disabled={isLoading || running}
        onChange={changeDestination}
      />

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <SelectionCheckbox
              checked={allSelected}
              indeterminate={selected.length > 0 && !allSelected}
              onChange={toggleAll}
              disabled={running || selectableAssets.length === 0}
              label={allSelected ? 'Deselect all sellable assets' : 'Select all sellable assets'}
            />
            <h1 id="portfolio-title" className="text-sm font-medium">
              Your wallet assets
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isValidating || running}
            className="gap-2 text-muted-foreground"
          >
            <RefreshCw className={`size-3.5 ${isValidating ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <LoadingRows />
        ) : error ? (
          <div className="px-5 py-12 text-center text-sm">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={onRefresh}>
              Try again
            </Button>
          </div>
        ) : assets.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-muted-foreground">
            No assets found in this wallet on {network.name}.
          </p>
        ) : (
          <ul className="divide-y">
            {assets.map((asset) => (
              <AssetRow
                key={asset.mint}
                chain={chain}
                asset={asset}
                selected={isSelected(asset)}
                status={statuses[asset.mint]}
                destination={sameMint(chain, asset.mint, destination.mint)}
                disabled={running}
                onToggle={() => setOverrides((previous) => ({ ...previous, [asset.mint]: !isSelected(asset) }))}
              />
            ))}
          </ul>
        )}
      </div>

      {truncated ? (
        <p className="text-center text-xs text-warning" role="status">
          The wallet contains more assets than can be displayed at once. Refresh after selling this batch to load the next set.
        </p>
      ) : null}
      <p className="text-pretty text-center text-xs leading-relaxed text-muted-foreground">{feeNote}</p>

      <ConvertBar
        count={selected.length}
        estimate={totals.selection}
        running={running}
        received={successful.length > 0 && !running ? received : null}
        destinationSymbol={destination.symbol}
        receivedLabel={chain === 'solana' ? 'Received' : 'Minimum expected'}
        unpricedCount={unpricedCount}
        onSell={() => onSell(selected, destination)}
        onDismiss={onDismiss}
      />
    </section>
  )
}

function Stat({ label, value, accent }: { label: string; value: string | null; accent?: boolean }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      {value === null ? (
        <div className="mt-2 h-6 w-24 animate-pulse rounded bg-muted" />
      ) : (
        <p className={`mt-1 font-mono text-xl font-medium tabular-nums ${accent ? 'text-primary' : ''}`}>{value}</p>
      )}
    </div>
  )
}

function LoadingRows() {
  return (
    <ul className="divide-y" aria-label="Loading wallet assets">
      {Array.from({ length: 4 }).map((_, index) => (
        <li key={index} className="flex items-center gap-4 px-4 py-4 sm:px-5">
          <div className="size-5 animate-pulse rounded bg-muted" />
          <div className="size-9 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </li>
      ))}
    </ul>
  )
}
