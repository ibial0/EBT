import { blake2b } from '@noble/hashes/blake2b'
import { NON_EVM_NETWORKS, type NetworkEntry } from '../config/networks'
import type { NonEvmAccount, NonEvmFamily } from './walletsMulti'

export interface NonEvmTokenHolding {
  symbol: string
  name: string
  address: string
  balance: bigint | null
  decimals: number
  verified: boolean
  error?: string
}

export interface NonEvmChainHolding {
  networkId: string
  network: NetworkEntry
  owner: string
  native: bigint | null
  nativeError?: string
  tokens: NonEvmTokenHolding[]
  ms: number
}

const SOLANA_USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
const SOLANA_EURC = 'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr'
const SUI_USDC = '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC'
const APTOS_USDC_FA = '0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832'
const STARKNET_STRK = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'
const STARKNET_ETH = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7'
const STARKNET_USDC = '0x0512feAc6339Ff7889822cb5aA2a86C848e9D392bB0E3E237C008674feeD8343'
const STARKNET_BALANCE_OF = '0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e'
const STELLAR_USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
const STELLAR_EURC_ISSUER = 'GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO'
const ALGORAND_USDC_ASA = 10458941
const NEAR_USDC_CONTRACT = '3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af'
const XRPL_USDC_ISSUER = 'rHuGNhqTG32mfmAvWA8hUyWRLV3tCSwKQt'

const TIMEOUT_MS = 10_000

function scaleDecimalToBigInt(decStr: string, decimals: number): bigint {
  const clean = decStr.trim()
  if (!/^-?\d+(\.\d+)?$/.test(clean) || clean.startsWith('-')) return 0n
  const [whole, frac = ''] = clean.split('.')
  const padded = (frac + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(padded || '0')
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const signal = AbortSignal.timeout(TIMEOUT_MS)
  const res = await fetch(url, { ...init, signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

async function fetchSolana(net: NetworkEntry, owner: string): Promise<Partial<NonEvmChainHolding>> {
  const [balJson, splJson] = await Promise.all([
    fetchJson<{ result?: { value?: number }; error?: { message: string } }>(net.rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [owner] }),
    }),
    fetchJson<{
      result?: {
        value?: Array<{
          account?: {
            data?: { parsed?: { info?: { mint?: string; tokenAmount?: { amount?: string; decimals?: number } } } }
          }
        }>
      }
    }>(net.rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'getTokenAccountsByOwner',
        params: [owner, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, { encoding: 'jsonParsed' }],
      }),
    }).catch(() => ({ result: { value: [] } })),
  ])

  if (balJson.error) throw new Error(balJson.error.message)
  const native = balJson.result?.value != null ? BigInt(balJson.result.value) : null
  const tokens: NonEvmTokenHolding[] = []
  const byMint = new Map<string, { amount: bigint; decimals: number }>()
  for (const row of splJson.result?.value ?? []) {
    const info = row.account?.data?.parsed?.info
    const mint = info?.mint
    const amt = info?.tokenAmount?.amount
    const dec = info?.tokenAmount?.decimals
    if (!mint || amt == null || dec == null) continue
    const prev = byMint.get(mint) ?? { amount: 0n, decimals: dec }
    byMint.set(mint, { amount: prev.amount + BigInt(amt), decimals: dec })
  }

  for (const [mint, sym, name] of [
    [SOLANA_USDC, 'USDC', 'USD Coin (Circle Devnet)'],
    [SOLANA_EURC, 'EURC', 'Euro Coin (Circle Devnet)'],
  ] as const) {
    const hit = byMint.get(mint)
    tokens.push({ symbol: sym, name, address: mint, balance: hit?.amount ?? 0n, decimals: hit?.decimals ?? 6, verified: true })
    byMint.delete(mint)
  }
  for (const [mint, val] of byMint) {
    if (val.amount > 0n) {
      tokens.push({
        symbol: `${mint.slice(0, 4)}…${mint.slice(-3)}`,
        name: `SPL Token (${mint})`,
        address: mint,
        balance: val.amount,
        decimals: val.decimals,
        verified: false,
      })
    }
  }
  return { native, tokens }
}

