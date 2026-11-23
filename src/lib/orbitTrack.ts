/**
 * Arbitrum Orbit deposit arrival tracker.
 *
 * An Orbit deposit is a retryable ticket: the destination transaction is created by the
 * sequencer's redemption, so its hash is not derivable locally the way an OP Stack deposit
 * is. Instead the tracker compares the recipient's balance on the Orbit chain against the
 * balance recorded when the deposit was submitted. The L1 hash is always stored too, so
 * the transfer can be verified on the explorer regardless.
 */
import type { PublicClient } from 'viem'
import { getActivity, listActivity, updateActivity, updateStep, finalizeFromSteps } from './activity'
import { appendStep } from './activity'

const running = new Map<string, number>()

export function isOrbitTracking(id: string) {
  return running.has(id)
}

export async function pollOrbitOnce(id: string, l2: PublicClient): Promise<'pending' | 'complete' | 'failed' | 'idle'> {
  const item = getActivity(id)
  if (!item || item.provider !== 'orbit') return 'idle'

  const expected = item.meta?.orbitExpected ? BigInt(String(item.meta.orbitExpected)) : 0n
  const baseline = item.meta?.orbitBaseline != null ? BigInt(String(item.meta.orbitBaseline)) : null
  const step = item.steps.find((s) => s.key.startsWith('arrive'))
  const deposit = item.steps.find((s) => s.key.startsWith('leg') && s.hash)
  if (!deposit) return 'idle'
  if (step?.status === 'done' && item.status === 'complete') return 'complete'
  if (expected === 0n || baseline == null) return 'idle'

  const balance = await l2.getBalance({ address: item.owner as `0x${string}` }).catch(() => null)
  if (balance == null) return 'pending'

  const key = step?.key ?? 'arrive0'
  const arrived = balance - baseline >= (expected * 98n) / 100n
  if (arrived) {
    if (!step) appendStep(id, key, { label: 'Arrives on the Orbit chain', status: 'done', note: 'Credited to the recipient.' })
    else updateStep(id, key, { status: 'done', note: 'Credited to the recipient.' })
    finalizeFromSteps(id)
    return 'complete'
  }
  if (step) updateStep(id, key, { status: 'active', note: 'Retryable ticket submitted. Waiting for the sequencer to redeem it.' })
  return 'pending'
}

export function startOrbitTracking(id: string, l2: PublicClient, opts?: { maxMinutes?: number }) {
  const existing = running.get(id)
  if (existing) window.clearTimeout(existing)

  const deadline = Date.now() + (opts?.maxMinutes ?? 60) * 60_000
  let delay = 5000

  const tick = async () => {
    try {
      const state = await pollOrbitOnce(id, l2)
      if (state === 'complete' || state === 'failed' || state === 'idle') {
        running.delete(id)
        return
      }
    } catch {
      /* transient RPC error */
    }
    if (Date.now() > deadline) {
      running.delete(id)
      const item = getActivity(id)
      if (item) {
        const k = item.steps.find((s) => s.key.startsWith('arrive'))?.key ?? 'arrive0'
        updateStep(id, k, { note: 'Still not credited after 60 min. Re-open this transfer to keep checking.' })
      }
      return
    }
    delay = Math.min(delay * 1.25, 30_000)
    running.set(id, window.setTimeout(tick, delay))
  }

  running.set(id, window.setTimeout(tick, 2000))
}

/** Resume every unfinished Orbit deposit when the app loads. */
export function resumeOrbitTracking(clients: (id: number) => PublicClient | null | undefined) {
  for (const item of listActivity()) {
    if (item.provider !== 'orbit' || item.status === 'complete') continue
    if (item.meta?.orbitExpected == null) continue
    const to = clients(item.toChainId)
    if (!to) continue
    startOrbitTracking(item.id, to)
  }
}

export function forgetOrbitTracking(id: string) {
  const t = running.get(id)
  if (t) window.clearTimeout(t)
  running.delete(id)
}

export { updateActivity }
