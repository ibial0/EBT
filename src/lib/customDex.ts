/**
 * User-added DEX venues ("Custom DEX").
 *
 * The built-in registry only knows the DEXes that were verified when this build was made. Testnets get new
 * DEXes all the time, so Settings lets the owner paste a Uniswap-v2-compatible router address for any chain
 * in the registry. Nothing is trusted on faith: the router is checked on chain before it is saved, and the
 * factory + wrapped native token are read from the router itself, not typed by hand.
 *
 * Storage is localStorage only, same as every other piece of state in this app.
 */
import { createPublicClient, http, parseAbi, type PublicClient } from 'viem'
import { getChain, type Address } from '../config/chains'
import { setCustomDexes, type NativeFnStyle, type V2DexConfig } from './dexV2'

export interface CustomDex {
  chainId: number
  name: string
  router: Address
  factory: Address
  wrappedNative: Address
  nativeFnStyle: NativeFnStyle
  addedAt: number
}

const KEY = 'ebt.customDex.v1'
export const CUSTOM_DEX_EVENT = 'ebt:custom-dex'

const routerAbi = parseAbi([
  'function WETH() view returns (address)',
  'function WAVAX() view returns (address)',
  'function WSEI() view returns (address)',
  'function factory() view returns (address)',
])
const factoryAbi = parseAbi(['function allPairsLength() view returns (uint256)'])

function read(): CustomDex[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as CustomDex[]) : []
  } catch {
    return []
  }
}

function write(list: CustomDex[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
  applyToRegistry(list)
  window.dispatchEvent(new Event(CUSTOM_DEX_EVENT))
}

/** Push the saved venues into the swap engine so quotes can use them. */
export function applyToRegistry(list: CustomDex[] = read()) {
  const byChain: Record<number, V2DexConfig[]> = {}
  for (const d of list) {
    ;(byChain[d.chainId] ??= []).push({
      name: d.name,
      router: d.router,
      factory: d.factory,
      wrappedNative: d.wrappedNative,
      nativeFnStyle: d.nativeFnStyle,
    })
  }
  setCustomDexes(byChain)
}

/** Called once at boot. */
export function initCustomDexes() {
  applyToRegistry()
}

export function listCustomDexes(): CustomDex[] {
  return read()
}

export function customDexesFor(chainId: number): CustomDex[] {
  return read().filter((d) => d.chainId === chainId)
}

export function customDexChainIds(): number[] {
  return [...new Set(read().map((d) => d.chainId))]
}

export function saveCustomDex(entry: CustomDex) {
  const list = read().filter(
    (d) => !(d.chainId === entry.chainId && d.router.toLowerCase() === entry.router.toLowerCase()),
  )
  list.push(entry)
  write(list)
}

export function removeCustomDex(chainId: number, router: string) {
  write(read().filter((d) => !(d.chainId === chainId && d.router.toLowerCase() === router.toLowerCase())))
}

export type VerifyOutcome =
  | {
      ok: true
      factory: Address
      wrappedNative: Address
      nativeFnStyle: NativeFnStyle
      pairs: bigint
    }
  | { ok: false; error: string }

function clientFor(chainId: number): PublicClient | null {
  const chain = getChain(chainId)
  if (!chain?.viem) return null
  return createPublicClient({ chain: chain.viem, transport: http() }) as PublicClient
}

const ZERO = '0x0000000000000000000000000000000000000000'

/**
 * Everything a quote needs is read from the router: the wrapped native token (WETH / WAVAX / WSEI) and the
 * factory. A live pair count proves the factory is real and that at least one pool exists.
 */
export async function verifyRouter(chainId: number, router: Address): Promise<VerifyOutcome> {
  const chain = getChain(chainId)
  if (!chain) return { ok: false, error: 'That chain is not in the registry.' }
  const client = clientFor(chainId)
  if (!client) return { ok: false, error: 'No RPC configured for that chain.' }

  if (!/^0x[0-9a-fA-F]{40}$/.test(router)) return { ok: false, error: 'That is not a valid address.' }

  try {
    const code = await client.getCode({ address: router })
    if (!code || code === '0x') return { ok: false, error: `No contract at that address on ${chain.name}.` }
  } catch {
    return { ok: false, error: `Could not reach ${chain.name} to check that address.` }
  }

  let wrappedNative: Address | null = null
  let nativeFnStyle: NativeFnStyle = 'eth'
  for (const [fn, style] of [
    ['WETH', 'eth'],
    ['WAVAX', 'avax'],
    ['WSEI', 'sei'],
  ] as const) {
    try {
      const out = (await client.readContract({ address: router, abi: routerAbi, functionName: fn })) as Address
      if (out && out !== ZERO) {
        wrappedNative = out
        nativeFnStyle = style
        break
      }
    } catch {
      /* fork does not expose this getter */
    }
  }
  if (!wrappedNative) {
    return {
      ok: false,
      error: 'The router does not expose WETH(), WAVAX() or WSEI(). EBT can only use Uniswap v2 style routers.',
    }
  }

  let factory: Address
  try {
    factory = (await client.readContract({ address: router, abi: routerAbi, functionName: 'factory' })) as Address
  } catch {
    return { ok: false, error: 'The router does not expose factory().' }
  }
  if (!factory || factory === ZERO) return { ok: false, error: 'The router returned an empty factory address.' }

  try {
    const factoryCode = await client.getCode({ address: factory })
    if (!factoryCode || factoryCode === '0x') return { ok: false, error: 'The factory address has no contract.' }
    const pairs = (await client.readContract({
      address: factory,
      abi: factoryAbi,
      functionName: 'allPairsLength',
    })) as bigint
    if (pairs === 0n) return { ok: false, error: 'The factory exists but has no pools yet, so there is nothing to trade.' }
    return { ok: true, factory, wrappedNative, nativeFnStyle, pairs }
  } catch {
    return { ok: false, error: 'The factory does not answer allPairsLength(), so it is not a Uniswap v2 factory.' }
  }
}
