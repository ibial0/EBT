import clsx from 'clsx'
import { Check, Clock, ExternalLink, Loader2, X } from 'lucide-react'
import type { TxStep } from '../lib/activity'
import { explorerTx } from '../config/chains'
import { shortAddr } from '../lib/format'

export function Timeline({ steps, compact = false }: { steps: TxStep[]; compact?: boolean }) {
  return (
    <ol className="relative space-y-0.5">
      {steps.map((s, i) => (
        <li key={s.key} className={clsx('relative flex gap-3', compact ? 'py-1' : 'py-2')}>
          <div className="relative flex flex-col items-center">
            <StepIcon status={s.status} compact={compact} />
            {i < steps.length - 1 && (
              <div className="mt-0.5 w-px flex-1 bg-white/10" style={{ minHeight: compact ? 8 : 14 }} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={clsx(
                  compact ? 'text-[11px] font-medium' : 'text-xs font-medium',
                  s.status === 'done' && 'text-t1',
                  s.status === 'active' && 'text-accent',
                  s.status === 'failed' && 'text-[#ffb4b4]',
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
            {!compact && s.note && <div className="mt-0.5 text-[11px] leading-relaxed text-t3">{s.note}</div>}
          </div>
        </li>
      ))}
    </ol>
  )
}

function StepIcon({ status, compact = false }: { status: TxStep['status']; compact?: boolean }) {
  const base = clsx('grid place-items-center rounded-full border', compact ? 'h-5 w-5' : 'h-6 w-6')
  const iconSize = compact ? 10 : 12
  if (status === 'done') return <div className={clsx(base, 'border-[#6adbb6]/40 bg-[#6adbb6]/12 text-[#6adbb6]')}><Check size={iconSize} /></div>
  if (status === 'active') return <div className={clsx(base, 'border-[#6adbb6]/50 bg-[#6adbb6]/10 text-[#6adbb6]')}><Loader2 size={iconSize} className="spin" /></div>
  if (status === 'failed') return <div className={clsx(base, 'border-[#ff8f8f]/40 bg-[#ff8f8f]/10 text-[#ffb4b4]')}><X size={iconSize} /></div>
  if (status === 'skipped') return <div className={clsx(base, 'border-line bg-ink-850 text-t3')}>–</div>
  return <div className={clsx(base, 'border-line bg-ink-850 text-t3')}><Clock size={compact ? 9 : 11} /></div>
}
