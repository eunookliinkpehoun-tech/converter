import { NextResponse } from 'next/server'
import { EVM_NATIVE_ADDRESS, NETWORKS, type ChainId } from '@/lib/constants'
import { isEvmAddress, isPositiveIntegerString } from '@/lib/validation'

type EvmChainId = Exclude<ChainId, 'solana'>

type LifiQuote = {
  action?: {
    fromChainId?: number
    toChainId?: number
    fromToken?: { address?: string }
    toToken?: { address?: string }
  }
  estimate?: {
    approvalAddress?: string
    toAmount?: string
    toAmountMin?: string
  }
  transactionRequest?: {
    from?: string
    to?: string
    data?: string
    value?: string | number
    gasLimit?: string | number
    gasPrice?: string | number
    maxFeePerGas?: string | number
    maxPriorityFeePerGas?: string | number
    chainId?: number
  }
  message?: string
  error?: string
}

function isEvmChain(value: unknown): value is EvmChainId {
  return value === 'bnb' || value === 'polygon'
}

function asOptionalString(value: string | number | undefined): string | undefined {
  return value === undefined ? undefined : String(value)
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    chain?: unknown
    inputMint?: unknown
    outputMint?: unknown
    amount?: unknown
    taker?: unknown
  } | null

  if (
    !body ||
    !isEvmChain(body.chain) ||
    !isEvmAddress(body.inputMint) ||
    !isEvmAddress(body.outputMint) ||
    !isEvmAddress(body.taker) ||
    !isPositiveIntegerString(body.amount)
  ) {
    return NextResponse.json({ error: 'Invalid same-network swap request' }, { status: 400 })
  }

  const network = NETWORKS[body.chain]
  const chainId = network.numericChainId
  const inputMint = body.inputMint.toLowerCase()
  const outputMint = body.outputMint.toLowerCase()
  const allowedOutputs = new Set([network.stablecoinAddress.toLowerCase(), EVM_NATIVE_ADDRESS.toLowerCase()])

  if (!chainId || !allowedOutputs.has(outputMint)) {
    return NextResponse.json({ error: 'Choose USDT or the native asset for this network' }, { status: 400 })
  }
  if (inputMint === outputMint) {
    return NextResponse.json({ error: 'Source and destination assets must be different' }, { status: 400 })
  }

  const url = new URL('https://li.quest/v1/quote')
  url.search = new URLSearchParams({
    fromChain: String(chainId),
    toChain: String(chainId),
    fromToken: body.inputMint,
    toToken: body.outputMint,
    fromAmount: body.amount,
    fromAddress: body.taker,
    slippage: '0.01',
    integrator: 'sweep-wallet',
  }).toString()

  let response: Response
  try {
    response = await fetch(url, {
      headers: { accept: 'application/json', 'x-lifi-integrator': 'sweep-wallet' },
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json({ error: 'Swap quotes are temporarily unavailable. Please retry shortly.' }, { status: 502 })
  }

  const quote = (await response.json().catch(() => null)) as LifiQuote | null
  if (!response.ok || !quote) {
    const message = quote?.message ?? quote?.error
    return NextResponse.json(
      { error: message || 'No same-network route is available for this asset' },
      { status: response.status >= 500 ? 502 : 422 },
    )
  }

  const transaction = quote.transactionRequest
  const expectedInput = quote.action?.fromToken?.address?.toLowerCase()
  const expectedOutput = quote.action?.toToken?.address?.toLowerCase()
  if (
    Number(quote.action?.fromChainId) !== chainId ||
    Number(quote.action?.toChainId) !== chainId ||
    (expectedInput && expectedInput !== inputMint) ||
    (expectedOutput && expectedOutput !== outputMint) ||
    (transaction?.chainId !== undefined && Number(transaction.chainId) !== chainId) ||
    (transaction?.from && transaction.from.toLowerCase() !== body.taker.toLowerCase()) ||
    !transaction?.to ||
    !isEvmAddress(transaction.to) ||
    typeof transaction.data !== 'string' ||
    !/^0x[0-9a-f]*$/i.test(transaction.data) ||
    transaction.data.length > 300_000 ||
    !quote.estimate?.toAmount ||
    !quote.estimate.toAmountMin
  ) {
    return NextResponse.json({ error: 'The swap provider returned an invalid quote' }, { status: 502 })
  }

  const approvalAddress = quote.estimate.approvalAddress
  if (approvalAddress && !isEvmAddress(approvalAddress)) {
    return NextResponse.json({ error: 'The swap provider returned an invalid approval address' }, { status: 502 })
  }

  return NextResponse.json({
    chainId,
    approvalAddress: approvalAddress ?? null,
    estimate: {
      toAmount: quote.estimate.toAmount,
      toAmountMin: quote.estimate.toAmountMin,
    },
    transactionRequest: {
      to: transaction.to,
      data: transaction.data,
      value: asOptionalString(transaction.value) ?? '0x0',
      gasLimit: asOptionalString(transaction.gasLimit),
      gasPrice: asOptionalString(transaction.gasPrice),
      maxFeePerGas: asOptionalString(transaction.maxFeePerGas),
      maxPriorityFeePerGas: asOptionalString(transaction.maxPriorityFeePerGas),
    },
    expiresAt: Date.now() + 30_000,
  })
}
