'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useState } from 'react'
import { ConnectPanel } from '@/components/connect-panel'
import { EvmPortfolioPanel } from '@/components/evm-portfolio-panel'
import { PortfolioPanel } from '@/components/portfolio-panel'
import { SiteHeader } from '@/components/site-header'
import { useWalletAuth } from '@/hooks/use-wallet-auth'
import { type ChainId } from '@/lib/constants'

export function Converter() {
  const [chain, setChain] = useState<ChainId>('solana')
  const { ready, authenticated, logout } = usePrivy()
  const { connect, error, signingIn, activeWallet, walletsReady } = useWalletAuth(chain)
  const wallet = authenticated ? activeWallet : undefined
  const booting = !ready || (authenticated && !walletsReady)
  const connecting = booting || signingIn

  const connectPanel = <ConnectPanel chain={chain} onChangeChain={setChain} onConnect={connect} loading={connecting} error={error} />

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        address={wallet?.wallet.address}
        onConnect={connect}
        onDisconnect={() => void logout()}
        disabled={connecting}
      />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 pb-40 pt-8 sm:px-6 sm:pt-14">
        {chain === 'solana' ? (
          wallet?.type === 'solana' ? (
            <PortfolioPanel key={`${chain}:${wallet.wallet.address}`} chain={chain} onChangeChain={setChain} wallet={wallet.wallet} />
          ) : (
            connectPanel
          )
        ) : wallet?.type === 'ethereum' ? (
          <EvmPortfolioPanel
            key={`${chain}:${wallet.wallet.address}`}
            chain={chain}
            onChangeChain={setChain}
            wallet={wallet.wallet}
          />
        ) : (
          connectPanel
        )}
      </main>
    </div>
  )
}
