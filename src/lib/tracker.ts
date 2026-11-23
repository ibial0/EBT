/**
 * Attestation tracker — polls Circle Iris for CCTP burn transactions and keeps the
 * activity record in sync. Runs in the tab; state is persisted so a refresh resumes it.
 */
import { getChain } from '../config/chains'
import { fetchAttestation } from './cctp'
import { getActivity, listActivity, updateActivity, updateStep, finalizeFromSteps } from './activity'

const running = new Map<string, number>()

export function isTracking(id: string) {
  return running.has(id)
}

export async function pollOnce(id: string): Promise<'pending' | 'complete' | 'failed' | 'idle'> {
  const item = getActivity(id)
  if (!item || item.provider !== 'cctp') return 'idle'
  const from = getChain(item.fromChainId)
  const burn = item.steps.find((s) => s.key === 'burn')
  if (!from || from.cctpDomain == null || !burn?.hash) return 'idle'

  const att = await fetchAttestation(from.cctpDomain, burn.hash)
  if (att.state === 'complete') {
    updateStep(id, 'attestation', { status: 'done', note: 'Attestation signed by Circle.' })
    updateActivity(id, { meta: { ...(item.meta ?? {}), message: att.message, attestation: att.attestation } })
    finalizeFromSteps(id)
    return 'complete'
  }
  if (att.state === 'error') {
    updateStep(id, 'attestation', { note: att.detail })
    return 'failed'
  }
  updateStep(id, 'attestation', { status: 'active', note: att.detail })
  return 'pending'
}

/** Starts (or joins) a polling loop for one activity item. */
export function startTracking(id: string, opts?: { maxMinutes?: number; onDone?: (s: 'complete' | 'failed') => void }) {
  const existing = running.get(id)
  if (existing) window.clearTimeout(existing)

  const deadline = Date.now() + (opts?.maxMinutes ?? 40) * 60_000
  let delay = 6000

  const tick = async () => {
    try {
      const state = await pollOnce(id)
      if (state === 'complete' || state === 'failed' || state === 'idle') {
        running.delete(id)
        opts?.onDone?.(state === 'complete' ? 'complete' : 'failed')
        return
      }
    } catch {
      /* transient */
    }
    if (Date.now() > deadline) {
      running.delete(id)
      const item = getActivity(id)
      if (item) updateStep(id, 'attestation', { note: 'Still pending after 40 min. Re-open this transfer to keep checking.' })
      return
    }
    delay = Math.min(delay * 1.25, 30_000)
    running.set(id, window.setTimeout(tick, delay))
  }

  running.set(id, window.setTimeout(tick, 2500))
}

/** Resume tracking for every unfinished CCTP transfer (called once on app load). */
export function resumeTracking() {
  for (const item of listActivity()) {
    if (item.provider !== 'cctp' || item.status === 'complete') continue
    const att = item.steps.find((s) => s.key === 'attestation')
    const burn = item.steps.find((s) => s.key === 'burn')
    if (burn?.hash && att?.status !== 'done') startTracking(item.id)
  }
}
