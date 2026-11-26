/**
 * Non-EVM DEX / Orderbook read-only testnet quotes using verified public CORS APIs.
 *
 * Integrated networks:
 *  - Solana Devnet: Raydium Devnet Compute API (SOL <-> USDC <-> EURC)
 *  - Stellar Testnet: Stellar Horizon Strict-Send SDEX Pathfinding (XLM <-> USDC <-> EURC)
 *
 * Non-EVM networks without an open CORS testnet AMM/orderbook API are kept read-only / disabled
 * rather than simulated with fake quotes.
 */

import { formatUnits, parseUnits } from 'viem'

export type NonEvmSwapId =
  | 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG'
  | 'stellar:testnet'

export interface NonEvmSwapToken {
  symbol: string
  name: string
  assetId: string // Solana mint | Stellar 'native' or 'CODE:ISSUER'
  decimals: number
  color: string
}

export interface NonEvmSwapQuote {
  amountOutRaw: string
  amountOutFormatted: string
  minOutFormatted: string
  priceImpactPct: number | null
  route: string
  provider: string
  poolHint?: string
}

export const NON_EVM_SWAP_NETWORKS: Array<{
  id: NonEvmSwapId
  name: string
  short: string
  provider: string
  walletFamily: 'solana' | 'stellar'
  explorerUrl: string
  tokens: NonEvmSwapToken[]
}> = [
  {
    id: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
    name: 'Solana Devnet',
    short: 'Solana Dev',
    provider: 'Raydium Devnet',
    walletFamily: 'solana',
    explorerUrl: 'https://explorer.solana.com/?cluster=devnet',
    tokens: [
      {
        symbol: 'SOL',
        name: 'Solana (Wrapped SOL)',
        assetId: 'So11111111111111111111111111111111111111112',
        decimals: 9,
        color: '#9945ff',
      },
      {
        symbol: 'USDC',
        name: 'USD Coin (Circle Devnet)',
        assetId: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        decimals: 6,
        color: '#2775ca',
      },
      {
        symbol: 'EURC',
        name: 'Euro Coin (Circle Devnet)',
        assetId: 'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr',
        decimals: 6,
        color: '#1a5cff',
      },
    ],
  },
  {
    id: 'stellar:testnet',
    name: 'Stellar Testnet',
    short: 'Stellar',
    provider: 'Horizon SDEX',
    walletFamily: 'stellar',
    explorerUrl: 'https://stellar.expert/explorer/testnet',
    tokens: [
      {
        symbol: 'XLM',
        name: 'Lumens (Native)',
        assetId: 'native',
        decimals: 7,
        color: '#cbd5e1',
      },
      {
        symbol: 'USDC',
        name: 'USD Coin (Circle Testnet)',
        assetId: 'USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        decimals: 7,
        color: '#2775ca',
      },
      {
        symbol: 'EURC',
        name: 'Euro Coin (Circle Testnet)',
        assetId: 'EURC:GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO',
        decimals: 7,
        color: '#1a5cff',
      },
    ],
  },
]

export function getNonEvmSwapNet(id?: string | null) {
  return NON_EVM_SWAP_NETWORKS.find((n) => n.id === id)
}

function trimFmt(raw: bigint, decimals: number, maxFrac = 6): string {
  const s = formatUnits(raw, decimals)
  const [w, f = ''] = s.split('.')
  if (!f) return w
  const trimmed = f.slice(0, maxFrac).replace(/0+$/, '')
  return trimmed ? `${w}.${trimmed}` : w
}

