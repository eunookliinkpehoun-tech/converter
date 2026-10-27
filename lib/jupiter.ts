import { SOL_MINT, SOL_FEE_RESERVE_LAMPORTS, USDT_MINT, type Asset } from './constants'

const JUPITER_BASE = 'https://api.jup.ag'

function headers(): HeadersInit {
  const key = process.env.JUPITER_API_KEY
  return key ? { 'x-api-key': key, accept: 'application/json' } : { accept: 'application/json' }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Keyless Jupiter access is rate limited, so retry 429s with backoff.
export async function jupiterFetch(path: string, init?: RequestInit, attempts = 4): Promise<Response> {
  let lastResponse: Response | undefined
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(`${JUPITER_BASE}${path}`, {
      ...init,
      headers: { ...headers(), ...(init?.headers ?? {}) },
      cache: 'no-store',
    })
    if (res.status !== 429) return res
    lastResponse = res
    await sleep(1500 * (i + 1))
  }
  return lastResponse as Response
}

type HoldingAccount = {
  amount: string
  uiAmount: number
  decimals: number
  isFrozen: boolean
}

type HoldingsResponse = {
  amount: string
  uiAmount: number
  tokens: Record<string, HoldingAccount[]>
  error?: string
}

type TokenInfo = {
  id: string
  name: string
  symbol: string
  icon?: string
  decimals: number
  usdPrice?: number
  isVerified?: boolean
}

const SEARCH_CHUNK = 100
const SEARCH_CONCURRENCY = 3
// Spam-heavy wallets can hold thousands of airdropped mints; cap metadata lookups.
const MAX_TRACKED_MINTS = 400

async function getTokenInfo(mints: string[]): Promise<Map<string, TokenInfo>> {
  const map = new Map<string, TokenInfo>()
  const chunks: string[][] = []
  for (let i = 0; i < mints.length; i += SEARCH_CHUNK) chunks.push(mints.slice(i, i + SEARCH_CHUNK))

  let next = 0
  const worker = async () => {
    while (next < chunks.length) {
      const chunk = chunks[next++]
      const res = await jupiterFetch(`/tokens/v2/search?query=${chunk.join(',')}`, undefined, 3)
      if (!res.ok) continue
      const data = (await res.json()) as TokenInfo[]
      for (const t of data) map.set(t.id, t)
    }
  }
  await Promise.all(Array.from({ length: Math.min(SEARCH_CONCURRENCY, chunks.length) }, worker))
  return map
}

export async function getPortfolio(address: string): Promise<{ assets: Asset[]; usdtBalance: number }> {
  const res = await jupiterFetch(`/ultra/v1/holdings/${address}`)
  const holdings = (await res.json().catch(() => null)) as HoldingsResponse | null
  if (!res.ok || !holdings || holdings.error) {
    throw new Error(holdings?.error ?? 'Wallet holdings are temporarily unavailable. Please retry in a moment.')
  }

  const balances = new Map<string, { raw: bigint; decimals: number }>()
  for (const [mint, accounts] of Object.entries(holdings.tokens ?? {})) {
    for (const acc of accounts) {
      if (acc.isFrozen) continue
      const prev = balances.get(mint)
      balances.set(mint, {
        raw: (prev?.raw ?? BigInt(0)) + BigInt(acc.amount),
        decimals: acc.decimals,
      })
    }
  }

  const nativeLamports = BigInt(holdings.amount ?? '0')
  const swappableLamports = nativeLamports > SOL_FEE_RESERVE_LAMPORTS ? nativeLamports - SOL_FEE_RESERVE_LAMPORTS : BigInt(0)
  // Wrapped SOL and native SOL are merged into one row; Jupiter unwraps automatically.
  const wsol = balances.get(SOL_MINT)
  balances.set(SOL_MINT, { raw: swappableLamports + (wsol?.raw ?? BigInt(0)), decimals: 9 })

  const usdtRaw = balances.get(USDT_MINT)?.raw ?? BigInt(0)

  const nonZero = [...balances.keys()].filter(
    (m) => m !== USDT_MINT && (balances.get(m)?.raw ?? BigInt(0)) > BigInt(0),
  )
  const mints = nonZero.includes(SOL_MINT)
    ? [SOL_MINT, ...nonZero.filter((m) => m !== SOL_MINT)].slice(0, MAX_TRACKED_MINTS)
    : nonZero.slice(0, MAX_TRACKED_MINTS)
  const info = await getTokenInfo([...mints, USDT_MINT])

  const assets: Asset[] = mints.map((mint) => {
    const bal = balances.get(mint)!
    const meta = info.get(mint)
    const uiAmount = Number(bal.raw) / 10 ** bal.decimals
    const usdPrice = meta?.usdPrice ?? null
    return {
      mint,
      symbol: meta?.symbol ?? `${mint.slice(0, 4)}…${mint.slice(-4)}`,
      name: meta?.name ?? 'Unknown token',
      icon: meta?.icon ?? null,
      decimals: bal.decimals,
      amount: bal.raw.toString(),
      uiAmount,
      usdPrice,
      usdValue: usdPrice !== null ? uiAmount * usdPrice : null,
      verified: Boolean(meta?.isVerified),
    }
  })

  if (usdtRaw > BigInt(0)) {
    const meta = info.get(USDT_MINT)
    const uiAmount = Number(usdtRaw) / 1e6
    const usdPrice = meta?.usdPrice ?? 1
    assets.push({
      mint: USDT_MINT,
      symbol: meta?.symbol ?? 'USDT',
      name: meta?.name ?? 'Tether USD',
      icon: meta?.icon ?? null,
      decimals: 6,
      amount: usdtRaw.toString(),
      uiAmount,
      usdPrice,
      usdValue: uiAmount * usdPrice,
      verified: meta?.isVerified ?? true,
    })
  }

  assets.sort((a, b) => (b.usdValue ?? -1) - (a.usdValue ?? -1))

  return { assets, usdtBalance: Number(usdtRaw) / 1e6 }
}
