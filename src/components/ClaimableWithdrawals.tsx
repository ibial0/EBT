import { useEffect, useState } from 'react'
import { ArrowUpRight, Check, Loader2 } from 'lucide-react'
import { getChain } from '../config/chains'
import { ChainLogo, notify } from './ui'
import { finalizeFromSteps, updateStep } from '../lib/activity'
import {
  claimWithdrawal,
  confirmedSends,
  findOutboxProof,
  loadWithdrawals,
  markWithdrawalClaimed,
  readWithdrawal,
  type SavedWithdrawal,
  type Withdrawal,
} from '../lib/orbitWithdraw'
import { shortAddr } from '../lib/format'

type Row = {
  msg: string
  ready: boolean
  proof?: `0x${string}`[]
  w?: Withdrawal
}

/**
 * Canonical withdrawals started from the bridge: they finish on the parent chain once the rollup
 * has confirmed the message, so the claim lives here instead of on the bridge screen.
 */
export function ClaimableWithdrawals() {
  const [saved, setSaved] = useState<SavedWithdrawal[]>(() => loadWithdrawals().filter((s) => !s.claimedHash))
  const [rows, setRows] = useState<Record<string, Row>>({})
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const scan = async () => {
      for (const s of saved) {
        const w = await readWithdrawal(s.fromId, s.txHash).catch(() => null)
        if (!alive) return
        if (!w) continue
        const p = await confirmedSends(s.fromId, s.toId).catch(() => null)
        if (!alive) return
        if (!p || p.size <= w.position) {
          setRows((v) => ({ ...v, [s.txHash]: { msg: `waiting · confirmed #${p?.size ?? 0n} of #${w.position + 1n}`, ready: false, w } }))
          continue
        }
        try {
          const built = await findOutboxProof(s.fromId, s.toId, w)
          if (alive) setRows((v) => ({ ...v, [s.txHash]: { msg: 'ready to claim', ready: true, proof: built.proof, w } }))
        } catch {
          if (alive) setRows((v) => ({ ...v, [s.txHash]: { msg: 'rollup confirmed, waiting for the outbox', ready: false, w } }))
        }
      }
    }
    void scan()
    const t = setInterval(() => void scan(), 30000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [saved])

  async function claim(s: SavedWithdrawal) {
    const st = rows[s.txHash]
    if (!st?.proof || !st.w) return
    setBusy(s.txHash)
    try {
      const hash = await claimWithdrawal(s.fromId, s.toId, st.w, st.proof)
      markWithdrawalClaimed(s.txHash, hash)
      if (s.activityId) {
        updateStep(s.activityId, 'confirm', { status: 'done' })
        updateStep(s.activityId, 'claim', { status: 'done', hash })
        finalizeFromSteps(s.activityId)
      }
      notify('Claimed on the parent chain.', 'success')
      setSaved(loadWithdrawals().filter((x) => !x.claimedHash))
    } catch (e) {
      notify(((e as Error).message ?? 'Claim failed').slice(0, 140), 'error')
    } finally {
      setBusy(null)
    }
  }

  if (!saved.length) return null

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-t1">Withdrawals to claim</p>
        <span className="text-[11px] text-t3">{saved.length}</span>
      </div>
      <div className="space-y-1.5">
        {saved.map((s) => {
          const from = getChain(s.fromId)
          const to = getChain(s.toId)
          const st = rows[s.txHash]
          return (
            <div key={s.txHash} className="flex items-center gap-3 rounded-xl border border-line bg-ink-850 px-3 py-2.5">
              {from ? <ChainLogo chain={from} size={22} /> : null}
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium text-t1">
                  {s.amount} ETH · {from?.short ?? s.fromId} → {to?.short ?? s.toId}
                </p>
                <p className="mono truncate text-[11px] text-t3">
                  {st?.msg ?? 'checking…'} · {shortAddr(s.txHash, 6)}
                </p>
              </div>
              {st?.ready ? (
                <button
                  onClick={() => void claim(s)}
                  disabled={busy === s.txHash}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-[12px] font-semibold text-[#111628] disabled:opacity-50"
                >
                  {busy === s.txHash ? <Loader2 size={13} className="animate-spin" /> : <ArrowUpRight size={13} />}
                  Claim
                </button>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-t3">
                  <Check size={12} className="opacity-40" /> pending
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
