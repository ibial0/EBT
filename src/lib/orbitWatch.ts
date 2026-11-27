/**
 * Keeps pending Orbit withdrawals in sync with the rollup's on-chain confirmation.
 *
 * The Bridge panel only advances while it is mounted on the exact pair, so a user who starts a
 * withdrawal and navigates away sees "Wait for … confirmation" forever even after the assertion
 * that includes the message is confirmed. This watcher reads the saved withdrawals, compares each
 * position with the rollup's confirmed send count, and advances the activity steps accordingly.
 */
import { listActivity, updateStep } from './activity'
import { loadWithdrawals, readWithdrawal } from './orbitWithdraw'
import { confirmedSize } from './orbitStatus'

let inflight = false

export async function syncOrbitConfirmations(): Promise<void> {
  if (inflight) return
  inflight = true
  try {
    const saved = loadWithdrawals().filter((w) => !w.claimedHash && w.activityId)
    if (saved.length === 0) return
    await Promise.all(
      saved.map(async (w) => {
        const size = await confirmedSize(w.fromId, w.toId)
        if (size == null) return
        const withdrawal = await readWithdrawal(w.fromId, w.txHash as `0x${string}`).catch(() => null)
        if (!withdrawal || size <= withdrawal.position) return
        const act = listActivity().find((a) => a.id === w.activityId)
        if (!act) return
        const confirm = act.steps.find((s) => s.key === 'confirm')
        if (confirm && confirm.status !== 'done') {
          updateStep(act.id, 'confirm', {
            status: 'done',
            note: `Included in L1 assertion · send #${withdrawal.position}`,
          })
        }
        const claim = act.steps.find((s) => s.key === 'claim')
        if (claim && claim.status !== 'done') {
          updateStep(act.id, 'claim', { status: 'active', note: 'Confirmed on L1. Ready to claim.' })
        }
      }),
    )
  } finally {
    inflight = false
  }
}
