'use client'

import { useConnectWallet, useLoginWithSiws } from '@privy-io/react-auth'
import { useWallets, type ConnectedStandardSolanaWallet } from '@privy-io/react-auth/solana'
import { useCallback, useRef, useState } from 'react'
import { SOLANA_WALLET_LIST } from '@/lib/solana-wallets'
import { bytesToBase64 } from '@/lib/format'

function getWalletErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  if (/reject|denied|cancel|declined|closed/.test(message)) {
    return 'The wallet signature was cancelled. Reconnect and approve the sign-in message to continue.'
  }
  if (/origin|unauthorized|not enabled|invalid app|app id/.test(message)) {
    return 'Privy could not verify this sign-in. Check that wallet login is enabled and this site domain is allowed in Privy.'
  }
  return 'Could not sign in with this wallet. Open or unlock your Solana wallet app, then try again.'
}

export function useWalletAuth() {
  const { wallets, ready: walletsReady } = useWallets()
  const { generateSiwsMessage, loginWithSiws } = useLoginWithSiws()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inProgress = useRef(false)

  const authenticateWallet = useCallback(
    async (wallet: ConnectedStandardSolanaWallet, walletClientType?: string, connectorType?: string) => {
      if (inProgress.current) return

      inProgress.current = true
      setSigningIn(true)
      setError(null)

      try {
        const message = await generateSiwsMessage({ address: wallet.address })
        const { signature } = await wallet.signMessage({ message: new TextEncoder().encode(message) })

        await loginWithSiws({
          message,
          signature: bytesToBase64(signature),
          walletClientType,
          connectorType,
        })
      } catch (authError) {
        setError(getWalletErrorMessage(authError))
      } finally {
        inProgress.current = false
        setSigningIn(false)
      }
    },
    [generateSiwsMessage, loginWithSiws],
  )

  const { connectWallet } = useConnectWallet({
    onSuccess: ({ wallet }) => {
      if (wallet.type !== 'solana') {
        setError('Please choose a Solana wallet to continue.')
        return
      }
      void authenticateWallet(wallet.provider, wallet.walletClientType, wallet.connectorType)
    },
    onError: (connectError) => setError(getWalletErrorMessage(connectError)),
  })

  const connect = useCallback(() => {
    setError(null)
    const existingWallet = wallets[0]

    if (existingWallet) {
      void authenticateWallet(existingWallet)
      return
    }

    try {
      connectWallet({ walletChainType: 'solana-only', walletList: SOLANA_WALLET_LIST })
    } catch (connectError) {
      setError(getWalletErrorMessage(connectError))
    }
  }, [authenticateWallet, connectWallet, wallets])

  return { connect, error, signingIn, wallets, walletsReady }
}
