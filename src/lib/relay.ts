/**
 * Relay Protocol integration — fast intent-based testnet bridging.
 *
 * Uses the testnet API: https://api.testnets.relay.link
 * Docs: https://docs.relay.link/
 *
 * Relay is "intent-based": the user signs a tx depositing to a Relay solver,
 * and the solver fills on the destination within seconds. Very UX-friendly.
 *
 * API key: check VITE_RELAY_API_KEY. The testnet endpoint may work without a key
 * for small amounts; production always requires one.
 */

const TESTNET_API = 'https://api.testnets.relay.link'
const API_KEY = import.meta.env.VITE_RELAY_API_KEY as string | undefined

const TIMEOUT_MS = 15_000

function relayHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (API_KEY) h['x-relay-api-key'] = API_KEY
  return h
}

async function relayGet<T>(path: string): Promise<T> {
  const res = await fetch(`${TESTNET_API}${path}`, {
    headers: relayHeaders(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Relay GET ${path} → HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

async function relayPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${TESTNET_API}${path}`, {
    method: 'POST',
    headers: relayHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Relay POST ${path} → HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface RelayChain {
  id: number
  name: string
  displayName?: string
  logoUrl?: string
  depositEnabled?: boolean
  withdrawalEnabled?: boolean
}

export interface RelayCurrency {
  chainId: number
  address: string
  symbol: string
  name: string
  decimals: number
  logoUrl?: string
}

export interface RelayQuote {
  requestId: string
  steps: RelayStep[]
  fees: RelayFees
  details: RelayDetails
}

export interface RelayStep {
  id: string
  action: string
  description: string
  kind: 'transaction' | 'signature' | 'approval'
  items: Array<{
    status: string
    data?: {
      from?: string
      to?: string
      data?: string
      value?: string
      chainId?: number
      gas?: string
      maxFeePerGas?: string
      maxPriorityFeePerGas?: string
    }
    check?: { endpoint?: string; payload?: Record<string, unknown> }
  }>
}

export interface RelayFees {
  gas: string
  relayer: string
  relayerGas: string
  relayerService: string
  app: string
}

export interface RelayDetails {
  operation: string
  timeEstimate: number
  currencyIn: { currency: RelayCurrency; amount: string; amountUsd?: string }
  currencyOut: { currency: RelayCurrency; amount: string; amountUsd?: string }
}

export interface RelayRequestStatus {
  id: string
  status: 'waiting' | 'pending' | 'validating' | 'failed' | 'refunded' | 'success'
  statusReason?: string
  txHash?: string
  destinationTxHash?: string
  inTxHashes?: string[]
  outTxHashes?: string[]
  originChainId?: number
  destinationChainId?: number
}

// ─── Chain Discovery ─────────────────────────────────────────────────────────

let _relayChainCache: RelayChain[] | null = null

/** Fetch all chains supported by Relay on testnet (cached per session). */
export async function getRelayChains(): Promise<RelayChain[]> {
  if (_relayChainCache) return _relayChainCache
  try {
    const data = await relayGet<{ chains: RelayChain[] }>('/chains')
    _relayChainCache = data.chains ?? []
    return _relayChainCache
  } catch {
    return []
  }
}

let _relayChainIds: Set<number> | null = null
export async function getRelaySupportedChainIds(): Promise<Set<number>> {
  if (_relayChainIds) return _relayChainIds
  const chains = await getRelayChains()
  _relayChainIds = new Set(chains.map((c) => c.id))
  return _relayChainIds
}

/** Currencies (tokens) Relay supports on a chain pair. */
export async function getRelayCurrencies(fromChainId: number, toChainId: number): Promise<RelayCurrency[]> {
  try {
    const data = await relayGet<{ currencies: RelayCurrency[] }>(
      `/currencies?fromChainId=${fromChainId}&toChainId=${toChainId}`,
    )
    return data.currencies ?? []
  } catch {
    return []
  }
}

// ─── Quote ───────────────────────────────────────────────────────────────────

export interface RelayQuoteParams {
  user: string
  originChainId: number
  destinationChainId: number
  /** Token address — use '0x0000000000000000000000000000000000000000' for native ETH */
  originCurrency: string
  destinationCurrency: string
  /** Amount in smallest unit (wei for ETH) */
  amount: string
  /** Optional: recipient address (defaults to user) */
  recipient?: string
  /** If true, `amount` is the amount to receive (tradeType = 'EXACT_OUTPUT') */
  exactOutput?: boolean
}

/**
 * Fetch a Relay bridge quote.
 * Returns null if Relay doesn't support this chain/token pair.
 */
export async function fetchRelayQuote(params: RelayQuoteParams): Promise<RelayQuote | null> {
  // Check chain support first
  const supported = await getRelaySupportedChainIds()
  if (!supported.has(params.originChainId) || !supported.has(params.destinationChainId)) {
    return null
  }

  try {
    const body: Record<string, unknown> = {
      user: params.user,
      originChainId: params.originChainId,
      destinationChainId: params.destinationChainId,
      originCurrency: params.originCurrency,
      destinationCurrency: params.destinationCurrency,
      amount: params.amount,
      tradeType: params.exactOutput ? 'EXACT_OUTPUT' : 'EXACT_INPUT',
    }
    if (params.recipient && params.recipient !== params.user) {
      body.recipient = params.recipient
    }

    const quote = await relayPost<RelayQuote>('/quote', body)
    return quote
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // 400/404 = pair not supported
    if (msg.includes('HTTP 400') || msg.includes('HTTP 404') || msg.includes('HTTP 422')) {
      return null
    }
    throw err
  }
}

// ─── Transaction Building ────────────────────────────────────────────────────

export interface RelayPreparedTx {
  to: string
  data: string
  value: bigint
  chainId: number
  gas?: bigint
  /** Original quote, for status polling */
  quote: RelayQuote
  /** requestId for status polling */
  requestId: string
}

/**
 * Extract the transaction data from the first transaction step of a Relay quote.
 * Returns null if no transaction step found.
 */
export function buildRelayTx(quote: RelayQuote): RelayPreparedTx | null {
  const txStep = quote.steps.find((s) => s.kind === 'transaction' || s.action === 'deposit')
  if (!txStep) return null

  const item = txStep.items[0]
  if (!item?.data) return null

  return {
    to: item.data.to ?? '',
    data: item.data.data ?? '0x',
    value: BigInt(item.data.value ?? '0'),
    chainId: item.data.chainId ?? quote.details.currencyIn.currency.chainId,
    gas: item.data.gas ? BigInt(item.data.gas) : undefined,
    quote,
    requestId: quote.requestId,
  }
}

// ─── Status Tracking ────────────────────────────────────────────────────────

/**
 * Check the status of a Relay bridge request.
 */
export async function checkRelayStatus(requestId: string): Promise<RelayRequestStatus | null> {
  try {
    const status = await relayGet<RelayRequestStatus>(`/requests/v2/${requestId}`)
    return status
  } catch {
    return null
  }
}

/**
 * Poll Relay status until terminal state or timeout.
 */
export async function pollRelayStatus(
  requestId: string,
  onUpdate: (s: RelayRequestStatus) => void,
  timeoutMs = 5 * 60_000,
): Promise<RelayRequestStatus | null> {
  const deadline = Date.now() + timeoutMs
  let interval = 3_000

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval))
    const status = await checkRelayStatus(requestId)
    if (!status) continue
    onUpdate(status)
    if (status.status === 'success' || status.status === 'failed' || status.status === 'refunded') {
      return status
    }
    interval = Math.min(interval * 1.2, 15_000)
  }

  return null
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/** Format a Relay amount from string wei to human-readable. */
export function relayFmtAmount(amount: string, decimals: number): string {
  if (!amount) return '—'
  const raw = BigInt(amount)
  const divisor = 10n ** BigInt(decimals)
  const whole = raw / divisor
  const frac = raw % divisor
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '').slice(0, 6)
  return fracStr ? `${whole}.${fracStr}` : String(whole)
}

/** Estimated fill time label. */
export function relayTimeLabel(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`
  return `~${Math.round(seconds / 60)}m`
}

export const RELAY_NATIVE = '0x0000000000000000000000000000000000000000'
