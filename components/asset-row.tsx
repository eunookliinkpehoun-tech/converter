'use client'

import { BadgeCheck, CheckCircle2, ExternalLink, Loader2, PenLine, XCircle } from 'lucide-react'
import { SelectionCheckbox } from '@/components/selection-checkbox'
import { NETWORKS, type Asset, type ChainId, type ConversionStatus } from '@/lib/constants'
import { formatAmount, formatUsd } from '@/lib/format'

type Props = {
  asset: Asset
  chain: ChainId
  selected: boolean
  status?: ConversionStatus
  destination: boolean
  disabled: boolean
  onToggle: () => void
}

export function AssetRow({ asset, chain, selected, status, destination, disabled, onToggle }: Props) {
  return (
    <li
      className={`flex items-center gap-3 px-4 py-3.5 transition-colors sm:gap-4 sm:px-5 ${
        selected ? 'bg-accent/30' : destination ? 'bg-accent/15' : 'hover:bg-muted/40'
      }`}
    >
      <SelectionCheckbox
        checked={selected}
        onChange={onToggle}
        disabled={disabled || destination || asset.amount === '0'}
        label={destination ? `${asset.symbol} is the destination token` : `${selected ? 'Deselect' : 'Select'} ${asset.symbol}`}
      />

      <TokenIcon icon={asset.icon} symbol={asset.symbol} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{asset.symbol}</span>
          {asset.verified && <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="Verified token" />}
        </div>
        <p className="truncate text-xs text-muted-foreground">{asset.name}</p>
        {status?.state === 'awaiting-signature' && status.detail ? (
          <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-warning">{status.detail}</p>
        ) : null}
      </div>

      <div className="text-right">
        <p className="font-mono text-sm tabular-nums">{formatUsd(asset.usdValue)}</p>
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          {formatAmount(asset.walletAmount ?? asset.uiAmount)} {asset.symbol}
        </p>
        {asset.walletAmount !== undefined && asset.uiAmount < asset.walletAmount ? (
          <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {formatAmount(asset.uiAmount)} available to sell
          </p>
        ) : null}
      </div>

      <div className="hidden w-28 justify-end sm:flex">
        {destination ? <DestinationBadge /> : <StatusBadge chain={chain} status={status} />}
      </div>
      <div className="flex sm:hidden">
        {destination ? <DestinationBadge compact /> : <StatusBadge chain={chain} status={status} compact />}
      </div>
    </li>
  )
}

function TokenIcon({ icon, symbol }: { icon: string | null; symbol: string }) {
  if (!icon) {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
        {symbol.slice(0, 2).toUpperCase()}
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={icon} alt="" width={36} height={36} loading="lazy" className="size-9 shrink-0 rounded-full bg-muted object-cover" />
  )
}

function DestinationBadge({ compact }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center rounded-full bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
      {compact ? 'Target' : 'Destination'}
    </span>
  )
}

function StatusBadge({ chain, status, compact }: { chain: ChainId; status?: ConversionStatus; compact?: boolean }) {
  if (!status || status.state === 'idle') return null

  const base = 'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium'

  switch (status.state) {
    case 'quoting':
    case 'executing':
      return (
        <span className={`${base} bg-muted text-muted-foreground`} role="status">
          <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          {!compact && (status.state === 'quoting' ? 'Quoting' : 'Swapping')}
          {compact && <span className="sr-only">{status.state === 'quoting' ? 'Quoting' : 'Swapping'}</span>}
        </span>
      )
    case 'awaiting-signature':
      return (
        <span className={`${base} bg-warning/15 text-warning`} role="status">
          <PenLine className="size-3" aria-hidden="true" />
          {compact ? <span className="sr-only">Review and sign in wallet</span> : 'Sign'}
        </span>
      )
    case 'success':
      return (
        <a
          href={`${NETWORKS[chain].explorerTxUrl}${status.signature}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${base} bg-success/15 text-success hover:bg-success/25`}
        >
          <CheckCircle2 className="size-3" aria-hidden="true" />
          {compact ? <span className="sr-only">Sold, view transaction</span> : 'Sold'}
          {!compact && <ExternalLink className="size-3" aria-hidden="true" />}
        </a>
      )
    case 'failed':
      return (
        <span className={`${base} bg-destructive/15 text-destructive`} title={status.error}>
          <XCircle className="size-3" aria-hidden="true" />
          {compact ? <span className="sr-only">Failed: {status.error}</span> : 'Failed'}
        </span>
      )
  }
}
