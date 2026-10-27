'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana'
import type { ReactNode } from 'react'
import { MissingConfig } from '@/components/missing-config'
import { SOLANA_WALLET_LIST } from '@/lib/solana-wallets'

const solanaConnectors = toSolanaWalletConnectors({ shouldAutoConnect: true })

export function Providers({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  if (!appId) return <MissingConfig />

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#2fcf9a',
          walletChainType: 'solana-only',
          walletList: SOLANA_WALLET_LIST,
        },
        externalWallets: {
          solana: { connectors: solanaConnectors },
        },
        embeddedWallets: {
          solana: { createOnLogin: 'off' },
          ethereum: { createOnLogin: 'off' },
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
