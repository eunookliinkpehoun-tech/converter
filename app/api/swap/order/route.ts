import { NextResponse } from 'next/server'
import { jupiterFetch } from '@/lib/jupiter'
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
  const body = (await req.json().catch(() => null)) as {
    inputMint?: unknown
    outputMint?: unknown
    amount?: unknown
    taker?: unknown
  } | null

  if (
    !body ||
    !isSolanaAddress(body.inputMint) ||
    !isSolanaAddress(body.outputMint) ||
    !isSolanaAddress(body.taker) ||
    !isPositiveIntegerString(body.amount)
  ) {
    return NextResponse.json({ error: 'Invalid sale request' }, { status: 400 })
  }
  if (body.inputMint === body.outputMint) {
    return NextResponse.json({ error: 'Source and destination assets must be different' }, { status: 400 })
  }

  const query = new URLSearchParams({
    inputMint: body.inputMint,
    outputMint: body.outputMint,
    amount: body.amount,
    taker: body.taker,
  })

  const res = await jupiterFetch(`/swap/v2/order?${query.toString()}`)
  const data = (await res.json().catch(() => ({}))) as OrderResponse

  if (!res.ok || !data.transaction || !data.requestId) {
    const error = data.errorMessage ?? data.error ?? 'No route found for this destination asset'
    return NextResponse.json({ error }, { status: res.ok ? 422 : res.status })
  }

  return NextResponse.json({
    requestId: data.requestId,
    transaction: data.transaction,
    outAmount: data.outAmount ?? '0',
  })
}
