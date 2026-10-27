import { NextResponse } from 'next/server'
import { jupiterFetch } from '@/lib/jupiter'
import { USDT_MINT } from '@/lib/constants'
import { isPositiveIntegerString, isSolanaAddress } from '@/lib/validation'

type OrderResponse = {
  requestId?: string
  transaction?: string | null
  outAmount?: string
  inAmount?: string
  error?: string
  errorMessage?: string
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { inputMint?: unknown; amount?: unknown; taker?: unknown } | null

  if (!body || !isSolanaAddress(body.inputMint) || !isSolanaAddress(body.taker) || !isPositiveIntegerString(body.amount)) {
    return NextResponse.json({ error: 'Invalid swap request' }, { status: 400 })
  }
  if (body.inputMint === USDT_MINT) {
    return NextResponse.json({ error: 'Asset is already USDT' }, { status: 400 })
  }

  // Output is always USDT and the taker (recipient) is always the connected wallet itself.
  const query = new URLSearchParams({
    inputMint: body.inputMint,
    outputMint: USDT_MINT,
    amount: body.amount,
    taker: body.taker,
  })

  const res = await jupiterFetch(`/swap/v2/order?${query.toString()}`)
  const data = (await res.json().catch(() => ({}))) as OrderResponse

  if (!res.ok || !data.transaction || !data.requestId) {
    const error = data.errorMessage ?? data.error ?? 'No route found to USDT for this token'
    return NextResponse.json({ error }, { status: res.ok ? 422 : res.status })
  }

  return NextResponse.json({
    requestId: data.requestId,
    transaction: data.transaction,
    outAmount: data.outAmount ?? '0',
  })
}
