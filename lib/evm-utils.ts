import { isEvmAddress } from '@/lib/validation'

const UINT256_LIMIT = BigInt(1) << BigInt(256)

function decimalScale(decimals: number): bigint {
  let scale = BigInt(1)
  for (let index = 0; index < decimals; index += 1) scale *= BigInt(10)
  return scale
}

export function parseEvmUnits(value: string, decimals: number): bigint {
  const match = /^(\d+)(?:\.(\d*))?$/.exec(value.trim())
  if (!match || decimals < 0 || decimals > 36) throw new Error('Invalid token amount')

  const whole = match[1]
  const fraction = match[2] ?? ''
  if (fraction.length > decimals && /[1-9]/.test(fraction.slice(decimals))) {
    throw new Error('Token amount has too many decimal places')
  }

  const scale = decimalScale(decimals)
  const normalizedFraction = fraction.slice(0, decimals).padEnd(decimals, '0')
  return BigInt(whole) * scale + BigInt(normalizedFraction || '0')
}

export function formatEvmUnits(value: bigint, decimals: number): string {
  if (decimals <= 0) return value.toString()
  const scale = decimalScale(decimals)
  const whole = value / scale
  const fraction = (value % scale).toString().padStart(decimals, '0').replace(/0+$/, '')
  return fraction ? `${whole.toString()}.${fraction}` : whole.toString()
}

function addressWord(value: string): string {
  if (!isEvmAddress(value)) throw new Error('Invalid EVM address')
  return value.slice(2).toLowerCase().padStart(64, '0')
}

export function encodeAllowanceCall(owner: string, spender: string): `0x${string}` {
  return `0xdd62ed3e${addressWord(owner)}${addressWord(spender)}`
}

export function encodeApproveCall(spender: string, amount: bigint): `0x${string}` {
  if (amount < BigInt(0) || amount >= UINT256_LIMIT) throw new Error('Invalid approval amount')
  return `0x095ea7b3${addressWord(spender)}${amount.toString(16).padStart(64, '0')}`
}

export function toRpcQuantity(value: string | undefined): `0x${string}` | undefined {
  if (!value) return undefined
  try {
    const quantity = BigInt(value)
    if (quantity < BigInt(0)) return undefined
    return `0x${quantity.toString(16)}`
  } catch {
    return undefined
  }
}
