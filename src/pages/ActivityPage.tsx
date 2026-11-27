import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, LifeBuoy, RefreshCw, Trash2 } from 'lucide-react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { getPublicClient, getWalletClient } from 'wagmi/actions'
import { explorerTx, getChain } from '../config/chains'
import { Badge, Button, Card, ChainLogo, Empty, notify, CopyButton } from '../components/ui'
import { PageHeader } from '../components/Layout'
import { RecoveryPanel } from '../components/RecoveryPanel'
import { ClaimableWithdrawals } from '../components/ClaimableWithdrawals'
import { syncOrbitConfirmations } from '../lib/orbitWatch'
import { Timeline } from '../components/Timeline'
import {
  clearActivity,
  finalizeFromSteps,
  getActivity,
  listActivity,
  removeActivity,
  updateActivity,
  cancelActivity,
  updateStep,
  useActivity,
} from '../lib/activity'
import { startTracking, pollOnce, isTracking } from '../lib/tracker'
import { startDepositTracking, pollDepositOnce, isDepositTracking } from '../lib/depositTrack'
import { startAcrossTracking, pollAcrossOnce, isAcrossTracking } from '../lib/acrossTrack'
import { submitReceiveMessage, isMessageUsed } from '../lib/bridgeExec'
import { decodeTxError } from '../lib/errors'
import { shortAddr, timeAgo } from '../lib/format'
import { etaFor, clock, duration } from '../lib/notifyCenter'
import { wagmiConfig, ensureWalletChain } from '../lib/wallet'
import { walletSender } from '../lib/tx'
import type { Address } from '../config/chains'

