import { ArrowRight, Loader2, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { NetworkSelector } from '@/components/network-selector'
import { Button } from '@/components/ui/button'
import { NETWORKS, type ChainId } from '@/lib/constants'

export function ConnectPanel({
  chain,
  onChangeChain,
  onConnect,
  loading,
  error,
}: {
  chain: ChainId
  onChangeChain: (chain: ChainId) => void
  onConnect: () => void
  loading: boolean
  error?: string | null
}) {
  const network = NETWORKS[chain]
  const walletNames = chain === 'solana' ? 'Phantom, Solflare, Backpack, OKX and WalletConnect' : 'MetaMask, Coinbase Wallet, OKX and WalletConnect'
  const features = [
    { icon: Zap, title: 'Two base assets', text: `Sell spendable assets into USDT or ${network.nativeSymbol}.` },
    { icon: Sparkles, title: 'Same-network routes', text: 'Jupiter on Solana and LI.FI swaps on BNB Chain or Polygon.' },
    { icon: ShieldCheck, title: 'Non-custodial', text: 'You approve each sale in your wallet. Assets remain in your wallet until confirmed.' },
  ]

  return (
    <section className="flex flex-1 flex-col items-center text-center" aria-labelledby="hero-title">
      <div className="w-full text-left">
        <NetworkSelector value={chain} onChange={onChangeChain} disabled={loading} />
      </div>
      <span className="mb-6 mt-10 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
        <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
        {network.displayName}
      </span>
      <h1 id="hero-title" className="max-w-xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        Sell your wallet assets into <span className="text-primary">USDT or {network.nativeSymbol}</span>.
      </h1>
      <p className="mt-5 max-w-md text-pretty leading-relaxed text-muted-foreground">
        Spendable balances start selected; deselect anything you want to keep. Each sale stays on this network and must
        be approved in your wallet.
      </p>

      <Button size="lg" onClick={onConnect} disabled={loading} className="mt-9 h-12 gap-2 px-7 text-base">
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Connecting…
          </>
        ) : (
          <>
            Connect {network.name} wallet
            <ArrowRight className="size-4" aria-hidden="true" />
          </>
        )}
      </Button>
      {error ? (
        <p className="mt-4 max-w-md rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground">{walletNames}</p>

      <ul className="mt-16 grid w-full gap-3 text-left sm:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
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
