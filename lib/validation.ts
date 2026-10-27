const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export function isSolanaAddress(value: unknown): value is string {
  return typeof value === 'string' && BASE58.test(value)
}

export function isPositiveIntegerString(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d{0,29}$/.test(value)
}