export default function ActivityPage() {
  useEffect(() => {
    void syncOrbitConfirmations()
  }, [])
  const { id } = useParams()
  const all = useActivity()
  const navigate = useNavigate()

  if (id) return <Detail id={id} />
  void navigate

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Local ledger"
        title="Activity"
        subtitle="Every transfer EBT has submitted from this browser. Stored in localStorage, survives refresh, never leaves the device."
        right={
          <div className="flex gap-2">
            <Link to="/recover">
              <Button variant="secondary" size="sm">
                <LifeBuoy size={13} /> Recover a transfer
              </Button>
            </Link>
            {all.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (confirm('Clear all local activity records?')) {
                    clearActivity()
                    notify('Activity history cleared.', 'info')
                  }
                }}
              >
                <Trash2 size={13} /> Clear history
              </Button>
            )}
          </div>
        }
      />

      <ClaimableWithdrawals />

      <RecoveryPanel compact />

      {all.length === 0 ? (
        <Card className="py-4">
          <Empty
            title="Nothing recorded yet"
            hint="Bridge USDC, swap on a testnet pool or deposit ETH into a Superchain testnet and it appears here with a live timeline."
          />
          <div className="flex justify-center gap-2 pb-8">
            <Link to="/bridge">
              <Button variant="primary">Open bridge</Button>
            </Link>
            <Link to="/swap">
              <Button variant="secondary">Open swap</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {all.map((a) => {
            const from = getChain(a.fromChainId)
            const to = getChain(a.toChainId)
            return (
              <Link key={a.id} to={`/activity/${a.id}`} className="block">
                <Card className="flex items-center gap-3 px-3 py-3">
                  {from && <ChainLogo chain={from} size={26} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-semibold text-t1">
                        {a.amountIn} {a.tokenIn.symbol}
                      </span>
                      {a.tokenOut && (
                        <>
                          <span className="text-t3">→</span>
                          <span className="text-t1">
                            {a.amountOut ? `${a.amountOut} ` : ''}
                            {a.tokenOut.symbol}
                          </span>
                        </>
                      )}
                      <span className="chip !py-0 !text-[9px]">{a.provider}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-t3">
                      {from?.short ?? a.fromChainId} → {to?.short ?? a.toChainId} · {timeAgo(a.createdAt)} · {shortAddr(a.owner, 3)}
                    </div>
                  </div>
                  <Badge tone={a.status === 'complete' ? 'mint' : a.status === 'failed' ? 'red' : 'amber'}>{a.status}</Badge>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Detail({ id }: { id: string }) {
  const { address } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const [busy, setBusy] = useState(false)
  const [, force] = useState(0)
  const navigate = useNavigate()
  const item = getActivity(id)

  useEffect(() => {
    const t = setInterval(() => force((v) => v + 1), 3000)
    return () => clearInterval(t)
  }, [])

  if (!item) {
    return (
      <div className="space-y-4">
        <Link to="/activity" className="inline-flex items-center gap-1 text-xs text-t2 hover:text-accent">
          <ArrowLeft size={13} /> back to activity
        </Link>
        <Card>
          <Empty title="Record not found" hint="It may have been cleared from local storage." />
        </Card>
      </div>
    )
  }

  const from = getChain(item.fromChainId)
  const to = getChain(item.toChainId)
  const msg = item.meta?.message as string | undefined
  const att = item.meta?.attestation as string | undefined
  const receiveStep = item.steps.find((s) => s.key === 'receive')
  const canReceive = Boolean(msg && att) && receiveStep?.status !== 'done'
  const depositStep = item.steps.find((s) => s.key === 'deposit')

  async function complete() {
    if (!address || !msg || !att) return
    setBusy(true)
    try {
      await ensureWalletChain(item!.toChainId)
      const client = getPublicClient(wagmiConfig, { chainId: item!.toChainId as never })!
      const wallet = await getWalletClient(wagmiConfig, { chainId: item!.toChainId as never })
      if (await isMessageUsed(client, msg as `0x${string}`)) {
        updateStep(id, 'receive', { status: 'done', note: 'Already minted.' })
        finalizeFromSteps(id)
        notify('Already minted on the destination.', 'success')
        return
      }
      updateStep(id, 'receive', { status: 'active' })
      const destChain = getChain(item!.toChainId)!
      const hash = await submitReceiveMessage({
        chain: destChain,
        account: address as Address,
        message: msg as `0x${string}`,
        attestation: att as `0x${string}`,
        wallet: walletSender(wallet),
        client,
      })
      updateStep(id, 'receive', { status: 'done', hash })
      finalizeFromSteps(id)
      notify('Minted on the destination chain.', 'success')
    } catch (e) {
      const d = decodeTxError(e, item!.toChainId)
      updateStep(id, 'receive', { status: 'failed', note: `${d.title}, ${d.detail}` })
      finalizeFromSteps(id)
      notify(`${d.title}: ${d.detail}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Link to="/activity" className="inline-flex items-center gap-1 text-xs text-t2 hover:text-accent">
        <ArrowLeft size={13} /> back to activity
      </Link>

      <PageHeader
        title={`${item.amountIn} ${item.tokenIn.symbol}${
          item.tokenOut ? ` → ${item.amountOut ? item.amountOut + ' ' : ''}${item.tokenOut.symbol}` : ''
        }`}
        subtitle={`${from?.name ?? item.fromChainId} → ${to?.name ?? item.toChainId} · ${new Date(item.createdAt).toLocaleString()} · ${item.provider}`}
        right={<Badge tone={item.status === 'complete' ? 'mint' : item.status === 'failed' ? 'red' : 'amber'}>{item.status}</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-t1">Timeline</h3>
            <div className="flex gap-1.5">
              {item.provider === 'cctp' && !isTracking(item.id) && item.status !== 'complete' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    startTracking(item.id)
                    notify('Resumed attestation polling.', 'info')
                  }}
                >
                  <RefreshCw size={12} /> Resume polling
                </Button>
              )}
              {item.provider === 'cctp' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    const s = await pollOnce(item.id)
                    notify(s === 'complete' ? 'Attestation complete.' : `Status: ${s}`, s === 'complete' ? 'success' : 'info')
                  }}
                >
                  Check now
                </Button>
              )}
              {item.provider === 'opstack' && depositStep?.status !== 'done' && item.status !== 'complete' && (
                <>
                  {!isDepositTracking(item.id) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const l1 = getPublicClient(wagmiConfig, { chainId: item.fromChainId as never })
                        const l2 = getPublicClient(wagmiConfig, { chainId: item.toChainId as never })
                        if (!l1 || !l2) return notify('No RPC for one of these chains.', 'error')
                        startDepositTracking(item.id, { l1, l2 })
                        notify('Checking the destination chain for the deposit.', 'info')
                      }}
                    >
                      <RefreshCw size={12} /> Resume check
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      const l1 = getPublicClient(wagmiConfig, { chainId: item.fromChainId as never })
                      const l2 = getPublicClient(wagmiConfig, { chainId: item.toChainId as never })
                      if (!l1 || !l2) return notify('No RPC for one of these chains.', 'error')
                      const s = await pollDepositOnce(item.id, l1, l2)
                      notify(
                        s === 'complete' ? 'Deposit included on the destination chain.' : s === 'idle' ? 'Nothing to check yet.' : 'Not included yet.',
                        s === 'complete' ? 'success' : 'info',
                      )
                    }}
                  >
                    Check now
                  </Button>
                </>
              )}
              {item.provider === 'across' && item.status !== 'complete' && (
                <>
                  {!isAcrossTracking(item.id) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        startAcrossTracking(item.id)
                        notify('Resumed Across relayer polling.', 'info')
                      }}
                    >
                      <RefreshCw size={12} /> Resume check
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      const s = await pollAcrossOnce(item.id)
                      notify(
                        s === 'complete' ? 'Across relayer fill complete.' : s === 'failed' ? 'Across deposit expired.' : 'Still awaiting relayer fill.',
                        s === 'complete' ? 'success' : 'info',
                      )
                    }}
                  >
                    Check now
                  </Button>
                </>
              )}
            </div>
          </div>
          <Timeline steps={item.steps} />

          {canReceive && (
            <Button full className="mt-4" loading={busy} onClick={complete}>
              Sign receiveMessage on {to?.short}
            </Button>
          )}
          {item.provider === 'cctp' && receiveStep?.status !== 'done' && !msg && (
            <p className="mt-3 text-[11px] leading-relaxed text-t3">
              CCTP is a two-signature flow: the burn happened on {from?.short}; once Circle signs the attestation you submit{' '}
              <span className="mono">receiveMessage</span> on {to?.short} to mint. Keep this page open or return later, the status is
              re-checked from Circle's API, not from a timer.
            </p>
          )}
          {item.provider === 'opstack' && depositStep?.status === 'done' && (
            <p className="mt-3 text-[11px] leading-relaxed text-t3">
              Deposit submitted on Sepolia. GIWA's sequencer includes it on L2 within ~1–3 minutes; the deposit transaction appears in the
              GIWA explorer for your address.
            </p>
          )}
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold text-t1">Details</h3>
            <DetailRow label="Owner" value={<span className="mono flex items-center gap-1">{shortAddr(item.owner, 5)} <CopyButton value={item.owner} /></span>} />
            <DetailRow label="Kind" value={item.kind} />
            <DetailRow label="Provider" value={item.provider} />
            <DetailRow label="Slippage / fee tier" value={item.meta?.feeTier ? `${Number(item.meta.feeTier) / 10000}%` : item.meta?.fast ? 'fast transfer' : '-'} />
            {item.meta?.maxFee && <DetailRow label="Max CCTP fee" value={`${item.meta.maxFee} (subunits)`} />}
            <DetailRow label="Updated" value={timeAgo(item.updatedAt)} />
            {item.status === 'pending' && (
              <>
                <DetailRow label="Running for" value={duration(Date.now() - item.createdAt)} />
                <DetailRow
                  label="Expected in"
                  value={
                    etaFor(item) - (Date.now() - item.createdAt) > 0
                      ? `~${clock(etaFor(item) - (Date.now() - item.createdAt))}`
                      : 'any moment now'
                  }
                />
              </>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold text-t1">Transactions</h3>
            {item.steps.filter((s) => s.hash).length === 0 && <div className="text-[11px] text-t3">No hashes recorded yet.</div>}
            <div className="space-y-1.5">
              {item.steps
                .filter((s) => s.hash)
                .map((s) => (
                  <a
                    key={s.key}
                    href={explorerTx(s.chainId ?? item.fromChainId, s.hash!)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-lg border border-line bg-ink-850 px-2.5 py-2 text-[11px] hover:border-accent/40"
                  >
                    <span className="text-t1">{s.label}</span>
                    <span className="mono flex items-center gap-1 text-t3">
                      {shortAddr(s.hash!, 5)} <ExternalLink size={10} />
                    </span>
                  </a>
                ))}
            </div>
          </Card>

          {(item.status === 'cancelled' || item.status === 'failed') && (
            <button
              onClick={() => navigate('/bridge')}
              className="mb-2 w-full rounded-[10px] border border-line-strong py-2 text-[11px] text-t1 hover:border-accent/40 hover:text-accent"
            >
              Sign again on the bridge
            </button>
          )}

          {item.status === 'pending' && (
            <button
              onClick={() => {
                cancelActivity(item.id)
                notify('Transfer marked cancelled', 'success')
              }}
              className="mb-2 w-full rounded-[10px] border border-line-strong py-2 text-[11px] text-t1 hover:border-neg/40 hover:text-neg"
            >
              Cancel this transfer
            </button>
          )}

          <button
            onClick={() => {
              cancelActivity(item.id)
              navigate('/activity', { replace: true })
              setTimeout(() => removeActivity(item.id), 0)
            }}
            className="w-full rounded-[10px] border border-neg/25 bg-neg/6 py-2 text-[11px] text-neg hover:bg-neg/10"
          >
            Remove local record
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-[11px]">
      <span className="text-t3">{label}</span>
      <span className="text-right text-t1">{value}</span>
    </div>
  )
}

export function useActivityCount() {
  return listActivity().length
}

export { updateActivity }
