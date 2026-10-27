'use client'

import type { BaseConnectedEthereumWallet } from '@privy-io/react-auth'
import { useCallback, useRef, useState } from 'react'
import { EVM_NATIVE_ADDRESS, NETWORKS, type Asset, type ChainId, type ConversionStatus, type SwapTarget } from '@/lib/constants'
import { encodeAllowanceCall, encodeApproveCall, formatEvmUnits, toRpcQuantity } from '@/lib/evm-utils'
import { formatAmount } from '@/lib/format'
import { isEvmAddress } from '@/lib/validation'

type EvmChainId = Exclude<ChainId, 'solana'>
type Hex = `0x${string}`
type EthereumProvider = Awaited<ReturnType<BaseConnectedEthereumWallet['getEthereumProvider']>>

type TransactionRequest = {
  to: string
  data: string
  value: string
  gasLimit?: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
}

type Quote = {
  chainId: number
  approvalAddress: string | null
  estimate: { toAmount: string; toAmountMin: string }
  transactionRequest: TransactionRequest
  expiresAt: number
}

type EvmTransactionParams = {
  from: Hex
  to: Hex
  data: Hex
  value: Hex
  gas?: Hex
  gasPrice?: Hex
  maxFeePerGas?: Hex
  maxPriorityFeePerGas?: Hex
}

async function requestQuote(
  chain: EvmChainId,
  asset: Asset,
  wallet: BaseConnectedEthereumWallet,
  destination: SwapTarget,
): Promise<Quote> {
  const response = await fetch('/api/swap/evm/quote', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chain,
      inputMint: asset.mint,
      outputMint: destination.mint,
      amount: asset.amount,
      taker: wallet.address,
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error ?? `Quote failed (${response.status})`)
  return data as Quote
}

function isUserRejection(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return /reject|denied|cancel|declined|user rejected/.test(message)
}

function rpcQuantity(value: string | undefined): Hex | undefined {
  return toRpcQuantity(value)
}

async function sendTransaction(
  wallet: BaseConnectedEthereumWallet,
  provider: EthereumProvider,
  request: TransactionRequest,
): Promise<Hex> {
  if (!isEvmAddress(request.to) || !/^0x[0-9a-f]*$/i.test(request.data)) {
    throw new Error('The sale route returned invalid transaction data')
  }

  const value = rpcQuantity(request.value)
  if (!value) throw new Error('The sale route returned an invalid transaction value')

  const params: EvmTransactionParams = {
    from: wallet.address as Hex,
    to: request.to as Hex,
    data: request.data as Hex,
    value,
  }
  const gas = rpcQuantity(request.gasLimit)
  const gasPrice = rpcQuantity(request.gasPrice)
  const maxFeePerGas = rpcQuantity(request.maxFeePerGas)
  const maxPriorityFeePerGas = rpcQuantity(request.maxPriorityFeePerGas)
  if (gas) params.gas = gas
  if (maxFeePerGas || maxPriorityFeePerGas) {
    if (maxFeePerGas) params.maxFeePerGas = maxFeePerGas
    if (maxPriorityFeePerGas) params.maxPriorityFeePerGas = maxPriorityFeePerGas
  } else if (gasPrice) {
    params.gasPrice = gasPrice
  }

  const hash = await provider.request({ method: 'eth_sendTransaction', params: [params] })
  if (typeof hash !== 'string' || !/^0x[0-9a-f]{64}$/i.test(hash)) {
    throw new Error('The wallet did not return a valid transaction hash')
  }
  return hash as Hex
}

async function readAllowance(
  provider: EthereumProvider,
  token: string,
  owner: string,
  spender: string,
): Promise<bigint> {
  const response = await provider.request({
    method: 'eth_call',
    params: [{ to: token, data: encodeAllowanceCall(owner, spender) }, 'latest'],
  })
  if (typeof response !== 'string' || !/^0x[0-9a-f]+$/i.test(response)) {
    throw new Error('Could not read the token allowance')
  }
  return BigInt(response)
}

async function waitForTransaction(provider: EthereumProvider, hash: Hex): Promise<boolean> {
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    const receipt = await provider.request({ method: 'eth_getTransactionReceipt', params: [hash] })
    if (receipt && typeof receipt === 'object') {
      const status = (receipt as { status?: unknown }).status
      if (status === '0x1' || status === '0x01' || status === 1) return true
      if (status === '0x0' || status === '0x00' || status === 0) return false
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500))
  }
  throw new Error('Transaction confirmation timed out. Check the transaction explorer before retrying.')
}

