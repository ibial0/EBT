import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Clock, Loader2 } from 'lucide-react'
import { formatUnits, parseUnits } from 'viem'
import { useAccount, useBalance } from 'wagmi'
import { getChain } from '../config/chains'
import { orbitBridgeFor } from '../config/orbit'
import { ChainLogo, notify } from './ui'
import { addActivity, finalizeFromSteps, updateStep } from '../lib/activity'
import {
  claimWithdrawal,
  confirmedSends,
  findOutboxProof,
  initiateWithdrawEth,
  readWithdrawal,
  type RollupProgress,
  type Withdrawal,
} from '../lib/orbitWithdraw'
import { shortAddr } from '../lib/format'

const STORE = 'ebt.withdrawals.v1'

interface Saved {
  txHash: `0x${string}`
  fromId: number
  toId: number
  amount: string
  createdAt: number
  claimedHash?: string
  /** the local activity record this withdrawal writes to, so a resumed claim still closes it */
  activityId?: string
}

function loadSaved(): Saved[] {
  try {
    const raw = localStorage.getItem(STORE)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(arr) ? (arr as Saved[]) : []
  } catch {
    return []
  }
}

function save(list: Saved[]) {
  try {
    localStorage.setItem(STORE, JSON.stringify(list.slice(0, 20)))
  } catch {
    /* storage full or blocked */
  }
}

type Phase = 'idle' | 'initiating' | 'waiting' | 'ready' | 'claiming' | 'done'

/**
 * In-app canonical withdrawal for an Arbitrum Orbit chain -> its parent chain.
 *
 * Three real steps, each signed by the user: withdraw on L2, wait for the L1 confirmation
 * of that assertion, then claim with the proof the L2 node builds. Nothing is simulated:
 * the amount, the hashes and the block counts all come from the chain.
 */
