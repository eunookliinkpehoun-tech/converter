import { NextResponse } from 'next/server'
import { getEvmPortfolio } from '@/lib/alchemy'
import { getPortfolio } from '@/lib/jupiter'
import { isEvmAddress, isSolanaAddress } from '@/lib/validation'

export async function GET(request: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params
  const chain = new URL(request.url).searchParams.get('chain') ?? 'solana'

  if (chain === 'solana') {
    if (!isSolanaAddress(address)) {
      return NextResponse.json({ error: 'Invalid Solana wallet address' }, { status: 400 })
    }
    try {
      return NextResponse.json(await getPortfolio(address), { headers: { 'Cache-Control': 'private, no-store' } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load portfolio'
      return NextResponse.json({ error: message }, { status: 502 })
    }
  }

  if (chain === 'bnb' || chain === 'polygon') {
    if (!isEvmAddress(address)) {
      return NextResponse.json({ error: 'Invalid EVM wallet address' }, { status: 400 })
    }
    try {
      return NextResponse.json(await getEvmPortfolio(address, chain), { headers: { 'Cache-Control': 'private, no-store' } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load portfolio'
      return NextResponse.json({ error: message }, { status: 502 })
    }
  }

  return NextResponse.json({ error: 'Unsupported network' }, { status: 400 })
}
