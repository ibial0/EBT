/**
 * Across Protocol relayer fill tracker.
 * Polls the open-CORS Across Testnet indexer for deposit fill status and updates
 * local activity once the destination relayer transaction completes.
 */
import { fetchAcrossStatus } from './across'
import { finalizeFromSteps, getActivity, listActivity, updateStep, appendStep } from './activity'

const running = new Map<string, number>()

export function isAcrossTracking(id: string) {
  return running.has(id)
}

export async function pollAcrossOnce(id: string): Promise<'pending' | 'complete' | 'failed' | 'idle'> {
  const item = getActivity(id)
  if (!item || item.provider !== 'across') return 'idle'

  const depStep = item.steps.find((s) => s.key.startsWith('leg') && s.hash)
  if (!depStep?.hash) return 'idle'
  const originChainId = depStep.chainId ?? item.fromChainId

  const arriveKey = item.steps.find((s) => s.key.startsWith('arrive'))?.key ?? 'arrive0'
  const arrive = item.steps.find((s) => s.key === arriveKey)
  if (arrive?.status === 'done' && item.status === 'complete') return 'complete'

  const st = await fetchAcrossStatus(originChainId, depStep.hash)
  if (!arrive) {
    appendStep(id, arriveKey, {
      label: 'Relayer fill on destination',
      status: 'active',
      chainId: item.toChainId,
      note: 'Waiting for Across relayer.',
    })
  }

  if (st.state === 'filled') {
    updateStep(id, arriveKey, {
      status: 'done',
      hash: st.fillTx,
      chainId: item.toChainId,
      note: 'Filled by Across relayer.',
    })
    finalizeFromSteps(id)
    return 'complete'
  }
  if (st.state === 'expired') {
    updateStep(id, arriveKey, { status: 'failed', note: st.detail })
    finalizeFromSteps(id)
    return 'failed'
  }
  updateStep(id, arriveKey, { status: 'active', note: st.detail })
  return 'pending'
}

export function startAcrossTracking(id: string, opts?: { maxMinutes?: number; onDone?: (s: 'complete' | 'failed') => void }) {
  const existing = running.get(id)
  if (existing) window.clearTimeout(existing)

  const deadline = Date.now() + (opts?.maxMinutes ?? 20) * 60_000
  let delay = 3000

  const tick = async () => {
    try {
      const state = await pollAcrossOnce(id)
      if (state === 'complete' || state === 'failed' || state === 'idle') {
        running.delete(id)
        opts?.onDone?.(state === 'complete' ? 'complete' : 'failed')
        return
      }
    } catch {
      /* transient network error */
    }
    if (Date.now() > deadline) {
      running.delete(id)
      const item = getActivity(id)
      if (item) {
        const key = item.steps.find((s) => s.key.startsWith('arrive'))?.key ?? 'arrive0'
        updateStep(id, key, { note: 'Still awaiting fill after 20 min. Re-check status from Activity.' })
      }
      return
    }
    delay = Math.min(delay * 1.25, 20_000)
    running.set(id, window.setTimeout(tick, delay))
  }

  running.set(id, window.setTimeout(tick, 1500))
}

export function resumeAcrossTracking() {
  for (const item of listActivity()) {
    if (item.provider !== 'across' || item.status === 'complete' || item.status === 'cancelled') continue
    const depStep = item.steps.find((s) => s.key.startsWith('leg') && s.hash)
    if (depStep?.hash) startAcrossTracking(item.id)
  }
}
