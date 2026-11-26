/**
 * Portfolio loader, one wallet, every allowlisted testnet.
 * Reads are batched with Multicall3 where the chain has it, and every failure is
 * reported as a failure (never as a zero balance).
 * Blockscout v2 ERC-20 discovery runs in parallel for chains with CORS-enabled explorers,
 * appending any non-zero holdings not already in the verified TOKENS list.
 */
import { getPublicClient } from 'wagmi/actions'
import type { Address } from 'viem'
import { CHAINS, getChain, nativeDecimals, nativeSymbol } from '../config/chains'
import { allTokensForChain, type TokenCfg } from '../config/tokens'
import { erc20Abi } from './uniswap'
import { wagmiConfig } from './wallet'

/**
 * Blockscout v2 explorers with CORS wildcard — verified live 2026-11-25.
 * Only chains with confirmed `Access-Control-Allow-Origin: *` are listed here.
 */
const BLOCKSCOUT: Record<number, string> = {
  11155111: 'https://eth-sepolia.blockscout.com',
  11155420: 'https://optimism-sepolia.blockscout.com',
  84532:    'https://base-sepolia.blockscout.com',
  4801:     'https://worldchain-sepolia.explorer.alchemy.com',
  763373:   'https://explorer-sepolia.inkonchain.com',
  1439:     'https://testnet.blockscout.injective.network',
  91342:    'https://sepolia-explorer.giwa.io',
  46630:    'https://explorer.testnet.chain.robinhood.com',
  7080969:  'https://humanity-testnet.explorer.alchemy.com',
  98867:    'https://testnet-explorer.plume.org',
  1962:     'https://testnet.trex.xyz',
  843843:   'https://galactica-cassiopeia.explorer.alchemy.com',
  181228:   'https://sepolia-explorer.hpp.io',
  681:      'https://jasmy-chain-testnet-explorer.alt.technology',
  704852:   'https://testnet-explorer.mars-chain.io',
  323432:   'https://testnet-explorer.worldmobile.net',
  37714555429: 'https://testnet-explorer-v2.xai-chain.net',
}

interface BsToken {
  address_hash?: string
  symbol?: string
  name?: string
  decimals?: string | number
}

interface BsHolding {
  value?: string
  token?: BsToken
}

/** Fetches non-zero ERC-20 balances from Blockscout v2, returning discovered TokenCfg entries. */
async function blockscoutTokens(chainId: number, owner: string): Promise<TokenCfg[]> {
  const base = BLOCKSCOUT[chainId]
  if (!base) return []
  try {
    const url = `${base}/api/v2/addresses/${owner}/tokens?type=ERC-20`
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 4500)
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(tid)
    if (!res.ok) return []
    const body = (await res.json()) as { items?: BsHolding[] } | BsHolding[]
    const items: BsHolding[] = Array.isArray(body) ? body : (body.items ?? [])
    const known = new Set(allTokensForChain(chainId).map((t) => t.address.toLowerCase()))
    const out: TokenCfg[] = []
    for (const h of items) {
      const addr = h.token?.address_hash
      const sym = h.token?.symbol
      const dec = h.token?.decimals
      const val = h.value
      if (!addr || !sym || dec == null || !val || val === '0') continue
      if (known.has(addr.toLowerCase())) continue
      out.push({
        chainId,
        address: addr as Address,
        symbol: sym,
        name: h.token?.name ?? sym,
        decimals: Number(dec),
        kind: 'token',
        color: '#64748b',
        verified: false,
      })
    }
    return out
  } catch {
    return []
  }
}

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

  // Run native balance + Blockscout discovery in parallel
  const [nativeResult, discovered] = await Promise.all([
    withTimeout(client.getBalance({ address: owner }), 12_000, 'balance').then(
      (v) => ({ ok: true as const, value: v }),
      (e: Error) => ({ ok: false as const, error: e.message.slice(0, 90) }),
    ),
    blockscoutTokens(chainId, owner),
  ])

  const native = nativeResult.ok ? nativeResult.value : null
  const nativeError = nativeResult.ok ? undefined : nativeResult.error

  // Merge verified TOKENS list + newly discovered ERC-20s (deduped by address)
  const verifiedList = allTokensForChain(chainId).filter(
    // on Arc the ERC-20 USDC entry and the native balance are the same money, show it once
    (t) => !(chain.nativeIsUsdc && t.symbol === 'USDC'),
  )
  const knownAddrs = new Set(verifiedList.map((t) => t.address.toLowerCase()))
  const list = [
    ...verifiedList,
    ...discovered.filter((t) => !knownAddrs.has(t.address.toLowerCase())),
  ]
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
