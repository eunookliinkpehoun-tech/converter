'use client'

import type { ConnectedStandardSolanaWallet } from '@privy-io/react-auth/solana'
import useSWR from 'swr'
import { PortfolioCore } from '@/components/portfolio-core'
import { useConvert } from '@/hooks/use-convert'
import type { ChainId, PortfolioResponse } from '@/lib/constants'

async function fetcher(url: string): Promise<PortfolioResponse> {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Failed to load portfolio')
  return data
}

type Props = {
  chain: 'solana'
  onChangeChain: (chain: ChainId) => void
  wallet: ConnectedStandardSolanaWallet
}

export function PortfolioPanel({ chain, onChangeChain, wallet }: Props) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    `/api/portfolio/${wallet.address}?chain=${chain}`,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: false },
  )
  const { convert, statuses, running, reset } = useConvert(() => {
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
      onSell={(assets, destination) => void convert(assets, wallet, destination)}
      onDismiss={reset}
    />
  )
}
