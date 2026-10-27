'use client'

import { ArrowRightLeft, CheckCircle2, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatAmount, formatUsd } from '@/lib/format'

type Props = {
  count: number
  estimate: number
  running: boolean
  received: number | null
  destinationSymbol: string
  onConvert: () => void
  onDismiss: () => void
}

export function ConvertBar({ count, estimate, running, received, destinationSymbol, onConvert, onDismiss }: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        {received !== null ? (
          <div className="flex items-center gap-3" role="status">
            <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden="true" />
            <div>
            <p className="text-sm font-medium">Sale complete</p>
            <p className="text-xs text-muted-foreground">
                Estimated received <span className="font-mono text-foreground">{formatAmount(received)} {destinationSymbol}</span>
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onDismiss} aria-label="Dismiss summary" className="ml-auto sm:ml-2">
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium">
              {count} {count === 1 ? 'asset' : 'assets'} selected
            </p>
            <p className="text-xs text-muted-foreground">
              Estimated value <span className="font-mono text-foreground">{formatUsd(estimate)}</span> before fees
            </p>
          </div>
        )}

        <Button
          size="lg"
          onClick={onConvert}
          disabled={count === 0 || running}
          className="h-12 w-full gap-2 px-6 text-base sm:w-auto"
        >
          {running ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Selling to {destinationSymbol}…
            </>
          ) : (
            <>
              <ArrowRightLeft className="size-4" aria-hidden="true" />
              Sell to {destinationSymbol}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
