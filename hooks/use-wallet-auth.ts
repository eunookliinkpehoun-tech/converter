'use client'

import {
  useConnectWallet,
  useLoginWithSiwe,
  useLoginWithSiws,
  useWallets as useEvmWallets,
  type BaseConnectedEthereumWallet,
} from '@privy-io/react-auth'
import { useWallets as useSolanaWallets, type ConnectedStandardSolanaWallet } from '@privy-io/react-auth/solana'
import { useCallback, useRef, useState } from 'react'
import { NETWORKS, type ChainId } from '@/lib/constants'
import { bytesToBase64 } from '@/lib/format'
import { SOLANA_WALLET_LIST } from '@/lib/solana-wallets'

export type ActiveWallet =
  | { type: 'solana'; wallet: ConnectedStandardSolanaWallet }
  | { type: 'ethereum'; wallet: BaseConnectedEthereumWallet }

function getWalletErrorMessage(error: unknown, chain: ChainId): string {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  if (/reject|denied|cancel|declined|closed/.test(message)) {
    return 'The wallet request was cancelled. Reconnect and approve the sign-in message to continue.'
  }
  if (/origin|unauthorized|not enabled|invalid app|app id/.test(message)) {
    return 'Privy could not verify this sign-in. Check that wallet login is enabled and this site domain is allowed in Privy.'
  }
  return `Could not sign in with ${NETWORKS[chain].name}. Open or unlock your wallet app, then try again.`
}

export function useWalletAuth(chain: ChainId) {
  const { wallets: solanaWallets, ready: solanaWalletsReady } = useSolanaWallets()
  const { wallets: evmWallets, ready: evmWalletsReady } = useEvmWallets()
  const { generateSiwsMessage, loginWithSiws } = useLoginWithSiws()
  const { generateSiweMessage, loginWithSiwe } = useLoginWithSiwe()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inProgress = useRef(false)

  const authenticateSolana = useCallback(
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
        setError(getWalletErrorMessage(authError, 'solana'))
      } finally {
        inProgress.current = false
        setSigningIn(false)
      }
    },
    [generateSiwsMessage, loginWithSiws],
  )

  const authenticateEvm = useCallback(
    async (wallet: BaseConnectedEthereumWallet, selectedChain: Exclude<ChainId, 'solana'>) => {
      if (inProgress.current) return

      inProgress.current = true
      setSigningIn(true)
      setError(null)
      try {
        const chainId = NETWORKS[selectedChain].numericChainId
        if (!chainId) throw new Error('Unsupported EVM network')
        await wallet.switchChain(chainId)
        const message = await generateSiweMessage({ address: wallet.address, chainId: `eip155:${chainId}` })
        const signature = await wallet.sign(message)
        await loginWithSiwe({
          message,
          signature,
          walletClientType: wallet.walletClientType,
          connectorType: wallet.connectorType,
        })
      } catch (authError) {
        setError(getWalletErrorMessage(authError, selectedChain))
      } finally {
        inProgress.current = false
        setSigningIn(false)
      }
    },
    [generateSiweMessage, loginWithSiwe],
  )

  const { connectWallet } = useConnectWallet({
    onSuccess: ({ wallet }) => {
      if (chain === 'solana' && wallet.type === 'solana') {
        void authenticateSolana(wallet.provider, wallet.walletClientType, wallet.connectorType)
      } else if (chain !== 'solana' && wallet.type === 'ethereum') {
        void authenticateEvm(wallet, chain)
      } else {
        setError(`Please choose a ${NETWORKS[chain].name} wallet to continue.`)
      }
    },
    onError: (connectError) => setError(getWalletErrorMessage(connectError, chain)),
  })

  const connect = useCallback(() => {
    setError(null)

    if (chain === 'solana') {
      const existingWallet = solanaWallets[0]
      if (existingWallet) {
        void authenticateSolana(existingWallet)
        return
      }
      try {
        connectWallet({ walletChainType: 'solana-only', walletList: SOLANA_WALLET_LIST })
      } catch (connectError) {
        setError(getWalletErrorMessage(connectError, chain))
      }
      return
    }

    const existingWallet = evmWallets[0]
    if (existingWallet) {
      void authenticateEvm(existingWallet, chain)
      return
    }
    try {
      connectWallet({ walletChainType: 'ethereum-only' })
    } catch (connectError) {
      setError(getWalletErrorMessage(connectError, chain))
    }
  }, [authenticateEvm, authenticateSolana, chain, connectWallet, evmWallets, solanaWallets])

  const activeWallet: ActiveWallet | undefined =
    chain === 'solana'
      ? solanaWallets[0]
        ? { type: 'solana', wallet: solanaWallets[0] }
        : undefined
      : evmWallets[0]
        ? { type: 'ethereum', wallet: evmWallets[0] }
        : undefined

  return {
    connect,
    error,
    signingIn,
    activeWallet,
    walletsReady: chain === 'solana' ? solanaWalletsReady : evmWalletsReady,
  }
}
