import { ArrowRight, Loader2, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

const FEATURES = [
  { icon: Zap, title: 'Choose your destination', text: 'Convert selected assets to USDT, SOL, or another token in your wallet.' },
  { icon: Sparkles, title: 'Best price', text: 'Aggregated liquidity across Solana DEXs via Jupiter.' },
  { icon: ShieldCheck, title: 'Non-custodial', text: 'You approve every transaction. Funds never leave your wallet.' },
]

export function ConnectPanel({
  onConnect,
  loading,
  error,
}: {
  onConnect: () => void
  loading: boolean
  error?: string | null
}) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center text-center" aria-labelledby="hero-title">
      <span className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
        <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
        Solana mainnet
      </span>
      <h1 id="hero-title" className="max-w-xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        Convert your Solana assets into <span className="text-primary">the token you choose</span>.
      </h1>
      <p className="mt-5 max-w-md text-pretty leading-relaxed text-muted-foreground">
        Connect your wallet, choose USDT, SOL or another asset you already hold, then approve each swap in your wallet.
      </p>

      <Button size="lg" onClick={onConnect} disabled={loading} className="mt-9 h-12 gap-2 px-7 text-base">
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Connecting…
          </>
        ) : (
          <>
            Connect Solana wallet
            <ArrowRight className="size-4" aria-hidden="true" />
          </>
        )}
      </Button>
      {error ? (
        <p className="mt-4 max-w-md rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground">Phantom, Solflare, Backpack, OKX and WalletConnect</p>

      <ul className="mt-16 grid w-full gap-3 text-left sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-xl border bg-card p-5">
            <Icon className="size-5 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-medium">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
