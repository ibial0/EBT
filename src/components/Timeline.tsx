import clsx from 'clsx'
import { Check, Clock, ExternalLink, Loader2, X } from 'lucide-react'
import type { TxStep } from '../lib/activity'
import { explorerTx } from '../config/chains'
import { shortAddr } from '../lib/format'

export function Timeline({ steps }: { steps: TxStep[] }) {
  return (
    <ol className="relative space-y-0.5">
      {steps.map((s, i) => (
        <li key={s.key} className="relative flex gap-3 py-2">
          <div className="relative flex flex-col items-center">
            <StepIcon status={s.status} />
            {i < steps.length - 1 && <div className="mt-0.5 w-px flex-1 bg-white/10" style={{ minHeight: 14 }} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={clsx(
                  'text-xs font-medium',
                  s.status === 'done' && 'text-t1',
                  s.status === 'active' && 'text-accent',
                  s.status === 'failed' && 'text-[#ffb4b6]',
                  s.status === 'pending' && 'text-t3',
                  s.status === 'skipped' && 'text-t3 line-through',
                )}
              >
                {s.label}
              </span>
              {s.status === 'active' && <Loader2 size={11} className="spin text-accent" />}
              {s.hash && s.chainId != null && (
                <a
                  href={explorerTx(s.chainId, s.hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="mono inline-flex items-center gap-0.5 text-[10px] text-t3 hover:text-accent"
                >
                  {shortAddr(s.hash, 4)} <ExternalLink size={9} />
                </a>
              )}
            </div>
            {s.note && <div className="mt-0.5 text-[11px] leading-relaxed text-t3">{s.note}</div>}
          </div>
        </li>
      ))}
    </ol>
  )
}

function StepIcon({ status }: { status: TxStep['status'] }) {
  const base = 'grid h-6 w-6 place-items-center rounded-full border'
  if (status === 'done') return <div className={clsx(base, 'border-[#4cc38a]/40 bg-[#4cc38a]/12 text-[#4cc38a]')}><Check size={12} /></div>
  if (status === 'active') return <div className={clsx(base, 'border-[#4cc38a]/50 bg-[#4cc38a]/10 text-[#4cc38a]')}><Loader2 size={12} className="spin" /></div>
  if (status === 'failed') return <div className={clsx(base, 'border-[#e5484d]/40 bg-[#e5484d]/10 text-[#ffb4b6]')}><X size={12} /></div>
  if (status === 'skipped') return <div className={clsx(base, 'border-line bg-ink-850 text-t3')}>–</div>
  return <div className={clsx(base, 'border-line bg-ink-850 text-t3')}><Clock size={11} /></div>
}
