const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/

export function isSolanaAddress(value: unknown): value is string {
  return typeof value === 'string' && BASE58.test(value)
}

export function isEvmAddress(value: unknown): value is string {
  return typeof value === 'string' && EVM_ADDRESS.test(value)
}

export function isPositiveIntegerString(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d{0,77}$/.test(value)
}
