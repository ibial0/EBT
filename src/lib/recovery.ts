/**
 * Recovery detection.
 *
 * A transfer is recoverable only when the burn happened, Circle attested the message, and the
 * destination has not already processed it. That last part is checked on chain (usedNonces),
 * never inferred from local state.
 *
 * CCTP v2 attestations expire (~24h). An expired message cannot be minted, but Circle can
 * re-attest the same burn: POST /v2/reattest/{nonce} returns a fresh message with a new
 * expiration block, which is then minted normally.
 */
import { getPublicClient, getWalletClient } from 'wagmi/actions'
import type { Address } from 'viem'
import { getChain } from '../config/chains'
import { isMessageUsed, submitReceiveMessage } from './bridgeExec'
import { finalizeFromSteps, listActivity, updateActivity, updateStep, type ActivityItem } from './activity'
import { decodeCctpMessage, isCctpExpired } from './cctpMessage'
import { fetchAttestation, requestReattest } from './cctp'
import { decodeTxError } from './errors'
import { walletSender } from './tx'
import { wagmiConfig } from './wallet'

export interface Recoverable {
  item: ActivityItem
  destChainId: number
  destChainName: string
  message: `0x${string}`
  attestation: `0x${string}`
  amount: string
  symbol: string
  used: boolean
  checked: boolean
  /** The stored message passed its expiration block, so Circle has to re-sign it first. */
  expired: boolean
  error?: string
}

function candidates(): ActivityItem[] {
  return listActivity().filter((i) => {
    if (i.provider !== 'cctp') return false
    const msg = i.meta?.message as string | undefined
    const att = i.meta?.attestation as string | undefined
    if (!msg || !att) return false
    const receive = i.steps.find((s) => s.key === 'receive')
    return receive?.status !== 'done'
  })
}

/** The burn hash is what Iris indexes, so it must come from the send step, not the mint. */
function burnHashOf(item: ActivityItem): string | undefined {
  const send = item.steps.find((s) => s.key === 'send')
  return send?.hash as string | undefined
}

/** Checks each candidate on the destination chain in parallel. */
export async function scanRecoverables(): Promise<Recoverable[]> {
  const list = candidates()
  return Promise.all(
    list.map(async (item) => {
      const dest = getChain(item.toChainId)
      const base: Recoverable = {
        item,
        destChainId: item.toChainId,
        destChainName: dest?.name ?? String(item.toChainId),
        message: item.meta!.message as `0x${string}`,
        attestation: item.meta!.attestation as `0x${string}`,
        amount: item.amountIn,
        symbol: 'USDC',
        used: false,
        checked: false,
        expired: false,
      }
      if (!dest) return { ...base, error: 'destination chain not in the registry' }
      try {
        const client = getPublicClient(wagmiConfig, { chainId: dest.id as never })
        if (!client) return { ...base, error: 'no RPC for destination' }
        const [used, block] = await Promise.all([isMessageUsed(client, base.message), client.getBlockNumber()])
        const decoded = decodeCctpMessage(base.message)
        return { ...base, used, checked: true, expired: decoded ? isCctpExpired(decoded.expirationBlock, block) : false }
      } catch (e) {
        return { ...base, error: (e as Error).message.slice(0, 80) }
      }
    }),
  )
}

export interface RecoverResult {
  id: string
  ok: boolean
  hash?: string
  error?: string
}

