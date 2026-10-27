// Solana
export const SOL_MINT = 'So11111111111111111111111111111111111111112'
export const SOL_USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
export const SOL_FEE_RESERVE_LAMPORTS = BigInt(15_000_000)

// EVM networks
export const BNB_CHAIN_ID = 56
export const BNB_RPC = 'https://bsc-dataseed1.bnbchain.org:8545'
export const BNB_USDT = '0x55d398326f99059fF775485246999027B3197955'
export const BNB_WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'

export const POLYGON_CHAIN_ID = 137
export const POLYGON_RPC = 'https://polygon-rpc.com'
export const POLYGON_USDT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
export const POLYGON_WMATIC = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'

export type ChainId = 'solana' | 'bnb' | 'polygon'

export type NetworkConfig = {
  chainId: ChainId
  name: string
  displayName: string
  nativeSymbol: string
  nativeDecimals: number
  stablecoinAddress: string
  stablecoinSymbol: string
  icon?: string
}

export const NETWORKS: Record<ChainId, NetworkConfig> = {
  solana: {
    chainId: 'solana',
    name: 'Solana',
    displayName: 'Solana mainnet',
    nativeSymbol: 'SOL',
    nativeDecimals: 9,
    stablecoinAddress: SOL_USDT_MINT,
    stablecoinSymbol: 'USDT',
  },
  bnb: {
    chainId: 'bnb',
    name: 'BNB Chain',
    displayName: 'BNB Smart Chain',
    nativeSymbol: 'BNB',
    nativeDecimals: 18,
    stablecoinAddress: BNB_USDT,
    stablecoinSymbol: 'USDT',
  },
  polygon: {
    chainId: 'polygon',
    name: 'Polygon',
    displayName: 'Polygon mainnet',
    nativeSymbol: 'MATIC',
    nativeDecimals: 18,
    stablecoinAddress: POLYGON_USDT,
    stablecoinSymbol: 'USDT',
  },
}

export const AVAILABLE_CHAINS: ChainId[] = ['solana', 'bnb', 'polygon']

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

export type PortfolioResponse = {
  assets: Asset[]
  baseTokenBalance: number
}

export type ConversionStatus =
  | { state: 'idle' }
  | { state: 'quoting' }
  | { state: 'awaiting-signature' }
  | { state: 'executing' }
  | { state: 'success'; signature: string; received: number; outputSymbol: string }
  | { state: 'failed'; error: string }
