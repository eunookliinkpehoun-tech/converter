import { EVM_NATIVE_ADDRESS, NETWORKS, type Asset, type ChainId, type PortfolioResponse } from '@/lib/constants'
import { formatEvmUnits, parseEvmUnits } from '@/lib/evm-utils'

const PRICE_BATCH_SIZE = 25
const MAX_TRACKED_ASSETS = 500

type EvmChainId = Exclude<ChainId, 'solana'>

type AlchemyToken = {
  network?: string
  tokenAddress?: string | null
  tokenBalance?: string | number | null
  tokenMetadata?: {
    name?: string | null
    symbol?: string | null
    decimals?: number | string | null
    logo?: string | null
  } | null
}

type AlchemyBalanceResponse = {
  data?: { tokens?: AlchemyToken[]; pageKey?: string }
  tokens?: AlchemyToken[]
  pageKey?: string
  error?: { message?: string } | string
}

type AlchemyPrice = {
  network?: string
  address?: string
  prices?: Array<{ currency?: string; value?: string | number }>
}

type AlchemyPriceResponse = {
  data?: { prices?: AlchemyPrice[] } | AlchemyPrice[]
  prices?: AlchemyPrice[]
}

type BalanceItem = {
  mint: string
  raw: bigint
  decimals: number
  name: string
  symbol: string
  icon: string | null
  native: boolean
}

function parseRawAmount(value: string | number | null | undefined, decimals: number): bigint {
  if (value === null || value === undefined) return BigInt(0)
  const amount = String(value).trim()
  if (!amount) return BigInt(0)
  if (/^0x[0-9a-f]+$/i.test(amount)) return BigInt(amount)
  if (/^\d+$/.test(amount)) return BigInt(amount)
  return parseEvmUnits(amount, decimals)
}

function toUiAmount(raw: bigint, decimals: number): number {
  const value = Number(formatEvmUnits(raw, decimals))
  return Number.isFinite(value) ? value : 0
}

function safeIcon(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function getUsdPrice(entry: AlchemyPrice): number | null {
  const price = entry.prices?.find((item) => item.currency?.toLowerCase() === 'usd')
  const value = Number(price?.value)
  return Number.isFinite(value) && value >= 0 ? value : null
}

async function loadPrices(chain: EvmChainId, items: BalanceItem[], apiKey: string): Promise<Map<string, number>> {
  const network = NETWORKS[chain]
  const addresses = items.map((item) => ({
    network: network.alchemyNetwork!,
    address: item.native ? network.wrappedNativeAddress! : item.mint,
  }))
  const batches: typeof addresses[] = []
  for (let index = 0; index < addresses.length; index += PRICE_BATCH_SIZE) {
    batches.push(addresses.slice(index, index + PRICE_BATCH_SIZE))
  }

  const responses = await Promise.all(
    batches.map(async (batch) => {
      try {
        const response = await fetch(`https://api.g.alchemy.com/prices/v1/${encodeURIComponent(apiKey)}/tokens/by-address`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ addresses: batch }),
          cache: 'no-store',
        })
        if (!response.ok) return [] as AlchemyPrice[]
        const payload = (await response.json()) as AlchemyPriceResponse
        if (Array.isArray(payload.data)) return payload.data
        return payload.data?.prices ?? payload.prices ?? []
      } catch {
        return [] as AlchemyPrice[]
      }
    }),
  )

  const prices = new Map<string, number>()
  for (const entry of responses.flat()) {
    if (!entry.address) continue
    const value = getUsdPrice(entry)
    if (value !== null) prices.set(entry.address.toLowerCase(), value)
  }
  return prices
}

function getErrorMessage(error: AlchemyBalanceResponse['error']): string | null {
  if (typeof error === 'string') return error
  return error?.message ?? null
}

