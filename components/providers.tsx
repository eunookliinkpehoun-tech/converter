'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana'
import type { ReactNode } from 'react'
import { MissingConfig } from '@/components/missing-config'
import { NETWORKS } from '@/lib/constants'

const solanaConnectors = toSolanaWalletConnectors({ shouldAutoConnect: true })
const bnbChain = {
  id: 56,
  name: 'BNB Smart',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: { default: { http: [NETWORKS.bnb.rpcUrl!] } },
  blockExplorers: { default: { name: 'BscScan', url: 'https://bscscan.com' } },
}
const polygonChain = {
  id: 137,
  name: 'Polygon',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: { default: { http: [NETWORKS.polygon.rpcUrl!] } },
  blockExplorers: { default: { name: 'PolygonScan', url: 'https://polygonscan.com' } },
}

export function Providers({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  if (!appId) return <MissingConfig />

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['wallet'],
        supportedChains: [bnbChain, polygonChain],
        defaultChain: bnbChain,
        appearance: {
          theme: 'dark',
          accentColor: '#2fcf9a',
          walletChainType: 'ethereum-and-solana',
          showWalletLoginFirst: true,
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
