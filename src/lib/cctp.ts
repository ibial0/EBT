/**
 * Circle CCTP v2 (testnet).
 *
 * Verified 2026-11-23 against:
 *  - https://developers.circle.com/cctp/references/contract-addresses (TokenMessengerV2 / MessageTransmitterV2)
 *  - https://developers.circle.com/cctp/references/contract-interfaces (depositForBurn / receiveMessage)
 *  - https://developers.circle.com/cctp/concepts/fees (minimumFee is in basis points)
 *  - live Iris sandbox API (CORS: Access-Control-Allow-Origin: *)
 */
import { parseAbi } from 'viem'
import { CCTP_TOKEN_MESSENGER_V2, CCTP_MESSAGE_TRANSMITTER_V2, getChain } from '../config/chains'

export const IRIS_BASE = 'https://iris-api-sandbox.circle.com'

export const tokenMessengerV2Abi = parseAbi([
  'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold) returns (uint64 nonce)',
  'function localDomain() view returns (uint32)',
])

export const messageTransmitterV2Abi = parseAbi([
  'function receiveMessage(bytes message, bytes attestation) returns (bool success)',
  'function usedNonces(bytes32) view returns (uint256)',
])

export const FINALITY_FAST = 1000
export const FINALITY_STANDARD = 2000

export interface CctpFees {
  /** fast transfer fee in basis points (finalityThreshold 1000) */
  fastBps: number
  /** standard transfer fee in basis points (usually 0) */
  standardBps: number
  fetchedAt: number
}

const feeCache = new Map<string, CctpFees>()

export async function fetchCctpFees(sourceDomain: number, destDomain: number): Promise<CctpFees> {
  const key = `${sourceDomain}->${destDomain}`
  const cached = feeCache.get(key)
  if (cached && Date.now() - cached.fetchedAt < 60_000) return cached

  const res = await fetch(`${IRIS_BASE}/v2/burn/USDC/fees/${sourceDomain}/${destDomain}`)
  if (!res.ok) throw new Error(`Circle fee API returned ${res.status}`)
  const rows = (await res.json()) as Array<{ finalityThreshold: number; minimumFee: number }>
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Circle fee API returned an empty fee table')

  const fast = rows.find((r) => r.finalityThreshold === FINALITY_FAST)
  const std = rows.find((r) => r.finalityThreshold === FINALITY_STANDARD)
  const fees: CctpFees = {
    fastBps: Number(fast?.minimumFee ?? 0),
    standardBps: Number(std?.minimumFee ?? 0),
    fetchedAt: Date.now(),
  }
  feeCache.set(key, fees)
  return fees
}

/** maxFee = amount * bps / 10_000, plus a buffer so the burn does not revert if the fee ticks up. */
export function maxFeeFor(amount: bigint, bps: number, bufferPct = 25): bigint {
  if (bps <= 0) return 0n
  const base = (amount * BigInt(Math.round(bps * 100))) / 1_000_000n // bps -> subunits
  return (base * BigInt(100 + bufferPct)) / 100n
}

export function toBytes32(address: string): `0x${string}` {
  const clean = address.toLowerCase().replace(/^0x/, '')
  if (clean.length !== 40) throw new Error('mintRecipient must be a 20-byte EVM address')
  return `0x${'0'.repeat(24)}${clean}`
}

export function cctpRouteAvailable(fromId: number, toId: number): boolean {
  const a = getChain(fromId)
  const b = getChain(toId)
  return Boolean(a && b && a.cctpDomain != null && b.cctpDomain != null && a.usdc && b.usdc && fromId !== toId)
}

export function buildDepositForBurnArgs(params: {
  amount: bigint
  destDomain: number
  recipient: string
  burnToken: string
  maxFee: bigint
  fast: boolean
}) {
  return [
    params.amount,
    params.destDomain,
    toBytes32(params.recipient),
    params.burnToken as `0x${string}`,
    `0x${'0'.repeat(64)}` as `0x${string}`,
    params.maxFee,
    params.fast ? FINALITY_FAST : FINALITY_STANDARD,
  ] as const
}

export const TOKEN_MESSENGER: `0x${string}` = CCTP_TOKEN_MESSENGER_V2
export const MESSAGE_TRANSMITTER: `0x${string}` = CCTP_MESSAGE_TRANSMITTER_V2

export type AttestationState =
  | { state: 'pending'; detail: string }
  | { state: 'complete'; message: `0x${string}`; attestation: `0x${string}` }
  | { state: 'error'; detail: string }

/** Poll the Iris attestation service for a burn transaction. */
export async function fetchAttestation(sourceDomain: number, txHash: string): Promise<AttestationState> {
  let res: Response
  try {
    res = await fetch(
      `${IRIS_BASE}/v2/messages/${sourceDomain}?transactionHash=${txHash}&cctpVersion=2`,
      { headers: { accept: 'application/json' } },
    )
  } catch (e) {
    return { state: 'error', detail: `Network error reaching Circle Iris: ${(e as Error).message}` }
  }

  if (res.status === 404) {
    return { state: 'pending', detail: 'Burn not indexed yet, waiting for source-chain finality.' }
  }
  if (!res.ok) {
    return { state: 'error', detail: `Circle Iris returned ${res.status}` }
  }

  const body = (await res.json()) as {
    messages?: Array<{
      status?: string
      message?: string
      attestation?: string
      eventNonce?: string
      cctpVersion?: number
    }>
  }
  const msg = body.messages?.[0]
  if (!msg) return { state: 'pending', detail: 'No CCTP message indexed for this transaction yet.' }
  if (msg.status === 'complete' && msg.message && msg.attestation) {
    return { state: 'complete', message: msg.message as `0x${string}`, attestation: msg.attestation as `0x${string}` }
  }
  return { state: 'pending', detail: `Attestation status: ${msg.status ?? 'pending'}` }
}

export const ATT_ = { fast: 'Fast transfer: attested after source-chain soft finality.', standard: 'Standard: attested after source-chain hard finality.' }

/**
 * CCTP v2 attestations carry an expirationBlock ~24h ahead. Once it passes the mint reverts
 * with "Message expired and must be re-signed", so ask Circle to re-attest the same burn.
 * The docs expose the nonce either raw hex or 0x-prefixed depending on version, so try both.
 */
export async function requestReattest(nonce: string): Promise<boolean> {
  const candidates = [nonce, nonce.replace(/^0x/, '')]
  for (const value of candidates) {
    try {
      const res = await fetch(`${IRIS_BASE}/v2/reattest/${value}`, { method: 'POST' })
      if (res.ok) return true
    } catch {
      /* try the next form */
    }
  }
  return false
}