async function fetchSui(net: NetworkEntry, owner: string): Promise<Partial<NonEvmChainHolding>> {
  const j = await fetchJson<{
    data?: { address?: { balances?: { nodes?: Array<{ coinType?: { repr?: string }; totalBalance?: string }> } } }
    errors?: Array<{ message: string }>
  }>(net.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: `{ address(address: "${owner}") { balances { nodes { coinType { repr } totalBalance } } } }`,
    }),
  })
  if (j.errors?.length) throw new Error(j.errors[0].message)
  const nodes = j.data?.address?.balances?.nodes ?? []
  let native = 0n
  let usdc = 0n
  const extra: NonEvmTokenHolding[] = []
  for (const n of nodes) {
    const repr = n.coinType?.repr ?? ''
    const bal = n.totalBalance ? BigInt(n.totalBalance) : 0n
    if (/::sui::SUI$/i.test(repr)) {
      native += bal
    } else if (repr.toLowerCase() === SUI_USDC.toLowerCase()) {
      usdc += bal
    } else if (bal > 0n) {
      const sym = repr.split('::').pop() ?? 'COIN'
      extra.push({ symbol: sym, name: repr, address: repr, balance: bal, decimals: 9, verified: false })
    }
  }
  return {
    native,
    tokens: [
      { symbol: 'USDC', name: 'USD Coin (Circle Testnet)', address: SUI_USDC, balance: usdc, decimals: 6, verified: true },
      ...extra,
    ],
  }
}

async function fetchAptos(net: NetworkEntry, owner: string): Promise<Partial<NonEvmChainHolding>> {
  const base = net.rpcUrl.replace(/\/$/, '')
  let native = 0n
  try {
    const res = await fetch(`${base}/accounts/${owner}/balance/0x1::aptos_coin::AptosCoin`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (res.ok) {
      native = BigInt((await res.json()) as string | number)
    } else if (res.status !== 404) {
      throw new Error(`HTTP ${res.status}`)
    }
  } catch (e) {
    throw e
  }

  let usdc = 0n
  try {
    const viewRes = await fetchJson<string[]>(`${base}/view`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        function: '0x1::primary_fungible_store::balance',
        type_arguments: ['0x1::fungible_asset::Metadata'],
        arguments: [owner, APTOS_USDC_FA],
      }),
    })
    if (viewRes?.[0]) usdc = BigInt(viewRes[0])
  } catch {
    // Account has no FA store yet -> 0n
  }

  return {
    native,
    tokens: [{ symbol: 'USDC', name: 'USD Coin (Aptos FA)', address: APTOS_USDC_FA, balance: usdc, decimals: 6, verified: true }],
  }
}

async function fetchStarknet(net: NetworkEntry, owner: string): Promise<Partial<NonEvmChainHolding>> {
  async function callBal(tokenAddr: string): Promise<bigint> {
    const j = await fetchJson<{ result?: string[]; error?: { message: string } }>(net.rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'starknet_call',
        params: [
          {
            contract_address: tokenAddr,
            entry_point_selector: STARKNET_BALANCE_OF,
            calldata: [owner],
          },
          'latest',
        ],
      }),
    })
    if (j.error) throw new Error(j.error.message)
    const [low = '0x0', high = '0x0'] = j.result ?? []
    return BigInt(low) + (BigInt(high) << 128n)
  }

  const [strk, eth, usdc] = await Promise.all([
    callBal(STARKNET_STRK),
    callBal(STARKNET_ETH).catch(() => null),
    callBal(STARKNET_USDC).catch(() => null),
  ])
  return {
    native: strk,
    tokens: [
      { symbol: 'ETH', name: 'Ether (Starknet Sepolia)', address: STARKNET_ETH, balance: eth, decimals: 18, verified: true },
      { symbol: 'USDC', name: 'USD Coin (Starknet Sepolia)', address: STARKNET_USDC, balance: usdc, decimals: 6, verified: true },
    ],
  }
}