export function OrbitWithdrawPanel({ fromId, toId }: { fromId: number; toId: number }) {
  const cfg = orbitBridgeFor(fromId)
  const parentOk = cfg?.parentChainId === toId
  const { address } = useAccount()
  const { data: bal } = useBalance({ address, chainId: fromId as never })
  const [amount, setAmount] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [withdrawal, setWithdrawal] = useState<Withdrawal | null>(null)
  const [progress, setProgress] = useState<RollupProgress | null>(null)
  const [proof, setProof] = useState<`0x${string}`[] | null>(null)
  const [claimed, setClaimed] = useState<string | null>(null)
  const [activityId, setActivityId] = useState<string | null>(null)
  const from = useMemo(() => getChain(fromId), [fromId])
  const to = useMemo(() => getChain(toId), [toId])

  const parsed = (() => {
    try {
      return amount ? parseUnits(amount, 18) : 0n
    } catch {
      return 0n
    }
  })()
  const over = bal ? parsed > bal.value : false
  const canStart = Boolean(address && parsed > 0n && !over && phase === 'idle')

  // resume an unclaimed withdrawal for this pair
  useEffect(() => {
    const pending = loadSaved().find((s) => s.fromId === fromId && s.toId === toId && !s.claimedHash)
    if (!pending) return
    setPhase('waiting')
    if (pending.activityId) setActivityId(pending.activityId)
    void readWithdrawal(fromId, pending.txHash)
      .then((w) => {
        setWithdrawal(w)
        setAmount(pending.amount)
      })
      .catch(() => setPhase('idle'))
  }, [fromId, toId])

  // poll the L1 confirmation and try to build the proof
  useEffect(() => {
    if (!withdrawal || phase === 'done' || phase === 'claiming') return
    let alive = true
    const tick = async () => {
      const p = await confirmedSends(fromId, toId).catch(() => null)
      if (!alive) return
      setProgress(p)
      if (p && p.size > withdrawal.position) {
        try {
          const built = await findOutboxProof(fromId, toId, withdrawal)
          if (alive) {
            setProof(built.proof)
            setPhase('ready')
          }
        } catch {
          if (alive) setPhase('waiting')
        }
      }
    }
    void tick()
    const t = setInterval(() => void tick(), 20000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [withdrawal, phase, fromId, toId])

  const start = useCallback(async () => {
    if (!canStart) return
    setPhase('initiating')
    const act = addActivity({
      kind: 'bridge',
      provider: 'orbit',
      fromChainId: fromId,
      toChainId: toId,
      owner: address ?? '',
      tokenIn: { symbol: to?.viem.nativeCurrency.symbol ?? 'ETH', decimals: 18 },
      amountIn: amount,
      status: 'pending',
      steps: [
        { key: 'withdraw', label: 'Withdraw on L2', status: 'active', chainId: fromId },
        { key: 'confirm', label: 'Wait for L1 confirmation', status: 'pending', chainId: toId },
        { key: 'claim', label: 'Claim on L1', status: 'pending', chainId: toId },
      ],
      meta: { canonical: 'orbit-outbox' },
    })
    setActivityId(act.id)
    try {
      const hash = await initiateWithdrawEth(fromId, parsed)
      updateStep(act.id, 'withdraw', { status: 'done', hash })
      notify(`Withdrawal started · ${shortAddr(hash, 6)}`, 'success')
      const list = loadSaved().filter((s) => s.txHash !== hash)
      list.unshift({ txHash: hash, fromId, toId, amount, createdAt: Date.now(), activityId: act.id })
      save(list)
      const w = await readWithdrawal(fromId, hash)
      setWithdrawal(w)
      setPhase('waiting')
      updateStep(act.id, 'confirm', { status: 'active' })
    } catch (e) {
      updateStep(act.id, 'withdraw', { status: 'failed', note: (e as Error).message.slice(0, 120) })
      finalizeFromSteps(act.id)
      notify((e as Error).message.slice(0, 140), 'error')
      setPhase('idle')
    }
  }, [canStart, address, amount, fromId, toId, parsed, to])

  const claim = useCallback(async () => {
    if (!withdrawal || !proof) return
    setPhase('claiming')
    try {
      const hash = await claimWithdrawal(fromId, toId, withdrawal, proof)
      updateStep(activityId ?? '', 'confirm', { status: 'done' })
      updateStep(activityId ?? '', 'claim', { status: 'done', hash })
      if (activityId) finalizeFromSteps(activityId)
      notify(`Claimed ${amount} on ${to?.short ?? 'L1'} · ${shortAddr(hash, 6)}`, 'success')
      setClaimed(hash)
      setPhase('done')
      const list = loadSaved().map((s) => (s.txHash === withdrawal.txHash ? { ...s, claimedHash: hash } : s))
      save(list)
    } catch (e) {
      updateStep(activityId ?? '', 'claim', { status: 'failed', note: (e as Error).message.slice(0, 120) })
      if (activityId) finalizeFromSteps(activityId)
      notify((e as Error).message.slice(0, 140), 'error')
      setPhase('ready')
    }
  }, [withdrawal, proof, fromId, toId, activityId, amount, to])

  if (!cfg || !parentOk || !from || !to) return null

  const steps = [
    { label: `${from.short} → withdraw`, done: Boolean(withdrawal), active: phase === 'initiating' },
    {
      label: 'L1 confirmation',
      done: proof != null || phase === 'ready' || phase === 'claiming' || phase === 'done',
      active: phase === 'waiting',
    },
    { label: `Claim on ${to.short}`, done: phase === 'done', active: phase === 'claiming' },
  ]

  return (
    <div className="mt-3 rounded-xl border border-accent/30 bg-accent/6 p-3.5">
      <div className="flex items-center gap-2">
        <ChainLogo chain={from} size={18} />
        <ArrowRight size={12} className="text-t3" />
        <ChainLogo chain={to} size={18} />
        <span className="ml-1 text-[12.5px] font-semibold text-t1">Canonical withdrawal</span>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-t2">
        {from.short} settles to {to.short}. Value leaves in three signed steps — withdraw, wait until the rollup has
        confirmed an assertion that includes your message, then claim with the proof. On this testnet that has been
        taking tens of minutes; the counter below is the chain's own confirmed send count, not an estimate. You can
        close this page and come back — the withdrawal is kept in this browser.
      </p>

      {phase === 'idle' && (
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder={`Amount in ${to.viem.nativeCurrency.symbol}`}
              inputMode="decimal"
              className="input mono h-10 w-full rounded-lg border border-line-strong bg-ink-900 px-3 pr-14 text-[13px] placeholder:text-t3"
            />
            <button
              onClick={() => bal && setAmount(formatUnits(bal.value, 18))}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-ink-700 px-2 py-0.5 text-[10px] font-semibold text-t1"
            >
              MAX
            </button>
          </div>
          <button
            disabled={!canStart}
            onClick={() => void start()}
            className="h-10 shrink-0 rounded-lg bg-accent px-3.5 text-[12px] font-semibold text-[#111628] disabled:opacity-40"
          >
            Withdraw
          </button>
        </div>
      )}

      {phase !== 'idle' && (
        <div className="mt-3 space-y-2">
          {steps.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-[11.5px]">
              {s.done ? (
                <Check size={13} className="text-pos" />
              ) : s.active ? (
                <Loader2 size={13} className="animate-spin text-accent" />
              ) : (
                <Clock size={13} className="text-t3" />
              )}
              <span className={s.done ? 'text-t1' : s.active ? 'text-accent' : 'text-t3'}>{s.label}</span>
              {s.active && phase === 'waiting' && (
                <span className="mono ml-auto text-[10.5px] text-t3">
                  {progress
                    ? `confirmed #${progress.size}/${withdrawal ? withdrawal.position + 1n : 0n}`
                    : 'reading rollup…'}
                </span>
              )}
            </div>
          ))}

          {withdrawal && (
            <p className="mono text-[10px] text-t3">
              position {withdrawal.position.toString()} · {shortAddr(withdrawal.txHash, 6)}
            </p>
          )}

          {phase === 'ready' && (
            <button
              onClick={() => void claim()}
              className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent text-[12.5px] font-semibold text-[#111628]"
            >
              Claim {amount} on {to.short}
            </button>
          )}
          {phase === 'claiming' && (
            <p className="flex items-center gap-2 text-[11.5px] text-accent">
              <Loader2 size={13} className="animate-spin" /> Waiting for your wallet…
            </p>
          )}
          {phase === 'done' && claimed && (
            <p className="text-[11.5px] text-pos">
              Claimed · {shortAddr(claimed, 6)} — the value is on {to.short}.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
