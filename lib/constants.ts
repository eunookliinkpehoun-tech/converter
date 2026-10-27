export const SOL_MINT = 'So11111111111111111111111111111111111111112'
export const SOL_USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
export const SOL_FEE_RESERVE_LAMPORTS = BigInt(15_000_000)

export const EVM_NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000'
export const BNB_CHAIN_ID = 56
export const BNB_USDT = '0x55d398326f99059fF775485246999027B3197955'
export const BNB_WRAPPED_NATIVE = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
export const POLYGON_CHAIN_ID = 137
export const POLYGON_USDT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
export const POLYGON_WRAPPED_NATIVE = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'

export const USDT_MINT = SOL_USDT_MINT

export type ChainId = 'solana' | 'bnb' | 'polygon'

export type NetworkConfig = {
  chainId: ChainId
  name: string
  displayName: string
  numericChainId: number | null
  alchemyNetwork: string | null
  rpcUrl?: string
  nativeSymbol: string
  nativeName: string
  nativeAddress: string
  nativeDecimals: number
  stablecoinAddress: string
  stablecoinSymbol: string
  stablecoinDecimals: number
  wrappedNativeAddress?: string
  feeReserveRaw: string
  feeReserveDisplay: string
  explorerTxUrl: string
}

export const NETWORKS: Record<ChainId, NetworkConfig> = {
  solana: {
    chainId: 'solana',
    name: 'Solana',
    displayName: 'Solana mainnet',
    numericChainId: null,
    alchemyNetwork: 'solana-mainnet',
    nativeSymbol: 'SOL',
    nativeName: 'Solana',
    nativeAddress: SOL_MINT,
    nativeDecimals: 9,
    stablecoinAddress: SOL_USDT_MINT,
    stablecoinSymbol: 'USDT',
    stablecoinDecimals: 6,
    feeReserveRaw: SOL_FEE_RESERVE_LAMPORTS.toString(),
    feeReserveDisplay: '0.015 SOL',
    explorerTxUrl: 'https://solscan.io/tx/',
  },
  bnb: {
    chainId: 'bnb',
    name: 'BNB Chain',
    displayName: 'BNB Smart Chain',
    numericChainId: BNB_CHAIN_ID,
    alchemyNetwork: 'bnb-mainnet',
    rpcUrl: 'https://bsc-dataseed1.bnbchain.org',
    nativeSymbol: 'BNB',
    nativeName: 'BNB',
    nativeAddress: EVM_NATIVE_ADDRESS,
    nativeDecimals: 18,
    stablecoinAddress: BNB_USDT,
    stablecoinSymbol: 'USDT',
    stablecoinDecimals: 18,
    wrappedNativeAddress: BNB_WRAPPED_NATIVE,
    feeReserveRaw: '2000000000000000',
    feeReserveDisplay: '0.002 BNB',
    explorerTxUrl: 'https://bscscan.com/tx/',
  },
  polygon: {
    chainId: 'polygon',
    name: 'Polygon',
    displayName: 'Polygon mainnet',
    numericChainId: POLYGON_CHAIN_ID,
    alchemyNetwork: 'polygon-mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    nativeSymbol: 'POL',
    nativeName: 'POL',
    nativeAddress: EVM_NATIVE_ADDRESS,
    nativeDecimals: 18,
    stablecoinAddress: POLYGON_USDT,
    stablecoinSymbol: 'USDT',
    stablecoinDecimals: 6,
    wrappedNativeAddress: POLYGON_WRAPPED_NATIVE,
    feeReserveRaw: '500000000000000000',
    feeReserveDisplay: '0.5 POL',
    explorerTxUrl: 'https://polygonscan.com/tx/',
  },
}

export const AVAILABLE_CHAINS: ChainId[] = ['solana', 'bnb', 'polygon']

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
  walletAmount?: number
}

export type SwapTarget = Pick<Asset, 'mint' | 'symbol' | 'name' | 'decimals' | 'icon'>

export function getBaseTargets(chain: ChainId): SwapTarget[] {
  const network = NETWORKS[chain]
  return [
    {
      mint: network.stablecoinAddress,
      symbol: network.stablecoinSymbol,
      name: `Tether USD on ${network.name}`,
      decimals: network.stablecoinDecimals,
      icon: null,
    },
    {
      mint: network.nativeAddress,
      symbol: network.nativeSymbol,
      name: network.nativeName,
      decimals: network.nativeDecimals,
      icon: null,
    },
  ]
}

export const DEFAULT_SWAP_TARGETS = getBaseTargets('solana')

export type PortfolioResponse = {
  assets: Asset[]
  usdtBalance: number
  truncated?: boolean
}

export type ConversionStatus =
  | { state: 'idle' }
  | { state: 'quoting' }
  | { state: 'awaiting-signature'; detail?: string }
  | { state: 'executing' }
  | { state: 'success'; signature: string; received: number; outputSymbol: string }
  | { state: 'failed'; error: string }
