import { getPublicClient } from 'wagmi/actions'
import { parseAbi } from 'viem'
import type { Address } from '../config/chains'
import { wagmiConfig } from './wallet'

const erc20MetaAbi = parseAbi([
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)',
])

export interface TokenMeta {
  symbol: string
  name: string
  decimals: number
}

/** Reads ERC-20 metadata straight from the chain. Returns null when nothing answers. */
export async function readTokenMeta(chainId: number, address: Address): Promise<TokenMeta | null> {
  const client = getPublicClient(wagmiConfig, { chainId: chainId as never })
  if (!client) return null
  try {
    const [symbol, name, decimals] = await Promise.all([
      client.readContract({ address, abi: erc20MetaAbi, functionName: 'symbol' }),
      client
        .readContract({ address, abi: erc20MetaAbi, functionName: 'name' })
        .catch(() => 'Unknown token'),
      client.readContract({ address, abi: erc20MetaAbi, functionName: 'decimals' }),
    ])
    if (typeof symbol !== 'string' || typeof decimals !== 'number') return null
    return { symbol: symbol.slice(0, 16), name: String(name).slice(0, 40), decimals }
  } catch {
    return null
  }
}
