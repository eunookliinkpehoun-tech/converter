'use client'

import type { BaseConnectedEthereumWallet } from '@privy-io/react-auth'
import useSWR from 'swr'
import { PortfolioCore } from '@/components/portfolio-core'
import { useEvmSell } from '@/hooks/use-evm-sell'
import type { ChainId, PortfolioResponse } from '@/lib/constants'

type EvmChainId = Exclude<ChainId, 'solana'>

async function fetcher(url: string): Promise<PortfolioResponse> {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Failed to load portfolio')
  return data
}

type Props = {
  chain: EvmChainId
  onChangeChain: (chain: ChainId) => void
  wallet: BaseConnectedEthereumWallet
}

export function EvmPortfolioPanel({ chain, onChangeChain, wallet }: Props) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    `/api/portfolio/${wallet.address}?chain=${chain}`,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: false },
  )
  const { sell, statuses, running, reset } = useEvmSell(() => {
    setTimeout(() => void mutate(), 2500)
  })

  return (
    <PortfolioCore
      chain={chain}
      onChangeChain={onChangeChain}
      assets={data?.assets ?? []}
      usdtBalance={data?.usdtBalance ?? 0}
      isLoading={isLoading}
      isValidating={isValidating}
      error={error?.message ?? null}
      truncated={data?.truncated}
      statuses={statuses}
      running={running}
      onRefresh={() => void mutate()}
      onSell={(assets, destination) => void sell(assets, wallet, chain, destination)}
      onDismiss={reset}
    />
  )
}
