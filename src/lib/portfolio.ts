/**
 * Portfolio loader — one wallet, every allowlisted testnet.
 * Reads are batched with Multicall3 where the chain has it, and every failure is
 * reported as a failure (never as a zero balance).
 */
import { getPublicClient } from 'wagmi/actions'
import type { Address } from 'viem'
import { CHAINS, getChain, nativeDecimals, nativeSymbol } from '../config/chains'
import { allTokensForChain, type TokenCfg } from '../config/tokens'
import { erc20Abi } from './uniswap'
import { wagmiConfig } from './wallet'

export interface TokenHolding {
  token: TokenCfg
  balance: bigint | null
  error?: string
}

export interface ChainHolding {
  chainId: number
  native: bigint | null
  nativeError?: string
  tokens: TokenHolding[]
  ms: number
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out after ${ms / 1000}s`)), ms)),
  ])
}

async function loadChain(chainId: number, owner: Address): Promise<ChainHolding> {
  const t0 = performance.now()
  const chain = getChain(chainId)!
  const client = getPublicClient(wagmiConfig, { chainId: chainId as never })
  if (!client) {
    return { chainId, native: null, nativeError: 'no RPC client', tokens: [], ms: 0 }
  }

  let native: bigint | null = null
  let nativeError: string | undefined
  try {
    native = await withTimeout(client.getBalance({ address: owner }), 12_000, 'balance')
  } catch (e) {
    nativeError = (e as Error).message.slice(0, 90)
  }

  const list = allTokensForChain(chainId).filter(
    // on Arc the ERC-20 USDC entry and the native balance are the same money — show it once
    (t) => !(chain.nativeIsUsdc && t.symbol === 'USDC'),
  )
  let tokens: TokenHolding[] = []

  if (list.length > 0) {
    const contracts = list.map((t) => ({
      address: t.address,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [owner] as const,
    }))
    if (chain.nativeIsUsdc && chain.usdc) {
      // keep the canonical USDC contract visible as metadata, but do not double count
    }
    try {
      const res = await withTimeout(client.multicall({ contracts, allowFailure: true } as never), 15_000, 'multicall')
      tokens = list.map((token, i) => {
        const r = (res as Array<{ status: string; result?: bigint; error?: Error }>)[i]
        return r?.status === 'success'
          ? { token, balance: r.result as bigint }
          : { token, balance: null, error: 'contract did not answer' }
      })
    } catch {
      const settled = await Promise.allSettled(
        list.map((token) =>
          withTimeout(
            client.readContract({ address: token.address, abi: erc20Abi, functionName: 'balanceOf', args: [owner] }) as Promise<bigint>,
            12_000,
            'balanceOf',
          ),
        ),
      )
      tokens = list.map((token, i) => {
        const r = settled[i]
        return r.status === 'fulfilled' ? { token, balance: r.value } : { token, balance: null, error: (r.reason as Error).message.slice(0, 80) }
      })
    }
  }

  return { chainId, native, nativeError, tokens, ms: Math.round(performance.now() - t0) }
}

/** Loads every chain with bounded concurrency so public RPCs are not hammered. */
export async function loadPortfolio(owner: Address, concurrency = 5): Promise<ChainHolding[]> {
  const ids = CHAINS.map((c) => c.id)
  const out: ChainHolding[] = []
  let cursor = 0

  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor++]
      out.push(await loadChain(id, owner))
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker))
  return out.sort((a, b) => ids.indexOf(a.chainId) - ids.indexOf(b.chainId))
}

export function nativeHoldingLabel(chainId: number) {
  const chain = getChain(chainId)
  return {
    symbol: nativeSymbol(chainId),
    decimals: nativeDecimals(chainId),
    name: chain?.nativeIsUsdc ? 'USDC (native gas token on Arc)' : `${nativeSymbol(chainId)} (native)`,
  }
}
