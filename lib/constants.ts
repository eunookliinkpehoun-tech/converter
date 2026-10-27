export const SOL_MINT = 'So11111111111111111111111111111111111111112'
export const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'

// Kept back so the wallet can still pay network fees and token account rent.
export const SOL_FEE_RESERVE_LAMPORTS = BigInt(15_000_000)

export const MIN_CONVERTIBLE_USD = 0.01

export type Asset = {
  mint: string
  symbol: string
  name: string
  icon: string | null
  decimals: number
  amount: string
  uiAmount: number
  usdPrice: number | null
  usdValue: number | null
  verified: boolean
}

export type SwapTarget = Pick<Asset, 'mint' | 'symbol' | 'name' | 'decimals' | 'icon'>

export const DEFAULT_SWAP_TARGETS: SwapTarget[] = [
  { mint: USDT_MINT, symbol: 'USDT', name: 'Tether USD', decimals: 6, icon: null },
  { mint: SOL_MINT, symbol: 'SOL', name: 'Solana', decimals: 9, icon: null },
]

export type PortfolioResponse = {
  assets: Asset[]
  usdtBalance: number
}

export type ConversionStatus =
  | { state: 'idle' }
  | { state: 'quoting' }
  | { state: 'awaiting-signature' }
  | { state: 'executing' }
  | { state: 'success'; signature: string; received: number; outputSymbol: string }
  | { state: 'failed'; error: string }