export function useEvmSell(onFinished: () => void) {
  const [statuses, setStatuses] = useState<Record<string, ConversionStatus>>({})
  const [running, setRunning] = useState(false)
  const runningRef = useRef(false)

  const setStatus = useCallback((mint: string, status: ConversionStatus) => {
    setStatuses((previous) => ({ ...previous, [mint]: status }))
  }, [])

  const sell = useCallback(
    async (assets: Asset[], wallet: BaseConnectedEthereumWallet, chain: EvmChainId, destination: SwapTarget) => {
      if (runningRef.current || assets.length === 0) return
      runningRef.current = true
      setRunning(true)
      setStatuses(Object.fromEntries(assets.map((asset) => [asset.mint, { state: 'idle' } as ConversionStatus])))

      const chainId = NETWORKS[chain].numericChainId
      let cancelled = false

      try {
        if (!chainId) throw new Error('Unsupported EVM network')
        await wallet.switchChain(chainId)
        const provider = await wallet.getEthereumProvider()

        for (const asset of assets) {
          if (cancelled) break
          setStatus(asset.mint, { state: 'quoting' })

          try {
            let quote = await requestQuote(chain, asset, wallet, destination)
            if (quote.chainId !== chainId) throw new Error('The quote is for a different network')

            if (asset.mint.toLowerCase() !== EVM_NATIVE_ADDRESS.toLowerCase() && quote.approvalAddress) {
              const allowance = await readAllowance(provider, asset.mint, wallet.address, quote.approvalAddress)
              if (allowance < BigInt(asset.amount)) {
                setStatus(asset.mint, {
                  state: 'awaiting-signature',
                  detail: `Approve exact ${formatAmount(asset.uiAmount)} ${asset.symbol} amount`,
                })
                const approvalHash = await sendTransaction(wallet, provider, {
                  to: asset.mint,
                  data: encodeApproveCall(quote.approvalAddress, BigInt(asset.amount)),
                  value: '0x0',
                })
                const approvalConfirmed = await waitForTransaction(provider, approvalHash)
                if (!approvalConfirmed) throw new Error('Token approval failed on-chain')
                quote = await requestQuote(chain, asset, wallet, destination)
              }
            }

            if (Date.now() > quote.expiresAt) quote = await requestQuote(chain, asset, wallet, destination)
            if (
              quote.chainId !== chainId ||
              !/^\d+$/.test(quote.estimate.toAmountMin) ||
              BigInt(quote.estimate.toAmountMin) <= BigInt(0)
            ) {
              throw new Error('The sale route returned an invalid estimate')
            }
            const minimumReceived = Number(formatEvmUnits(BigInt(quote.estimate.toAmountMin), destination.decimals))
            setStatus(asset.mint, {
              state: 'awaiting-signature',
              detail: `Minimum ${formatAmount(minimumReceived)} ${destination.symbol} after slippage`,
            })
            const swapHash = await sendTransaction(wallet, provider, quote.transactionRequest)
            setStatus(asset.mint, { state: 'executing' })
            const swapConfirmed = await waitForTransaction(provider, swapHash)
            if (!swapConfirmed) throw new Error('Sale failed on-chain')

            setStatus(asset.mint, {
              state: 'success',
              signature: swapHash,
              received: Number.isFinite(minimumReceived) ? minimumReceived : 0,
              outputSymbol: destination.symbol,
            })
          } catch (error) {
            const rejected = isUserRejection(error)
            if (rejected) cancelled = true
            setStatus(asset.mint, {
              state: 'failed',
              error: rejected ? 'Wallet request cancelled' : error instanceof Error ? error.message : 'Sale failed',
            })
          }
        }

        if (cancelled) {
          setStatuses((previous) => {
            const next = { ...previous }
            for (const asset of assets) {
              if (next[asset.mint]?.state === 'idle') next[asset.mint] = { state: 'failed', error: 'Cancelled' }
            }
            return next
          })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not switch to the selected network'
        for (const asset of assets) setStatus(asset.mint, { state: 'failed', error: message })
      } finally {
        runningRef.current = false
        setRunning(false)
        onFinished()
      }
    },
    [onFinished, setStatus],
  )

  const reset = useCallback(() => setStatuses({}), [])
  return { sell, statuses, running, reset }
}
