import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCircle2, XCircle } from 'lucide-react'
import { useActivity } from '../lib/activity'
import { pendingFrom, elapsed, labelFor, useFinishFlash, shortAmount } from '../lib/notifyCenter'
import { explorerTx, getChain } from '../config/chains'

export function NotificationBell() {
  const items = useActivity()
  const pending = pendingFrom(items)
  const [open, setOpen] = useState(false)
  const [flash] = useFinishFlash()

  return (
    <div className="relative flex items-center gap-2">
      {flash && (
        <div
          className={`enter flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] ${
            flash.tone === 'done'
              ? 'border-[#4cc38a]/35 bg-[#111a15] text-[#c7ebd8]'
              : 'border-[#e5484d]/35 bg-[#1b1113] text-[#ffb4b6]'
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
          <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#e5484d] px-1 text-[10px] font-medium leading-none text-white">
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
            {pending.map((p) => (
              <Link
                key={p.id}
                to={`/activity/${p.id}`}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-2 py-2 transition-colors hover:bg-ink-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] text-t1">
                    {shortAmount(p.amount)} {p.symbol}
                  </span>
                  <span className="mono text-[11px] text-t3">{elapsed(p.elapsedMs)}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-t2">{labelFor(p)}</div>
                <div className="mt-0.5 text-[11px] text-t3">{p.stage}</div>
                {p.hash && (
                  <a
                    href={explorerTx(p.fromChainId, p.hash)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mono mt-0.5 block text-[10px] text-t3 hover:text-t1"
                  >
                    {p.hash.slice(0, 14)}…
                  </a>
                )}
              </Link>
            ))}
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
      <span className="dot" style={{ background: '#e3c07b' }} />
      {pending.length} in flight
      {pending.slice(0, 2).map((p) => (
        <Link key={p.id} to={`/activity/${p.id}`} className="chip hover:text-t1">
          {shortAmount(p.amount)} {p.symbol} · {getChain(p.toChainId)?.short ?? ''}
        </Link>
      ))}
    </div>
  )
}
