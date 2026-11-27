/**
 * Keeps pending Orbit withdrawals in sync with the rollup's on-chain confirmation.
 *
 * The Bridge panel only advances while it is mounted on the exact pair, so a user who starts a
 * withdrawal and navigates away sees "Wait for … confirmation" forever even after the assertion
 * that includes the message is confirmed. This watcher reads the saved withdrawals, compares each
 * position with the rollup's confirmed send count, and advances the activity steps accordingly.
 */
import { listActivity, updateStep } from './activity'
import { confirmedSends, loadWithdrawals, readWithdrawal } from './orbitWithdraw'

let inflight = false

export async function syncOrbitConfirmations(): Promise<void> {
  if (inflight) return
  inflight = true
  try {
    const saved = loadWithdrawals().filter((w) => !w.claimedHash && w.activityId)
    if (saved.length === 0) return
    const sizes = new Map<string, bigint | null>()
    for (const w of saved) {
      const key = `${w.fromId}:${w.toId}`
      if (!sizes.has(key)) {
        const progress = await confirmedSends(w.fromId, w.toId).catch(() => null)
        sizes.set(key, progress ? progress.size : null)
      }
      const size = sizes.get(key)
      if (size == null) continue
      const withdrawal = await readWithdrawal(w.fromId, w.txHash as `0x${string}`).catch(() => null)
      if (!withdrawal) continue
      if (size <= withdrawal.position) continue
      const act = listActivity().find((a) => a.id === w.activityId)
      if (!act) continue
      const confirm = act.steps.find((s) => s.key === 'confirm')
      if (confirm && confirm.status !== 'done') {
        updateStep(act.id, 'confirm', {
          status: 'done',
          note: `Included in L1 assertion · send #${withdrawal.position}`,
        })
      }
      const claim = act.steps.find((s) => s.key === 'claim')
      if (claim && claim.status === 'pending') {
        updateStep(act.id, 'claim', { status: 'active', note: 'Confirmed on L1. Ready to claim.' })
      }
    }
  } finally {
    inflight = false
  }
}
