import { NextResponse } from 'next/server'
import { getPortfolio } from '@/lib/jupiter'
import { isSolanaAddress } from '@/lib/validation'

export async function GET(_req: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params
  if (!isSolanaAddress(address)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }
  try {
    const portfolio = await getPortfolio(address)
    return NextResponse.json(portfolio)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load portfolio'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