export async function quoteNonEvmSwap(params: {
  networkId: NonEvmSwapId
  tokenIn: NonEvmSwapToken
  tokenOut: NonEvmSwapToken
  amountDecimal: string
  slippageBps: number
}): Promise<NonEvmSwapQuote | null> {
  const { networkId, tokenIn, tokenOut, amountDecimal, slippageBps } = params
  if (!amountDecimal || Number(amountDecimal) <= 0 || tokenIn.assetId === tokenOut.assetId) return null

  let amountInRaw: bigint
  try {
    amountInRaw = parseUnits(amountDecimal, tokenIn.decimals)
  } catch {
    return null
  }
  if (amountInRaw <= 0n) return null

  if (networkId === 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG') {
    const url = new URL('https://transaction-v1-devnet.raydium.io/compute/swap-base-in')
    url.searchParams.set('inputMint', tokenIn.assetId)
    url.searchParams.set('outputMint', tokenOut.assetId)
    url.searchParams.set('amount', amountInRaw.toString())
    url.searchParams.set('slippageBps', String(slippageBps))
    url.searchParams.set('txVersion', 'V0')

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const json = (await res.json()) as {
      success?: boolean
      data?: {
        outputAmount?: string
        otherAmountThreshold?: string
        priceImpactPct?: number
        routePlan?: Array<{ poolId?: string }>
      }
    }
    if (!json.success || !json.data?.outputAmount) return null
    const outRaw = BigInt(json.data.outputAmount)
    if (outRaw <= 0n) return null
    const minRaw = json.data.otherAmountThreshold
      ? BigInt(json.data.otherAmountThreshold)
      : (outRaw * BigInt(10_000 - slippageBps)) / 10_000n
    const pools = (json.data.routePlan ?? []).map((r) => r.poolId?.slice(0, 6)).filter(Boolean)

    return {
      amountOutRaw: outRaw.toString(),
      amountOutFormatted: trimFmt(outRaw, tokenOut.decimals, 6),
      minOutFormatted: trimFmt(minRaw, tokenOut.decimals, 6),
      priceImpactPct: typeof json.data.priceImpactPct === 'number' ? json.data.priceImpactPct : null,
      route: `Raydium Devnet (${pools.length > 1 ? `${pools.length}-hop` : 'direct'})`,
      provider: 'Raydium Devnet API',
      poolHint: json.data.routePlan?.[0]?.poolId,
    }
  }

  if (networkId === 'stellar:testnet') {
    const url = new URL('https://horizon-testnet.stellar.org/paths/strict-send')
    if (tokenIn.assetId === 'native') {
      url.searchParams.set('source_asset_type', 'native')
    } else {
      const [code, issuer] = tokenIn.assetId.split(':')
      url.searchParams.set('source_asset_type', code.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12')
      url.searchParams.set('source_asset_code', code)
      url.searchParams.set('source_asset_issuer', issuer)
    }
    url.searchParams.set('source_amount', formatUnits(amountInRaw, tokenIn.decimals))
    url.searchParams.set('destination_assets', tokenOut.assetId)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const json = (await res.json()) as {
      _embedded?: {
        records?: Array<{
          destination_amount?: string
          path?: Array<{ asset_code?: string; asset_type?: string }>
        }>
      }
    }
    const recs = json._embedded?.records ?? []
    if (recs.length === 0) return null
    // Pick highest destination_amount
    const best = recs.reduce((a, b) =>
      Number(b.destination_amount ?? 0) > Number(a.destination_amount ?? 0) ? b : a,
    )
    const outStr = best.destination_amount
    if (!outStr || Number(outStr) <= 0) return null
    const outRaw = parseUnits(Number(outStr).toFixed(7), 7)
    const minRaw = (outRaw * BigInt(10_000 - slippageBps)) / 10_000n
    const hops = (best.path ?? []).map((p) => p.asset_code ?? 'XLM').filter(Boolean)

    return {
      amountOutRaw: outRaw.toString(),
      amountOutFormatted: trimFmt(outRaw, 7, 6),
      minOutFormatted: trimFmt(minRaw, 7, 6),
      priceImpactPct: null,
      route: hops.length > 0 ? `Stellar SDEX via ${hops.join(' → ')}` : 'Stellar SDEX direct orderbook',
      provider: 'Stellar Horizon Testnet',
    }
  }

  return null
}
