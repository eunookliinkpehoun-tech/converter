import { NextResponse } from 'next/server'
import { jupiterFetch } from '@/lib/jupiter'

type ExecuteResponse = {
  status?: 'Success' | 'Failed'
  signature?: string
  outputAmountResult?: string
  totalOutputAmount?: string
  error?: string
  code?: number
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { signedTransaction?: unknown; requestId?: unknown } | null

  if (
    !body ||
    typeof body.signedTransaction !== 'string' ||
    typeof body.requestId !== 'string' ||
    body.signedTransaction.length > 20_000 ||
    body.requestId.length > 200
  ) {
    return NextResponse.json({ error: 'Invalid execute request' }, { status: 400 })
  }

  const res = await jupiterFetch('/swap/v2/execute', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ signedTransaction: body.signedTransaction, requestId: body.requestId }),
  })
  const data = (await res.json().catch(() => ({}))) as ExecuteResponse

  if (!res.ok || data.status !== 'Success') {
    return NextResponse.json(
      { error: data.error ?? 'Swap failed on-chain', signature: data.signature ?? null },
      { status: res.ok ? 422 : res.status },
    )
  }

  return NextResponse.json({
    signature: data.signature,
    outAmount: data.outputAmountResult ?? data.totalOutputAmount ?? '0',
  })
}
