'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana'
import type { ReactNode } from 'react'
import { MissingConfig } from '@/components/missing-config'

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
          showWalletLoginFirst: true,
          walletList: [
            'phantom',
            'detected_solana_wallets',
            'solflare',
            'backpack',
            'jupiter',
            'okx_wallet',
            'wallet_connect_qr_solana',
          ],
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
