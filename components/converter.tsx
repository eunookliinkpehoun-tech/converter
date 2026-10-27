'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { SiteHeader } from '@/components/site-header'
import { ConnectPanel } from '@/components/connect-panel'
import { PortfolioPanel } from '@/components/portfolio-panel'

export function Converter() {
  const { ready, authenticated, login, logout } = usePrivy()
  const { wallets, ready: walletsReady } = useWallets()
  const wallet = authenticated ? wallets[0] : undefined
  const booting = !ready || (authenticated && !walletsReady)

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader address={wallet?.address} onConnect={login} onDisconnect={logout} disabled={booting} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-40 pt-8 sm:px-6 sm:pt-14">
        {wallet ? (
          <PortfolioPanel key={wallet.address} wallet={wallet} />
        ) : (
          <ConnectPanel onConnect={login} loading={booting} />
        )}
      </main>
    </div>
  )
}
