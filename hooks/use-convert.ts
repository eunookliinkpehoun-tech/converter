'use client'

import { useSignTransaction, type ConnectedStandardSolanaWallet } from '@privy-io/react-auth/solana'
import { useCallback, useState } from 'react'
import type { Asset, ConversionStatus, SwapTarget } from '@/lib/constants'
import { base64ToBytes, bytesToBase64 } from '@/lib/format'

// Jupiter orders carry a recent blockhash, so each batch is quoted right before it is signed.
const BATCH_SIZE = 6

type Order = { mint: string; requestId: string; transaction: string }

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`)
  return data as T
}

function isUserRejection(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return /reject|denied|cancel|declined|closed/.test(message)
}

export function useConvert(onFinished: () => void) {
  const { signTransaction } = useSignTransaction()
  const [statuses, setStatuses] = useState<Record<string, ConversionStatus>>({})
  const [running, setRunning] = useState(false)

  const setStatus = useCallback((mints: string[], status: ConversionStatus) => {
    setStatuses((prev) => {
      const next = { ...prev }
      for (const mint of mints) next[mint] = status
      return next
    })
  }, [])

  const signBatch = useCallback(
    async (orders: Order[], wallet: ConnectedStandardSolanaWallet): Promise<Uint8Array[]> => {
      const inputs = orders.map((o) => ({
        transaction: base64ToBytes(o.transaction),
        wallet,
        chain: 'solana:mainnet' as const,
      }))
      try {
        const result = await signTransaction(...inputs)
        const outputs = Array.isArray(result) ? result : [result]
        return outputs.map((o) => o.signedTransaction)
      } catch (error) {
        // Some wallets do not support batch signing; fall back to one prompt per transaction.
        if (isUserRejection(error) || inputs.length === 1) throw error
        const signed: Uint8Array[] = []
        for (const input of inputs) {
          const { signedTransaction } = await signTransaction(input)
          signed.push(signedTransaction)
        }
        return signed
      }
    },
    [signTransaction],
  )

  const convert = useCallback(
    async (assets: Asset[], wallet: ConnectedStandardSolanaWallet, destination: SwapTarget) => {
      if (running || assets.length === 0) return
      setRunning(true)
      setStatuses(Object.fromEntries(assets.map((a) => [a.mint, { state: 'idle' } as ConversionStatus])))

      let cancelled = false
      try {
        for (let i = 0; i < assets.length && !cancelled; i += BATCH_SIZE) {
          const batch = assets.slice(i, i + BATCH_SIZE)
          setStatus(
            batch.map((a) => a.mint),
            { state: 'quoting' },
          )

          const orders: Order[] = []
          for (const asset of batch) {
            try {
              const order = await postJson<{ requestId: string; transaction: string }>('/api/swap/order', {
                inputMint: asset.mint,
                outputMint: destination.mint,
                amount: asset.amount,
                taker: wallet.address,
              })
              orders.push({ mint: asset.mint, ...order })
            } catch (error) {
              setStatus([asset.mint], {
                state: 'failed',
                error: error instanceof Error ? error.message : `No route to ${destination.symbol}`,
              })
            }
          }
          if (orders.length === 0) continue

          setStatus(
            orders.map((o) => o.mint),
            { state: 'awaiting-signature' },
          )

          let signed: Uint8Array[]
          try {
            signed = await signBatch(orders, wallet)
          } catch (error) {
            const rejected = isUserRejection(error)
            cancelled = rejected
            setStatus(
              orders.map((o) => o.mint),
              { state: 'failed', error: rejected ? 'Signature rejected' : 'Signing failed' },
            )
            continue
          }

          setStatus(
            orders.map((o) => o.mint),
            { state: 'executing' },
          )

          await Promise.all(
            orders.map(async (order, index) => {
              try {
                const result = await postJson<{ signature: string; outAmount: string }>('/api/swap/execute', {
                  requestId: order.requestId,
                  signedTransaction: bytesToBase64(signed[index]),
                })
                setStatus([order.mint], {
                  state: 'success',
                  signature: result.signature,
                  received: Number(result.outAmount) / 10 ** destination.decimals,
                  outputSymbol: destination.symbol,
                })
              } catch (error) {
                setStatus([order.mint], {
                  state: 'failed',
                  error: error instanceof Error ? error.message : 'Swap failed',
                })
              }
            }),
          )
        }

        if (cancelled) {
          const remaining = assets.slice().map((a) => a.mint)
          setStatuses((prev) => {
            const next = { ...prev }
            for (const mint of remaining) {
              if (next[mint]?.state === 'idle') next[mint] = { state: 'failed', error: 'Cancelled' }
            }
            return next
          })
        }
      } finally {
        setRunning(false)
        onFinished()
      }
    },
    [running, setStatus, signBatch, onFinished],
  )

  const reset = useCallback(() => setStatuses({}), [])

  return { convert, statuses, running, reset }
}