async function fetchStellar(net: NetworkEntry, owner: string): Promise<Partial<NonEvmChainHolding>> {
  const base = net.rpcUrl.replace(/\/$/, '')
  const res = await fetch(`${base}/accounts/${owner}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (res.status === 404) {
    return {
      native: 0n,
      tokens: [
        { symbol: 'USDC', name: 'USD Coin (Stellar Testnet)', address: STELLAR_USDC_ISSUER, balance: 0n, decimals: 7, verified: true },
        { symbol: 'EURC', name: 'Euro Coin (Stellar Testnet)', address: STELLAR_EURC_ISSUER, balance: 0n, decimals: 7, verified: true },
      ],
    }
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const j = (await res.json()) as {
    balances?: Array<{ asset_type: string; asset_code?: string; asset_issuer?: string; balance: string }>
  }
  let native = 0n
  let usdc = 0n
  let eurc = 0n
  const extra: NonEvmTokenHolding[] = []
  for (const b of j.balances ?? []) {
    const scaled = scaleDecimalToBigInt(b.balance, 7)
    if (b.asset_type === 'native') native = scaled
    else if (b.asset_code === 'USDC' && b.asset_issuer === STELLAR_USDC_ISSUER) usdc = scaled
    else if (b.asset_code === 'EURC' && b.asset_issuer === STELLAR_EURC_ISSUER) eurc = scaled
    else if (b.asset_code && scaled > 0n) {
      extra.push({
        symbol: b.asset_code,
        name: `${b.asset_code} (${b.asset_issuer ?? 'Stellar'})`,
        address: b.asset_issuer ?? b.asset_code,
        balance: scaled,
        decimals: 7,
        verified: false,
      })
    }
  }
  return {
    native,
    tokens: [
      { symbol: 'USDC', name: 'USD Coin (Stellar Testnet)', address: STELLAR_USDC_ISSUER, balance: usdc, decimals: 7, verified: true },
      { symbol: 'EURC', name: 'Euro Coin (Stellar Testnet)', address: STELLAR_EURC_ISSUER, balance: eurc, decimals: 7, verified: true },
      ...extra,
    ],
  }
}

async function fetchAlgorand(net: NetworkEntry, owner: string): Promise<Partial<NonEvmChainHolding>> {
  const origin = new URL(net.rpcUrl).origin
  const j = await fetchJson<{
    amount?: number
    assets?: Array<{ 'asset-id': number; amount: number }>
  }>(`${origin}/v2/accounts/${owner}`)
  const native = BigInt(j.amount ?? 0)
  const usdcAsa = (j.assets ?? []).find((a) => a['asset-id'] === ALGORAND_USDC_ASA)
  return {
    native,
    tokens: [
      {
        symbol: 'USDC',
        name: 'USD Coin (Algorand ASA 10458941)',
        address: String(ALGORAND_USDC_ASA),
        balance: BigInt(usdcAsa?.amount ?? 0),
        decimals: 6,
        verified: true,
      },
    ],
  }
}

async function fetchNear(net: NetworkEntry, owner: string): Promise<Partial<NonEvmChainHolding>> {
  let native = 0n
  const acctJson = await fetchJson<{ result?: { amount?: string }; error?: { cause?: { name?: string }; data?: string; message?: string } }>(
    net.rpcUrl,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'query', params: { request_type: 'view_account', finality: 'final', account_id: owner } }),
    },
  )
  if (acctJson.error) {
    const txt = `${acctJson.error.cause?.name ?? ''} ${acctJson.error.data ?? ''} ${acctJson.error.message ?? ''}`
    if (/UNKNOWN_ACCOUNT|does not exist/i.test(txt)) native = 0n
    else throw new Error(txt.slice(0, 80))
  } else if (acctJson.result?.amount != null) {
    native = BigInt(acctJson.result.amount)
  }

  let usdc = 0n
  try {
    const argsBase64 = btoa(JSON.stringify({ account_id: owner }))
    const ftJson = await fetchJson<{ result?: { result?: number[] } }>(net.rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'query',
        params: {
          request_type: 'call_function',
          finality: 'final',
          account_id: NEAR_USDC_CONTRACT,
          method_name: 'ft_balance_of',
          args_base64: argsBase64,
        },
      }),
    })
    if (ftJson.result?.result) {
      const parsed = JSON.parse(new TextDecoder().decode(Uint8Array.from(ftJson.result.result))) as string
      if (parsed) usdc = BigInt(parsed)
    }
  } catch {
    // No NEP-141 balance / RPC skip
  }

  return {
    native,
    tokens: [{ symbol: 'USDC', name: 'USD Coin (NEAR Testnet)', address: NEAR_USDC_CONTRACT, balance: usdc, decimals: 6, verified: true }],
  }
}

async function fetchNoble(net: NetworkEntry, owner: string): Promise<Partial<NonEvmChainHolding>> {
  const origin = new URL(net.rpcUrl).origin
  const j = await fetchJson<{ balances?: Array<{ denom: string; amount: string }> }>(
    `${origin}/cosmos/bank/v1beta1/balances/${owner}`,
  )
  const list = j.balances ?? []
  const uusdc = list.find((b) => b.denom === 'uusdc')
  const native = BigInt(uusdc?.amount ?? '0')
  const tokens: NonEvmTokenHolding[] = []
  for (const b of list) {
    if (b.denom === 'uusdc') continue
    const bal = BigInt(b.amount)
    if (bal <= 0n) continue
    tokens.push({
      symbol: b.denom.replace(/^u/, '').toUpperCase(),
      name: `Noble ${b.denom}`,
      address: b.denom,
      balance: bal,
      decimals: 6,
      verified: b.denom === 'uusdn' || b.denom === 'ustake',
    })
  }
  return { native, tokens }
}

const SS58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const SYSTEM_ACCOUNT_PREFIX = '0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9'

function decodeSs58Pubkey(addr: string): Uint8Array {
  let n = 0n
  for (const ch of addr) {
    const idx = SS58_ALPHABET.indexOf(ch)
    if (idx < 0) throw new Error('Invalid SS58 address')
    n = n * 58n + BigInt(idx)
  }
  const bytes: number[] = []
  while (n > 0n) {
    bytes.unshift(Number(n & 0xffn))
    n >>= 8n
  }
  for (const ch of addr) {
    if (ch === '1') bytes.unshift(0)
    else break
  }
  const u = Uint8Array.from(bytes)
  const prefixLen = u[0] < 64 ? 1 : 2
  if (u.length < prefixLen + 32) throw new Error('Invalid SS58 payload length')
  return u.slice(prefixLen, prefixLen + 32)
}

async function fetchPolkadot(net: NetworkEntry, owner: string): Promise<Partial<NonEvmChainHolding>> {
  const pub = decodeSs58Pubkey(owner)
  const h128 = blake2b(pub, { dkLen: 16 })
  const hexOf = (arr: Uint8Array) => Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
  const storageKey = `${SYSTEM_ACCOUNT_PREFIX}${hexOf(h128)}${hexOf(pub)}`
  const j = await fetchJson<{ result?: string | null; error?: { message: string } }>(net.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'state_getStorage', params: [storageKey] }),
  })
  if (j.error) throw new Error(j.error.message)
  if (!j.result) return { native: 0n, tokens: [] }
  const clean = j.result.replace(/^0x/, '')
  let free = 0n
  // AccountInfo: nonce(4) + consumers(4) + providers(4) + sufficients(4) = 16 bytes, then u128 LE free [16..32)
  if (clean.length >= 64) {
    for (let i = 31; i >= 16; i--) {
      const byte = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
      free = (free << 8n) + BigInt(byte)
    }
  }
  return { native: free, tokens: [] }
}

function decodeXrplCurrency(cur: string): string {
  if (cur.length <= 3) return cur
  if (/^[0-9A-Fa-f]{40}$/.test(cur)) {
    const chars: number[] = []
    for (let i = 0; i < 40; i += 2) {
      const b = parseInt(cur.slice(i, i + 2), 16)
      if (b !== 0) chars.push(b)
    }
    const str = String.fromCharCode(...chars).trim()
    if (/^[A-Za-z0-9]{2,12}$/.test(str)) return str
  }
  return cur.slice(0, 6)
}

async function fetchXrpl(net: NetworkEntry, owner: string): Promise<Partial<NonEvmChainHolding>> {
  const infoJson = await fetchJson<{
    result?: { status?: string; error?: string; error_message?: string; account_data?: { Balance?: string } }
  }>(net.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ method: 'account_info', params: [{ account: owner, ledger_index: 'validated' }] }),
  })
  if (infoJson.result?.error === 'actNotFound') {
    return {
      native: 0n,
      tokens: [{ symbol: 'USDC', name: 'USD Coin (XRPL Testnet)', address: XRPL_USDC_ISSUER, balance: 0n, decimals: 6, verified: true }],
    }
  }
  if (infoJson.result?.error) throw new Error(infoJson.result.error_message || infoJson.result.error)
  const native = BigInt(infoJson.result?.account_data?.Balance ?? '0')

  const linesJson = await fetchJson<{
    result?: { lines?: Array<{ account: string; currency: string; balance: string }> }
  }>(net.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ method: 'account_lines', params: [{ account: owner, ledger_index: 'validated' }] }),
  }).catch(() => ({ result: { lines: [] } }))

  let usdcFound = false
  const tokens: NonEvmTokenHolding[] = []
  for (const line of linesJson.result?.lines ?? []) {
    const sym = decodeXrplCurrency(line.currency)
    const bal = scaleDecimalToBigInt(line.balance, 6)
    const isCircleUsdc = sym === 'USDC' && line.account === XRPL_USDC_ISSUER
    if (isCircleUsdc) usdcFound = true
    if (bal > 0n || isCircleUsdc) {
      tokens.push({
        symbol: sym,
        name: `${sym} (${line.account.slice(0, 8)}…)`,
        address: line.account,
        balance: bal,
        decimals: 6,
        verified: isCircleUsdc,
      })
    }
  }
  if (!usdcFound) {
    tokens.unshift({
      symbol: 'USDC',
      name: 'USD Coin (XRPL Testnet)',
      address: XRPL_USDC_ISSUER,
      balance: 0n,
      decimals: 6,
      verified: true,
    })
  }
  return { native, tokens }
}

export async function loadNonEvmPortfolio(
  accounts: Partial<Record<NonEvmFamily, NonEvmAccount>>,
): Promise<NonEvmChainHolding[]> {
  const targets = NON_EVM_NETWORKS.filter((n) => n.walletFamily !== 'evm' && Boolean(accounts[n.walletFamily]?.address))
  if (targets.length === 0) return []

  const results = await Promise.all(
    targets.map(async (net): Promise<NonEvmChainHolding> => {
      const owner = accounts[net.walletFamily as NonEvmFamily]!.address.trim()
      const t0 = performance.now()
      try {
        let partial: Partial<NonEvmChainHolding> = {}
        if (net.family === 'solana') partial = await fetchSolana(net, owner)
        else if (net.family === 'sui') partial = await fetchSui(net, owner)
        else if (net.family === 'aptos') partial = await fetchAptos(net, owner)
        else if (net.family === 'starknet') partial = await fetchStarknet(net, owner)
        else if (net.family === 'stellar') partial = await fetchStellar(net, owner)
        else if (net.family === 'algorand') partial = await fetchAlgorand(net, owner)
        else if (net.family === 'near') partial = await fetchNear(net, owner)
        else if (net.family === 'cosmos') partial = await fetchNoble(net, owner)
        else if (net.family === 'polkadot') partial = await fetchPolkadot(net, owner)
        else if (net.family === 'xrpl') partial = await fetchXrpl(net, owner)
        return {
          networkId: net.id,
          network: net,
          owner,
          native: partial.native ?? null,
          tokens: partial.tokens ?? [],
          ms: Math.round(performance.now() - t0),
        }
      } catch (e) {
        return {
          networkId: net.id,
          network: net,
          owner,
          native: null,
          nativeError: (e as Error).message.slice(0, 90),
          tokens: [],
          ms: Math.round(performance.now() - t0),
        }
      }
    }),
  )

  return results
}
