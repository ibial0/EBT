/**
 * One claim path shared by the bridge card, the activity list, the bell and the recovery tab.
 * Everything it needs is already saved locally when the withdrawal was started.
 */
import { finalizeFromSteps, updateStep, type ActivityItem } from './activity'
import {
  claimWithdrawal,
  findOutboxProof,
  loadWithdrawals,
  markWithdrawalClaimed,
  readWithdrawal,
} from './orbitWithdraw'

export function isOrbitClaimable(item: ActivityItem): boolean {
  if (item.provider !== 'orbit') return false
  const confirm = item.steps.find((s) => s.key === 'confirm')
  const claim = item.steps.find((s) => s.key === 'claim')
  return confirm?.status === 'done' && claim?.status !== 'done'
}

export async function claimOrbitActivity(item: ActivityItem): Promise<`0x${string}`> {
  const saved = loadWithdrawals().find((w) => w.activityId === item.id)
  if (!saved) throw new Error('This withdrawal was started in another browser, so its proof is not saved here.')
  const withdrawal = await readWithdrawal(saved.fromId, saved.txHash)
  const built = await findOutboxProof(saved.fromId, saved.toId, withdrawal)
  const hash = await claimWithdrawal(saved.fromId, saved.toId, withdrawal, built.proof)
  markWithdrawalClaimed(saved.txHash, hash)
  updateStep(item.id, 'confirm', { status: 'done' })
  updateStep(item.id, 'claim', { status: 'active', hash })
  updateStep(item.id, 'claim', { status: 'done', hash })
  finalizeFromSteps(item.id)
  return hash
}