/** Ask Circle for a fresh attestation of the same burn and wait until it answers. */
async function refreshAttestation(
  r: Recoverable,
): Promise<{ message: `0x${string}`; attestation: `0x${string}` } | { error: string }> {
  const decoded = decodeCctpMessage(r.message)
  if (!decoded) return { error: 'the stored CCTP message is malformed' }
  const burnHash = burnHashOf(r.item)
  if (!burnHash) return { error: 'the burn transaction hash is missing from this entry' }

  const asked = await requestReattest(decoded.nonce)
  if (!asked) return { error: 'Circle refused the re-attestation request for this nonce' }

  for (let i = 0; i < 20; i++) {
    const st = await fetchAttestation(decoded.sourceDomain, burnHash)
    if (st.state === 'complete' && st.attestation !== r.attestation) {
      updateActivity(r.item.id, { meta: { ...(r.item.meta ?? {}), message: st.message, attestation: st.attestation } })
      return { message: st.message, attestation: st.attestation }
    }
    await new Promise((resolve) => setTimeout(resolve, 6000))
  }
  return { error: 'Circle has not issued the fresh attestation yet — press Recover again in a minute.' }
}

function looksExpired(message: string) {
  return /expired|re-signed/i.test(message)
}

/** Signs one mint. Never touches the source chain, so it cannot burn anything again. */
export async function recoverOne(r: Recoverable, account: Address): Promise<RecoverResult> {
  const chain = getChain(r.destChainId)
  if (!chain) return { id: r.item.id, ok: false, error: 'unknown destination chain' }
  try {
    const client = getPublicClient(wagmiConfig, { chainId: chain.id as never })!
    const wallet = await getWalletClient(wagmiConfig, { chainId: chain.id as never })
    if (!wallet) return { id: r.item.id, ok: false, error: 'wallet is not on the destination chain' }
    const sender = walletSender(wallet)

    let message = r.message
    let attestation = r.attestation

    const mint = async () => {
      if (await isMessageUsed(client, message)) {
        updateStep(r.item.id, 'receive', { status: 'done', note: 'Already minted' })
        finalizeFromSteps(r.item.id)
        return { already: true as const }
      }
      updateStep(r.item.id, 'receive', { status: 'active', note: 'Waiting for signature' })
      const hash = await submitReceiveMessage({ chain, account, message, attestation, wallet: sender, client })
      return { already: false as const, hash }
    }

    if (r.expired) {
      updateStep(r.item.id, 'receive', { status: 'active', note: 'Message expired — asking Circle to re-attest' })
      const fresh = await refreshAttestation(r)
      if ('error' in fresh) throw new Error(fresh.error)
      message = fresh.message
      attestation = fresh.attestation
    }

    let out: { already: boolean; hash?: string }
    try {
      out = await mint()
    } catch (e) {
      // The chain can reject an attestation the scan had not seen expire yet; refresh and retry once.
      if (!looksExpired((e as Error).message)) throw e
      updateStep(r.item.id, 'receive', { status: 'active', note: 'Message expired — asking Circle to re-attest' })
      const fresh = await refreshAttestation({ ...r, message, attestation })
      if ('error' in fresh) throw new Error(fresh.error)
      message = fresh.message
      attestation = fresh.attestation
      out = await mint()
    }

    if (out.already) return { id: r.item.id, ok: true, error: 'already minted' }
    updateStep(r.item.id, 'receive', { status: 'done', hash: out.hash })
    finalizeFromSteps(r.item.id)
    updateActivity(r.item.id, { meta: { ...(r.item.meta ?? {}), message, attestation, recovered: true } })
    return { id: r.item.id, ok: true, hash: out.hash }
  } catch (e) {
    const d = decodeTxError(e, chain.id)
    updateStep(r.item.id, 'receive', { status: 'failed', note: `${d.title}: ${d.detail}` })
    finalizeFromSteps(r.item.id)
    return { id: r.item.id, ok: false, error: `${d.title}: ${d.detail}` }
  }
}

/** Sequential by design: every mint is its own signature and its own failure domain. */
export async function recoverAll(items: Recoverable[], account: Address): Promise<RecoverResult[]> {
  const out: RecoverResult[] = []
  for (const r of items) {
    if (r.used || !r.checked) {
      out.push({ id: r.item.id, ok: false, error: r.used ? 'already minted' : r.error ?? 'not verified' })
      continue
    }
    out.push(await recoverOne(r, account))
  }
  return out
}
