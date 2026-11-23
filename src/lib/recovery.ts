/**
 * Recovery detection.
 *
 * A transfer is recoverable only when the burn happened, Circle attested the message, and the
 * destination has not already processed it. That last part is checked on chain (usedNonces),
 * never inferred from local state.
 */
import { getPublicClient, getWalletClient } from 'wagmi/actions'
import type { Address } from 'viem'
import { getChain } from '../config/chains'
import { isMessageUsed, submitReceiveMessage } from './bridgeExec'
import { finalizeFromSteps, listActivity, updateActivity, updateStep, type ActivityItem } from './activity'
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
      }
      if (!dest) return { ...base, error: 'destination chain not in the registry' }
      try {
        const client = getPublicClient(wagmiConfig, { chainId: dest.id as never })
        if (!client) return { ...base, error: 'no RPC for destination' }
        const used = await isMessageUsed(client, base.message)
        return { ...base, used, checked: true }
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

/** Signs one mint. Never touches the source chain, so it cannot burn anything again. */
export async function recoverOne(r: Recoverable, account: Address): Promise<RecoverResult> {
  const chain = getChain(r.destChainId)
  if (!chain) return { id: r.item.id, ok: false, error: 'unknown destination chain' }
  try {
    const client = getPublicClient(wagmiConfig, { chainId: chain.id as never })!
    if (await isMessageUsed(client, r.message)) {
      updateStep(r.item.id, 'receive', { status: 'done', note: 'Already minted' })
      finalizeFromSteps(r.item.id)
      return { id: r.item.id, ok: true, error: 'already minted' }
    }
    const wallet = await getWalletClient(wagmiConfig, { chainId: chain.id as never })
    if (!wallet) return { id: r.item.id, ok: false, error: 'wallet is not on the destination chain' }

    updateStep(r.item.id, 'receive', { status: 'active', note: 'Waiting for signature' })
    const hash = await submitReceiveMessage({
      chain,
      account,
      message: r.message,
      attestation: r.attestation,
      wallet: walletSender(wallet),
      client,
    })
    updateStep(r.item.id, 'receive', { status: 'done', hash })
    finalizeFromSteps(r.item.id)
    updateActivity(r.item.id, { meta: { ...(r.item.meta ?? {}), recovered: true } })
    return { id: r.item.id, ok: true, hash }
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
