import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCircle2, XCircle } from 'lucide-react'
import { useActivity } from '../lib/activity'
import { pendingFrom, useFinishFlash, clock, shortAmount, elapsed, labelFor } from '../lib/notifyCenter'
import { getChain } from '../config/chains'
import { ChainLogo, notify } from './ui'
import { claimOrbitActivity, isOrbitClaimable } from '../lib/claim'

export function NotificationBell() {
  const items = useActivity()
  const pending = pendingFrom(items)
  const [open, setOpen] = useState(false)
  const [flash] = useFinishFlash()
  const [, tick] = useState(0)
  const [claimBusy, setClaimBusy] = useState<string | null>(null)

  // the countdown has to move on its own, once a second, while anything is in flight
  useEffect(() => {
    if (pending.length === 0) return
    const t = setInterval(() => tick((v) => v + 1), 1000)
    return () => clearInterval(t)
  }, [pending.length])

  const doClaim = async (id: string) => {
    const item = items.find((i) => i.id === id)
    if (!item) return
    setClaimBusy(id)
    try {
      const hash = await claimOrbitActivity(item)
      notify(`Claimed · ${hash.slice(0, 10)}…`, 'success')
    } catch (e) {
      notify(e instanceof Error ? e.message.slice(0, 120) : 'Claim failed.', 'error')
    } finally {
      setClaimBusy(null)
    }
  }

  return (
    <div className="relative flex items-center gap-2">
      {flash && (
        <div
          className={`enter flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] ${
            flash.tone === 'done'
              ? 'border-[#6adbb6]/35 bg-[#111a15] text-[#c7ebd8]'
              : 'border-[#ff8f8f]/35 bg-[#1b1113] text-[#ffb4b4]'
          }`}
        >
          {flash.tone === 'done' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
          <span className="font-medium">{flash.title}</span>
          <span className="opacity-80">{flash.detail}</span>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink-800 text-t2 transition-colors hover:border-line-strong hover:text-t1"
        aria-label={pending.length ? `${pending.length} pending transactions` : 'No pending transactions'}
      >
        <Bell size={16} strokeWidth={1.6} />
        {pending.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#ff8f8f] px-1 text-[10px] font-medium leading-none text-t1">
            {pending.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="enter absolute right-0 top-[calc(100%+8px)] z-[70] w-[340px] rounded-xl border border-line bg-ink-800 p-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[13px] text-t1">Pending</span>
              <span className="mono text-[11px] text-t3">{pending.length}</span>
            </div>
            <div className="hairline mb-1" />
            {pending.length === 0 && <div className="px-2 py-6 text-center text-[12px] text-t3">Nothing in flight</div>}
            {pending.map((p) => {
              const item = items.find((i) => i.id === p.id)
              const steps = item?.steps ?? []
              const done = steps.filter((st) => st.status === 'done' || st.status === 'skipped').length
              const active = steps.some((st) => st.status === 'active')
              const pct = steps.length ? Math.round(((done + (active ? 0.5 : 0)) / steps.length) * 100) : 0
              const claimable = item ? isOrbitClaimable(item) : false
              const fromC = getChain(p.fromChainId)
              const toC = getChain(p.toChainId)
              return (
                <Link
                  key={p.id}
                  to={`/activity/${p.id}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2 py-2 transition-colors hover:bg-ink-700"
                >
                  <div className="flex items-center gap-2.5">
                    {fromC && <ChainLogo chain={fromC} size={18} />}
                    <div className="relative h-px flex-1 bg-line-strong">
                      <span
                        className="absolute top-1/2 size-1 -translate-y-1/2 rounded-full bg-accent"
                        style={{ animation: 'flow 1.8s linear infinite' }}
                      />
                    </div>
                    {toC && <ChainLogo chain={toC} size={18} />}
                    {claimable ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          void doClaim(p.id)
                        }}
                        disabled={claimBusy === p.id}
                        className="h-6 shrink-0 rounded-md bg-accent px-2 text-[10.5px] font-semibold text-[#111628] disabled:opacity-60"
                      >
                        {claimBusy === p.id ? '…' : 'Claim'}
                      </button>
                    ) : (
                      <span className="mono w-8 shrink-0 text-right text-[12px] font-semibold text-t1">{pct}%</span>
                    )}
                  </div>
                  <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] items-center text-[10px] text-t3">
                    <span />
                    <span className="truncate text-center">
                      {fromC?.short ?? p.fromChainId} → {toC?.short ?? p.toChainId}
                    </span>
                    <span className="mono justify-self-end">{p.remainingMs > 0 ? `~${clock(p.remainingMs)}` : 'soon'}</span>
                  </div>
                </Link>
              )
            })}
            <div className="hairline my-1" />
            <Link
              to="/activity"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-2 py-2 text-[12px] text-t2 transition-colors hover:bg-ink-700 hover:text-t1"
            >
              Open activity
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

export function PendingSummary() {
  const items = useActivity()
  const pending = pendingFrom(items)
  if (pending.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px] text-t2">
      <span className="dot" style={{ background: '#e6c17a' }} />
      {pending.length} in flight
      {pending.slice(0, 2).map((p) => (
        <Link key={p.id} to={`/activity/${p.id}`} className="chip hover:text-t1">
          {shortAmount(p.amount)} {p.symbol} · {getChain(p.toChainId)?.short ?? ''}
        </Link>
      ))}
    </div>
  )
}