export async function getEvmPortfolio(address: string, chain: EvmChainId): Promise<PortfolioResponse> {
  const apiKey = process.env.ALCHEMY_API_KEY
  if (!apiKey) throw new Error('Portfolio data is not configured. Please contact the site administrator.')

  const network = NETWORKS[chain]
  const endpoint = `https://api.g.alchemy.com/data/v1/${encodeURIComponent(apiKey)}/assets/tokens/balances/by-address`
  const tokens: AlchemyToken[] = []
  let pageKey: string | undefined
  let hasMorePages = false
  for (let page = 0; page < 10; page += 1) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        addresses: [{ address, networks: [network.alchemyNetwork] }],
        includeNativeTokens: true,
        includeErc20Tokens: true,
        ...(pageKey ? { pageKey } : {}),
      }),
      cache: 'no-store',
    })
    const payload = (await response.json().catch(() => null)) as AlchemyBalanceResponse | null
    if (!response.ok || !payload) {
      throw new Error('Could not load wallet balances from the portfolio provider. Please retry shortly.')
    }

    const pageTokens = payload.data?.tokens ?? payload.tokens
    if (!Array.isArray(pageTokens)) {
      throw new Error(getErrorMessage(payload.error) ?? 'The portfolio provider returned an invalid balance response.')
    }
    tokens.push(...pageTokens)
    const nextPageKey = payload.data?.pageKey ?? payload.pageKey
    if (!nextPageKey || nextPageKey === pageKey || pageTokens.length === 0) {
      hasMorePages = false
      break
    }
    pageKey = nextPageKey
    hasMorePages = page === 9
  }

  const balances = new Map<string, BalanceItem>()
  for (const token of tokens) {
    const tokenAddress = token.tokenAddress?.toLowerCase()
    const native = !tokenAddress || tokenAddress === EVM_NATIVE_ADDRESS.toLowerCase()
    const mint = native ? EVM_NATIVE_ADDRESS : tokenAddress
    if (!native && !/^0x[a-f0-9]{40}$/.test(mint)) continue

    const metadataDecimals = Number(token.tokenMetadata?.decimals)
    const decimals = Number.isInteger(metadataDecimals) && metadataDecimals >= 0 && metadataDecimals <= 36
      ? metadataDecimals
      : native
        ? network.nativeDecimals
        : mint === network.stablecoinAddress.toLowerCase()
          ? network.stablecoinDecimals
          : 18

    let raw: bigint
    try {
      raw = parseRawAmount(token.tokenBalance, decimals)
    } catch {
      continue
    }
    if (raw <= BigInt(0)) continue

    const previous = balances.get(mint)
    balances.set(mint, {
      mint,
      raw: (previous?.raw ?? BigInt(0)) + raw,
      decimals,
      name: native ? network.nativeName : token.tokenMetadata?.name?.trim() || 'Unknown token',
      symbol: native ? network.nativeSymbol : token.tokenMetadata?.symbol?.trim() || `${mint.slice(0, 6)}…`,
      icon: native ? null : safeIcon(token.tokenMetadata?.logo),
      native,
    })
  }

  const allItems = [...balances.values()]
  const stableAddress = network.stablecoinAddress.toLowerCase()
  const priorityItems = allItems.filter((item) => item.native || item.mint === stableAddress)
  const otherItems = allItems.filter((item) => !item.native && item.mint !== stableAddress)
  const truncated = hasMorePages || allItems.length > MAX_TRACKED_ASSETS
  const items = [...priorityItems, ...otherItems].slice(0, MAX_TRACKED_ASSETS)
  const prices = await loadPrices(chain, items, apiKey)
  const reserve = BigInt(network.feeReserveRaw)

  const assets: Asset[] = items.map((item) => {
    const availableRaw = item.native ? (item.raw > reserve ? item.raw - reserve : BigInt(0)) : item.raw
    const uiAmount = toUiAmount(availableRaw, item.decimals)
    const walletAmount = toUiAmount(item.raw, item.decimals)
    const priceAddress = item.native ? network.wrappedNativeAddress?.toLowerCase() : item.mint
    const usdPrice = item.mint === stableAddress ? prices.get(item.mint) ?? 1 : priceAddress ? prices.get(priceAddress) ?? null : null

    return {
      mint: item.mint,
      symbol: item.symbol,
      name: item.name,
      icon: item.icon,
      decimals: item.decimals,
      amount: availableRaw.toString(),
      uiAmount,
      walletAmount: item.native ? walletAmount : undefined,
      usdPrice,
      usdValue: usdPrice !== null ? walletAmount * usdPrice : null,
      verified: item.native || item.mint === stableAddress,
    }
  })

  assets.sort((left, right) => (right.usdValue ?? -1) - (left.usdValue ?? -1))
  const stableAsset = assets.find((asset) => asset.mint.toLowerCase() === stableAddress)
  return {
    assets,
    usdtBalance: stableAsset?.walletAmount ?? stableAsset?.uiAmount ?? 0,
    truncated,
  }
}
