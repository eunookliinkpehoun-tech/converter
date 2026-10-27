'use client'

import type { ConnectedStandardSolanaWallet } from '@privy-io/react-auth/solana'
import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { AssetRow } from '@/components/asset-row'
import { ConvertBar } from '@/components/convert-bar'
import { DestinationSelect } from '@/components/destination-select'
import { SelectionCheckbox } from '@/components/selection-checkbox'
import { Button } from '@/components/ui/button'
import { useConvert } from '@/hooks/use-convert'
import { DEFAULT_SWAP_TARGETS, MIN_CONVERTIBLE_USD, USDT_MINT, type Asset, type PortfolioResponse, type SwapTarget } from '@/lib/constants'
import { formatUsd } from '@/lib/format'

async function fetcher(url: string): Promise<PortfolioResponse> {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to load portfolio')
  return data
}

export function PortfolioPanel({ wallet }: { wallet: ConnectedStandardSolanaWallet }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(`/api/portfolio/${wallet.address}`, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  })
  const { convert, statuses, running, reset } = useConvert(() => {
    setTimeout(() => mutate(), 2500)
  })

  // Track explicit user toggles so freshly loaded assets get a sensible default.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [destinationMint, setDestinationMint] = useState(USDT_MINT)
  const assets = data?.assets ?? []

  const destinations = useMemo<SwapTarget[]>(() => {
    const walletAssets = new Map(assets.map((asset) => [asset.mint, asset]))
    const baseTargets = DEFAULT_SWAP_TARGETS.map((target) => {
      const walletAsset = walletAssets.get(target.mint)
      return walletAsset ? { ...target, icon: walletAsset.icon } : target
    })
    const baseMints = new Set(baseTargets.map((target) => target.mint))
    const walletTargets = assets
      .filter((asset) => !baseMints.has(asset.mint))
      .map(({ mint, symbol, name, decimals, icon }) => ({ mint, symbol, name, decimals, icon }))

    return [...baseTargets, ...walletTargets]
  }, [assets])

  const destination = destinations.find((target) => target.mint === destinationMint) ?? DEFAULT_SWAP_TARGETS[0]
  const selectableAssets = assets.filter((asset) => asset.mint !== destination.mint)
  const isSelected = (asset: Asset) =>
    asset.mint !== destination.mint &&
    (overrides[asset.mint] ?? (asset.usdValue !== null && asset.usdValue >= MIN_CONVERTIBLE_USD))
  const selected = selectableAssets.filter(isSelected)
  const allSelected = selectableAssets.length > 0 && selected.length === selectableAssets.length

  const totals = useMemo(() => {
    const portfolio = assets.reduce((sum, asset) => sum + (asset.usdValue ?? 0), 0)
    const selection = selected.reduce((sum, asset) => sum + (asset.usdValue ?? 0), 0)
    return { portfolio, selection }
  }, [assets, selected])

  const toggleAll = () => {
    const value = !allSelected
    setOverrides((prev) => ({
      ...prev,
      ...Object.fromEntries(selectableAssets.map((asset) => [asset.mint, value])),
    }))
  }

  const changeDestination = (mint: string) => {
    if (mint === destination.mint) return
    setDestinationMint(mint)
    reset()
  }

  const received = Object.values(statuses).reduce((sum, status) => (status.state === 'success' ? sum + status.received : sum), 0)
  const hasResults = Object.values(statuses).some((status) => status.state === 'success' || status.state === 'failed')

  return (
    <section aria-labelledby="portfolio-title" className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Portfolio value" value={isLoading ? null : formatUsd(totals.portfolio)} />
        <Stat label="USDT balance" value={isLoading ? null : formatUsd(data?.usdtBalance ?? 0)} accent />
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
              label={allSelected ? 'Deselect all convertible assets' : 'Select all convertible assets'}
            />
            <h1 id="portfolio-title" className="text-sm font-medium">
              Your assets
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => mutate()}
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
            <p className="text-destructive">{error.message}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => mutate()}>
              Try again
            </Button>
          </div>
        ) : assets.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-muted-foreground">
            No assets found in this wallet yet.
          </p>
        ) : (
          <ul className="divide-y">
            {assets.map((asset) => (
              <AssetRow
                key={asset.mint}
                asset={asset}
                selected={isSelected(asset)}
                status={statuses[asset.mint]}
                destination={asset.mint === destination.mint}
                disabled={running}
                onToggle={() => setOverrides((prev) => ({ ...prev, [asset.mint]: !isSelected(asset) }))}
              />
            ))}
          </ul>
        )}
      </div>

      <p className="text-pretty text-center text-xs leading-relaxed text-muted-foreground">
        A small SOL reserve is kept for network fees. Prices and routes are provided by Jupiter and may change before
        execution.
      </p>

      <ConvertBar
        count={selected.length}
        estimate={totals.selection}
        running={running}
        received={hasResults && !running ? received : null}
        destinationSymbol={destination.symbol}
        onConvert={() => convert(selected, wallet, destination)}
        onDismiss={reset}
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
    <ul className="divide-y" aria-label="Loading assets">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 px-4 py-4 sm:px-5">
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
