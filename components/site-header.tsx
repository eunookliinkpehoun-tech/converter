import { LogOut, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { shortAddress } from '@/lib/format'

type Props = {
  address?: string
  onConnect: () => void
  onDisconnect: () => void
  disabled: boolean
}

export function SiteHeader({ address, onConnect, onDisconnect, disabled }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-8 items-center justify-center rounded-lg bg-primary font-mono text-sm font-bold text-primary-foreground"
            aria-hidden="true"
          >
            ₮
          </span>
          <span className="text-base font-semibold tracking-tight">Sweep</span>
        </div>

        {address ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 font-mono text-xs">
              <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
              <span className="sr-only">Connected wallet </span>
              {shortAddress(address)}
            </span>
            <Button variant="ghost" size="icon" onClick={onDisconnect} aria-label="Disconnect wallet">
              <LogOut className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={onConnect} disabled={disabled}>
            <Wallet className="size-4" aria-hidden="true" />
            Connect
          </Button>
        )}
      </div>
    </header>
  )
}
