'use client'

import { usePrivy } from '@privy-io/react-auth'
import { SiteHeader } from '@/components/site-header'
import { ConnectPanel } from '@/components/connect-panel'
import { PortfolioPanel } from '@/components/portfolio-panel'
import { useWalletAuth } from '@/hooks/use-wallet-auth'

export function Converter() {
  const { ready, authenticated, logout } = usePrivy()
  const { connect, error, signingIn, wallets, walletsReady } = useWalletAuth()
  const wallet = authenticated ? wallets[0] : undefined
  const booting = !ready || (authenticated && !walletsReady)
  const connecting = booting || signingIn

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader address={wallet?.address} onConnect={connect} onDisconnect={logout} disabled={connecting} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-40 pt-8 sm:px-6 sm:pt-14">
        {wallet ? (
          <PortfolioPanel key={wallet.address} wallet={wallet} />
        ) : (
          <ConnectPanel onConnect={connect} loading={connecting} error={error} />
        )}
      </main>
    </div>
  )
}
