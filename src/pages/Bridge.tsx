import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowDownUp, Check, ChevronDown, Info, Route as RouteIcon, UserRoundPlus, Wallet, X } from 'lucide-react'
import { formatUnits } from 'viem'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { getPublicClient, getWalletClient } from 'wagmi/actions'
import { CHAINS, getChain, type Address } from '../config/chains'
import { nativeToken, tokensForChain, type TokenCfg } from '../config/tokens'
import { Card, Button, Badge, Row, notify, ChainLogo, TokenIcon, Spinner } from '../components/ui'
import { ChainChip, ChainSelect } from '../components/ChainSelect'
import { ConnectButton } from '../components/Layout'
import { Timeline } from '../components/Timeline'
import { addActivity, updateStep, updateActivity, finalizeFromSteps, getActivity, useActivity, cancelActivity, type ActivityItem } from '../lib/activity'
import { fetchCctpFees, maxFeeFor } from '../lib/cctp'
import { quoteBest, applySlippage, erc20Abi } from '../lib/uniswap'
import { executeCctpBridge, executeOpDeposit } from '../lib/bridgeExec'
import { executeSwap } from '../lib/swapExec'
import { startTracking } from '../lib/tracker'
import { startDepositTracking } from '../lib/depositTrack'
import { startOrbitTracking } from '../lib/orbitTrack'
import { ORBIT_ETH_NATIVE, orbitBridgeFor } from '../config/orbit'
import { fmt, safeParseUnits } from '../lib/format'
import { checkGas, walletSender } from '../lib/tx'
import { decodeTxError } from '../lib/errors'
import { wagmiConfig } from '../lib/wallet'
import { findRoutes, noRouteReason, reachableDestTokens, usableSourceTokens, type RouteCandidate, type RouteLeg } from '../lib/routes'
import { TokenPicker } from '../components/TokenPicker'

const NATIVE = '0x0000000000000000000000000000000000000000'
const keyOf = (chainId: number, address: string) => `${chainId}:${address.toLowerCase()}`

function symbolOn(chainId: number, address: string): TokenCfg {
  return (
    tokensForChain(chainId).find((t) => t.address.toLowerCase() === address.toLowerCase()) ?? {
      chainId,
      address: address as Address,
      symbol: address.toLowerCase() === NATIVE ? (getChain(chainId)?.viem.nativeCurrency.symbol ?? 'ETH') : '?',
      name: '',
      decimals: 18,
      kind: 'token',
      color: '#475569',
      verified: false,
    }
  )
}

function legLabel(index: number, leg: RouteLeg): string {
  if (leg.kind === 'swap') {
    const a = symbolOn(leg.chainId, leg.tokenIn)
    const b = symbolOn(leg.chainId, leg.tokenOut)
    return `Swap ${a.symbol} → ${b.symbol} on ${getChain(leg.chainId)?.short}`
  }
  if (leg.kind === 'cctp') return `Bridge USDC ${getChain(leg.from)?.short} → ${getChain(leg.to)?.short}`
  return `Bridge ETH ${getChain(leg.from)?.short} → ${getChain(leg.to)?.short}`
}

/** Visual route: source -> protocol -> destination, with real icons. */
function RoutePath({
  fromId,
  toId,
  source,
  dest,
  kind,
}: {
  fromId: number
  toId: number
  source?: TokenCfg | null
  dest?: TokenCfg | null
  kind?: string
}) {
  const fromChain = getChain(fromId)
  const toChain = getChain(toId)
  const label = kind === 'cctp' ? 'CCTP' : kind === 'portal' ? 'OP portal' : kind === 'arbitrum' ? 'Arbitrum' : 'route'

  return (
    <div className="grid grid-cols-[auto_minmax(40px,1fr)_auto] items-center gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {fromChain ? <ChainLogo chain={fromChain} size={36} /> : null}
        <div className="min-w-0">
          <div className="display truncate text-[16px] leading-6 text-t1">{source?.symbol ?? '—'}</div>
          <div className="truncate text-[10px] leading-4 text-t2">{fromChain?.short}</div>
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        <span className="absolute inset-x-0 top-1/2 -z-0 h-px -translate-y-1/2 bg-line-strong" />
        <span className="relative z-10 whitespace-nowrap rounded-full border border-line-strong bg-ink-900 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-t2">
          {label}
        </span>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2.5">
        <div className="min-w-0 text-right">
          <div className="display truncate text-[16px] leading-6 text-t1">{dest?.symbol ?? '—'}</div>
          <div className="truncate text-[10px] leading-4 text-t2">{toChain?.short}</div>
        </div>
        {toChain ? <ChainLogo chain={toChain} size={36} /> : null}
      </div>
    </div>
  )
}

export default function Bridge() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()

  const [fromId, setFromId] = useState(11155111)
  const [toId, setToId] = useState(84532)
  const [sourceId, setSourceId] = useState(keyOf(11155111, NATIVE))
  const [destId, setDestId] = useState(keyOf(84532, NATIVE))
  const [amount, setAmount] = useState('')
  const [fast, setFast] = useState(true)
  /** tolerance applied to every swap leg of a composite route */
  const [slippageBps, setSlippageBps] = useState(100)
  const [recipient, setRecipient] = useState('')
  /** off by default: the destination is your own wallet unless you ask otherwise */
  const [editRecipient, setEditRecipient] = useState(false)
  const [amountFocused, setAmountFocused] = useState(false)
  /** your own wallet unless the alternate-recipient field is open and filled */
  const effectiveRecipient = editRecipient ? recipient.trim() : (address ?? '')
  const [pick, setPick] = useState<'from' | 'to' | 'source' | 'dest' | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | undefined>()

  const from = getChain(fromId)!
  const to = getChain(toId)!

  /** Every source asset that can actually reach the destination, directly or through a swap. */
  const reachableSources = useMemo(() => usableSourceTokens(fromId, toId), [fromId, toId])
  /**
   * Every asset on the source chain, not only the ones that can move right now. A chain
   * that only receives deposits still has a balance worth showing, and hiding the asset
   * made it look like the app had lost it.
   */
  const sourceOptions = useMemo(() => {
    const all = [nativeToken(fromId), ...tokensForChain(fromId)]
    const ok = new Set(reachableSources.map((t) => t.address.toLowerCase()))
    return [...all].sort((a, b) => Number(ok.has(b.address.toLowerCase())) - Number(ok.has(a.address.toLowerCase())))
  }, [fromId, reachableSources])
  const sourceNotes = useMemo(() => {
    const ok = new Set(reachableSources.map((t) => t.address.toLowerCase()))
    const out: Record<string, string> = {}
    for (const t of sourceOptions) {
      if (!ok.has(t.address.toLowerCase())) out[t.address.toLowerCase()] = noRouteReason(fromId, toId, t)
    }
    return out
  }, [sourceOptions, reachableSources, fromId, toId])
  const source = useMemo(
    () =>
      sourceOptions.find((t) => keyOf(fromId, t.address) === sourceId) ??
      reachableSources[0] ??
      nativeToken(fromId),
    [sourceOptions, sourceId, fromId],
  )

  /** Destination assets reachable from the selected source asset. */
  const reachableDests = useMemo(() => (source ? reachableDestTokens(fromId, toId, source) : []), [fromId, toId, source])
  const destOptions = useMemo(() => {
    const all = [nativeToken(toId), ...tokensForChain(toId)]
    const ok = new Set(reachableDests.map((t) => t.address.toLowerCase()))
    return [...all].sort((a, b) => Number(ok.has(b.address.toLowerCase())) - Number(ok.has(a.address.toLowerCase())))
  }, [toId, reachableDests])
  const destNotes = useMemo(() => {
    const ok = new Set(reachableDests.map((t) => t.address.toLowerCase()))
    const out: Record<string, string> = {}
    for (const t of destOptions) {
      if (!ok.has(t.address.toLowerCase())) {
        out[t.address.toLowerCase()] = `${t.symbol} cannot be delivered to ${getChain(toId)?.short}. ${noRouteReason(fromId, toId, t)}`
      }
    }
    return out
  }, [destOptions, reachableDests, fromId, toId])
  const dest = useMemo(
    () => destOptions.find((t) => keyOf(toId, t.address) === destId) ?? reachableDests[0] ?? nativeToken(toId),
    [destOptions, destId, toId],
  )

  const routes = useMemo(() => (source && dest ? findRoutes(fromId, toId, source, dest) : []), [fromId, toId, source, dest])
  const route: RouteCandidate | null = routes[0] ?? null

  // a chain change invalidates selections that no longer have a route
  useEffect(() => {
    if (source && !sourceOptions.some((t) => t.address.toLowerCase() === source.address.toLowerCase())) {
      const first = reachableSources[0] ?? sourceOptions[0]
      if (first) setSourceId(keyOf(fromId, first.address))
    }
  }, [fromId, sourceOptions, source])

  useEffect(() => {
    if (dest && !destOptions.some((t) => t.address.toLowerCase() === dest.address.toLowerCase())) {
      const first = reachableDests[0] ?? destOptions[0]
      if (first) setDestId(keyOf(toId, first.address))
    }
  }, [toId, destOptions, dest])


  const sourceClient = useMemo(() => getPublicClient(wagmiConfig, { chainId: fromId as never }), [fromId])

  const sourceBalance = useQuery({
    queryKey: ['bridge-src-bal', fromId, source?.address, address],
    queryFn: async () => {
      if (!sourceClient || !address || !source) return null
      if (source.address.toLowerCase() === NATIVE) return sourceClient.getBalance({ address: address as Address })
      try {
        return (await sourceClient.readContract({
          address: source.address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address as Address],
        })) as bigint
      } catch {
        return null
      }
    },
    enabled: Boolean(sourceClient && address && source),
    refetchInterval: 20_000,
  })

  const srcGas = useQuery({
    queryKey: ['gas-src', fromId, address],
    queryFn: () => (sourceClient && address ? checkGas(sourceClient, from, address as Address) : null),
    enabled: Boolean(sourceClient && address),
    refetchInterval: 20_000,
  })

  const fees = useQuery({
    queryKey: ['cctp-fees', from.cctpDomain, to.cctpDomain],
    queryFn: () => fetchCctpFees(from.cctpDomain!, to.cctpDomain!),
    enabled: Boolean(from.cctpDomain != null && to.cctpDomain != null),
    staleTime: 45_000,
    retry: 2,
  })

  const amountIn = safeParseUnits(amount, source?.decimals ?? 18)
  const balance = sourceBalance.data ?? null
  const insufficient = isConnected && source != null && amountIn > 0n && (balance ?? 0n) < amountIn

  /** Live estimate for the selected route: quotes each swap leg, applies the bridge fee. */
  const estimate = useQuery({
    queryKey: ['route-est', fromId, toId, source?.address, dest?.address, amountIn.toString(), fast],
    queryFn: async () => {
      if (!route || !source || !dest || amountIn <= 0n) return null
      let current = amountIn
      const lines: Array<{ leg: string; detail: string }> = []
      for (let i = 0; i < route.legs.length; i++) {
        const leg = route.legs[i]
        if (leg.kind === 'swap') {
          const chain = getChain(leg.chainId)!
          const client = getPublicClient(wagmiConfig, { chainId: leg.chainId as never })!
          const q = await quoteBest(client, chain, leg.tokenIn, leg.tokenOut, current)
          if (!q) return { amountOut: 0n, lines, failed: `No pool offers this swap on ${chain.short} right now.` }
          current = q.amountOut
          const a = symbolOn(leg.chainId, leg.tokenIn)
          const b = symbolOn(leg.chainId, leg.tokenOut)
          lines.push({
            leg: legLabel(i, leg),
            detail: `Pool fee is inside the quote${q.priceImpactBps ? `, price impact ${q.priceImpactBps}bps` : ''}.`,
          })
        } else if (leg.kind === 'cctp') {
          const bps = fast ? (fees.data?.fastBps ?? 0) : (fees.data?.standardBps ?? 0)
          const fee = maxFeeFor(current, bps)
          current = current > fee ? current - fee : 0n
          lines.push({ leg: legLabel(i, leg), detail: `Circle CCTP v2, max protocol fee ${fmt(fee, 6, 6)} USDC.` })
        } else {
          lines.push({ leg: legLabel(i, leg), detail: 'Canonical OP Stack deposit, no protocol fee.' })
        }
      }
      return { amountOut: current, lines }
    },
    enabled: Boolean(route && source && dest && amountIn > 0n),
    staleTime: 10_000,
    retry: 0,
  })

  const activity = activeId ? getActivity(activeId) : undefined

  async function ensureChain(id: number) {
    if (chainId !== id) await switchChainAsync({ chainId: id as never })
  }

  async function run() {
    if (!address) return notify('Connect a wallet first.', 'error')
    if (!source || !dest) return notify('Pick a source and destination asset.', 'error')
    if (!route) return notify('No bridge route available for this token pair.', 'error')
    if (!/^0x[0-9a-fA-F]{40}$/.test(effectiveRecipient)) return notify('Recipient is not a valid EVM address.', 'error')
    if (amountIn <= 0n) return notify('Enter an amount.', 'error')
    if (insufficient) return notify(`Not enough ${source.symbol} on ${from.short}.`, 'error')

    setBusy('start')
    try {
      await ensureChain(fromId)
      const steps = route.legs.flatMap((leg, i) => {
        const base = {
          key: `leg${i}`,
          label: legLabel(i, leg),
          status: 'pending' as const,
          chainId: leg.kind === 'swap' ? leg.chainId : leg.from,
        }
        // portal and Orbit deposits have a second step: the destination chain credits it
        return leg.kind === 'portal' || leg.kind === 'arbitrum'
          ? [
              base,
              {
                key: `arrive${i}`,
                label: `Arrives on ${getChain(leg.to)?.short ?? 'L2'}`,
                status: 'pending' as const,
                chainId: leg.to,
                note: 'Waiting for the sequencer to include the deposit.',
              },
            ]
          : [base]
      })
      const item = addActivity({
        kind: route.legs.length > 1 ? 'bridge' : route.legs[0].kind === 'portal' ? 'deposit' : 'bridge',
        provider: route.legs.some((l) => l.kind === 'cctp')
          ? 'cctp'
          : route.legs.some((l) => l.kind === 'arbitrum')
            ? 'orbit'
            : 'opstack',
        fromChainId: fromId,
        toChainId: toId,
        owner: address,
        tokenIn: { symbol: source.symbol, address: source.address, decimals: source.decimals },
        tokenOut: { symbol: dest.symbol, address: dest.address, decimals: dest.decimals },
        amountIn: amount,
        amountOut: estimate.data ? fmt(estimate.data.amountOut, dest.decimals, 6) : '',
        status: 'pending',
        meta: {
          routeType: route.type,
          routeLabel: route.label,
          txCount: route.txCount,
          recipient: effectiveRecipient,
          etaMs: route.legs.reduce(
            (a, l) => a + (l.kind === 'portal' ? 180000 : l.kind === 'arbitrum' ? 600000 : l.kind === 'cctp' ? 120000 : 30000),
            0,
          ),
        },
        steps,
      })
      setActiveId(item.id)

      let current = amountIn
      for (let i = 0; i < route.legs.length; i++) {
        const leg = route.legs[i]
        const chain = getChain(leg.kind === 'swap' ? leg.chainId : leg.from)!
        await ensureChain(chain.id)
        const client = getPublicClient(wagmiConfig, { chainId: chain.id as never })!
        const wallet = await getWalletClient(wagmiConfig, { chainId: chain.id as never })
        const sender = walletSender(wallet)

        if (leg.kind === 'swap') {
          updateStep(item.id, `leg${i}`, { status: 'active' })
          const q = await quoteBest(client, chain, leg.tokenIn, leg.tokenOut, current)
          if (!q) throw new Error(`No pool offers this swap on ${chain.short} right now.`)
          const inTok = symbolOn(leg.chainId, leg.tokenIn)
          const outTok = symbolOn(leg.chainId, leg.tokenOut)
          const nativeIn = leg.tokenIn.toLowerCase() === NATIVE
          await executeSwap({
            chain,
            account: address as Address,
            tokenIn: {
              address: nativeIn ? null : (leg.tokenIn as Address),
              symbol: inTok.symbol,
              decimals: inTok.decimals,
            },
            tokenOut: { address: leg.tokenOut as Address, symbol: outTok.symbol, decimals: outTok.decimals },
            amountIn: current,
            amountOutMinimum: applySlippage(q.amountOut, slippageBps),
            fee: q.fee,
            wallet: sender,
            publicClient: client as never,
            onStep: (step, state, hash) =>
              updateStep(item.id, `leg${i}`, { status: state === 'active' ? 'active' : state === 'done' ? 'done' : 'failed', hash }),
          })
          current = q.amountOut
        } else if (leg.kind === 'cctp') {
          const bps = fast ? (fees.data?.fastBps ?? 0) : (fees.data?.standardBps ?? 0)
          const maxFee = maxFeeFor(current, bps)
          await executeCctpBridge({
            fromChainId: leg.from,
            toChainId: leg.to,
            amount: current,
            fast,
            maxFee,
            recipient: effectiveRecipient as Address,
            wallet: sender,
            client,
            onStep: (step, state, hash) =>
              updateStep(item.id, `leg${i}`, { status: state === 'active' ? 'active' : state === 'done' ? 'done' : 'failed', hash }),
          })
          current = current > maxFee ? current - maxFee : 0n
        } else {
          await executeOpDeposit({
            fromChain: getChain(leg.from)!,
            toChainId: leg.to,
            recipient: effectiveRecipient as Address,
            mint: current,
            wallet: sender,
            client,
            onStep: (step, state, hash) =>
              updateStep(item.id, `leg${i}`, { status: state === 'active' ? 'active' : state === 'done' ? 'done' : 'failed', hash }),
          })
          if (route.legs[i].kind === 'portal') {
            const l2 = getPublicClient(wagmiConfig, { chainId: leg.to as never })
            if (l2) {
              updateStep(item.id, `arrive${i}`, { status: 'active' })
              startDepositTracking(item.id, { l1: client, l2 }, {
                onDone: (st) => notify(st === 'complete' ? 'Deposit included on the destination chain.' : 'The deposit was included but reverted.', st === 'complete' ? 'success' : 'error'),
              })
            }
          }
          if (route.legs[i].kind === 'arbitrum') {
            const cfg = orbitBridgeFor(leg.to)!
            const l2 = getPublicClient(wagmiConfig, { chainId: leg.to as never })
            if (l2) {
              // record the destination balance so arrival can be detected by comparison
              const before = await l2.getBalance({ address: effectiveRecipient as Address }).catch(() => 0n)
              updateActivity(item.id, { meta: { ...(item.meta ?? {}), orbitExpected: String(current), orbitBaseline: String(before) } })
              updateStep(item.id, `arrive${i}`, { status: 'active', note: 'Retryable ticket submitted. Waiting for the sequencer to redeem it.' })
              startOrbitTracking(item.id, l2, { maxMinutes: 60 })
            }
          }
        }
        finalizeFromSteps(item.id)
      }

      const last = route.legs[route.legs.length - 1]
      if (last.kind === 'cctp') {
        updateStep(item.id, `leg${route.legs.length - 1}`, {
          status: 'active',
          note: 'Burn done. Circle is attesting, the mint is a second signature.',
        })
        startTracking(item.id, {
          onDone: (s) => {
            if (s === 'complete') notify('Attestation ready, finish the mint on the destination.', 'success')
          },
        })
      }
      finalizeFromSteps(item.id)
      sourceBalance.refetch()
      notify('Transfer submitted. Each step is a signature you approve.', 'success')
    } catch (e) {
      const d = decodeTxError(e, chainId)
      notify(`${d.title}: ${d.detail}`, 'error')
      if (activeId) {
        if (d.kind === 'rejected') updateActivity(activeId, { status: 'cancelled', error: 'Rejected in wallet' })
        else finalizeFromSteps(activeId)
      }
    } finally {
      setBusy(null)
    }
  }

  const hasRoute = Boolean(route) && Boolean(dest)

  return (
    <div className="flex min-h-0 flex-col gap-5 lg:h-[calc(100dvh-7rem)] lg:flex-none">

      <div className="grid w-full min-h-0 flex-1 gap-7 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-stretch">
        <Card className="flex h-full min-h-0 flex-col overflow-hidden p-5">
          <div className="relative flex flex-1 flex-col gap-3">
            <div className="flex min-h-[140px] flex-1 flex-col justify-center rounded-[16px] border border-line-strong bg-ink-850 p-5">
              <div className="mb-2 flex items-center">
                <span className="col-head">You send</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0.0"
                  inputMode="decimal"
                  onFocus={() => setAmountFocused(true)}
                  onBlur={() => setAmountFocused(false)}
                  className="input display text-[56px] leading-[66px] tracking-[-0.02em]"
                />
                <div className="flex shrink-0 flex-col items-center gap-1.5">
                <button
                  onClick={() => setPick('source')}
                  className="flex h-16 shrink-0 items-center gap-2.5 rounded-full border border-line-strong bg-ink-700 pl-2 pr-4 transition-colors hover:border-accent/50 hover:bg-ink-600"
                >
                  {source ? <TokenIcon symbol={source.symbol} size={38} chainId={fromId} address={source.address} verified={source.verified} /> : null}
                  <span className="display text-[16px] text-t1">{source?.symbol ?? 'select'}</span>
                  <ChevronDown size={15} className="text-t2" />
                </button>
                <span className="mono text-[11px] leading-none text-t2">
                  {!isConnected
                    ? '-'
                    : sourceBalance.isLoading
                      ? '…'
                      : sourceBalance.isError || balance == null
                        ? 'n/a'
                        : fmt(balance, source?.decimals ?? 18, 4)}
                </span>
              </div>
              </div>
            </div>

            <button
              onClick={() => {
                setFromId(toId)
                setToId(fromId)
              }}
              className="absolute left-1/2 top-1/2 z-10 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-ink-800 text-t1 transition-all duration-150 hover:scale-110 hover:border-accent/60 hover:text-accent"
              title="Swap direction"
            >
              <ArrowDownUp size={14} />
            </button>

            <div className="flex flex-1 flex-col justify-center rounded-[16px] border border-line-strong bg-ink-850 p-5">
              <div className="mb-2 flex items-center">
                <span className="col-head">You receive</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="input display flex-1 truncate text-[56px] leading-[66px] tracking-[-0.02em] text-t1">
                  {estimate.data && dest ? (
                    fmt(estimate.data.amountOut, dest.decimals, 6)
                  ) : (
                    <span className="text-t3">0.0</span>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-center gap-1.5">
                <button
                  onClick={() => setPick('dest')}
                  className="flex h-16 shrink-0 items-center gap-2.5 rounded-full border border-line-strong bg-ink-700 pl-2 pr-4 transition-colors hover:border-accent/50 hover:bg-ink-600"
                >
                  {dest ? <TokenIcon symbol={dest.symbol} size={38} chainId={toId} address={dest.address} verified={dest.verified} /> : null}
                  <span className="display text-[16px] text-t1">{dest?.symbol ?? 'pick'}</span>
                  <ChevronDown size={15} className="text-t2" />
                </button>
                <span className="mono text-[11px] leading-none text-t2">
                  {estimate.data && dest ? fmt(estimate.data.amountOut, dest.decimals, 4) : '—'}
                </span>
              </div>
              </div>
            </div>
          </div>

          {!route ? (
            <div className="mt-3 rounded-lg border border-[#ff8f8f]/25 bg-[#ff8f8f]/8 px-3 py-2.5">
              <div className="text-[12px] font-medium text-[#ffb4b6]">
                No route from {from.short} to {to.short} for {source?.symbol ?? 'this asset'}.
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-t2">
                {source
                  ? (sourceNotes[source.address.toLowerCase()] ??
                    (orbitBridgeFor(toId) && !ORBIT_ETH_NATIVE.has(toId)
                      ? `${to.short} is an Arbitrum Orbit chain whose gas token is ${to.viem.nativeCurrency.symbol}, not ETH, so its inbox prices retryable tickets in that token and a plain ETH deposit does not exist there.`
                      : 'No verified provider covers this pair in this direction.'))
                  : 'Pick an asset to see whether it can move.'}
              </p>
              {reachableSources.length > 0 && (
                <p className="mt-1 text-[11px] leading-relaxed text-t3">
                  Assets that can leave {from.short} for {to.short}:{' '}
                  {reachableSources.map((t) => t.symbol).join(', ')}.
                </p>
              )}
              {reachableSources.length === 0 && (
                <p className="mt-1 text-[11px] leading-relaxed text-t3">
                  Nothing can leave {from.short} for {to.short}. The reverse direction may still work.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-line-strong bg-ink-850 p-3">
              {route ? (
                <>
                  <RoutePath
                    fromId={fromId}
                    toId={toId}
                    source={source}
                    dest={dest}
                    kind={route.legs[route.legs.length - 1]?.kind}
                  />
                  
                </>
              ) : (
                <span className="text-[12px] text-t3">Select an asset to see the route.</span>
              )}
            </div>
          )}

          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="space-y-1">
              {insufficient && <div className="text-[11px] text-[#ffb4b6]">Amount exceeds your balance on {from.short}.</div>}
              {srcGas.data && !srcGas.data.ok && (
                <div className="text-[11px] text-[#e6c17a]">
                  No {srcGas.data.symbol} for gas on {from.short}, get some from the Faucets page.
                </div>
              )}
            </div>
            <div
              className={
                'mt-2 flex h-6 items-center justify-end gap-1 transition-opacity duration-150 ' +
                (amountFocused || amount !== '' ? 'opacity-100' : 'pointer-events-none opacity-0')
              }
            >
              {[25, 50, 75].map((pct) => (
                <button
                  key={pct}
                  onClick={() => {
                    if (balance == null || !source) return
                    const raw = (balance * BigInt(pct)) / 100n
                    const keep = source.address.toLowerCase() === NATIVE ? balance / 50n : 0n
                    setAmount(formatUnits(raw > keep ? raw - keep : 0n, source.decimals))
                  }}
                  className="mono rounded-md border border-line px-1.5 py-0.5 text-[10px] text-t3 transition-colors hover:border-line-strong hover:text-t1"
                >
                  {pct}%
                </button>
              ))}
              <button
                onClick={() => {
                  if (balance == null || !source) return
                  if (source.address.toLowerCase() === NATIVE) {
                    const keep = balance / 50n
                    setAmount(formatUnits(balance > keep ? balance - keep : 0n, source.decimals))
                  } else {
                    setAmount(formatUnits(balance, source.decimals))
                  }
                }}
                className="mono rounded-md border border-line px-1.5 py-0.5 text-[10px] text-t2 transition-colors hover:border-accent/50 hover:text-accent"
              >
                MAX
              </button>
            </div>
          </div>

          {/* always on screen: the form must not jump when the direction changes */}
          {true && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-line bg-ink-850 px-3 py-2">
              <div>
                <div className="text-[12px] font-medium text-t1">Slippage tolerance</div>
                <div className="text-[10px] text-t3">Applied to every swap leg before it is signed.</div>
              </div>
              <div className="flex gap-1">
                {[50, 100, 200].map((bps) => (
                  <button
                    key={bps}
                    onClick={() => setSlippageBps(bps)}
                    className={`rounded-md border px-2 py-1 text-[11px] transition ${
                      slippageBps === bps
                        ? 'border-accent/50 bg-accent/10 text-t1'
                        : 'border-line text-t2 hover:border-line-strong'
                    }`}
                  >
                    {(bps / 100).toFixed(bps === 50 ? 1 : 0)}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {true && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setFast(true)} className={`panel p-3 text-left transition ${fast ? 'border-accent/50 bg-accent/8' : 'hover:bg-ink-700'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-t1">Fast</span>
                  <Badge tone={fast ? 'mint' : 'default'}>{fees.data ? `${(fees.data.fastBps / 100).toFixed(2)}%` : '-'}</Badge>
                </div>
                <div className="mt-0.5 text-[10px] leading-relaxed text-t3">Fee at mint · attested after soft finality</div>
              </button>
              <button onClick={() => setFast(false)} className={`panel p-3 text-left transition ${!fast ? 'border-accent/50 bg-accent/8' : 'hover:bg-ink-700'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-t1">Standard</span>
                  <Badge tone={!fast ? 'mint' : 'default'}>{fees.data ? `${(fees.data.standardBps / 100).toFixed(2)}%` : '-'}</Badge>
                </div>
                <div className="mt-0.5 text-[10px] leading-relaxed text-t3">No protocol fee · waits for hard finality</div>
              </button>
            </div>
          )}

          <div className="mt-3">
            {!editRecipient ? (
              <button
                onClick={() => setEditRecipient(true)}
                className="group flex w-full items-center justify-between rounded-lg border border-line px-3 py-2.5 text-left transition-colors hover:border-line-strong"
              >
                <span className="text-[12px] text-t2">Sending to a different address?</span>
                <ChevronDown size={13} className="text-t3 transition-colors group-hover:text-accent" />
              </button>
            ) : (
              <div className="field p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="col-head">Recipient on {to.short}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setRecipient(address ?? '')}
                      className="mono rounded-md border border-line px-1.5 py-0.5 text-[10px] text-t3 transition-colors hover:border-line-strong hover:text-t1"
                    >
                      my wallet
                    </button>
                    <button
                      onClick={() => {
                        setEditRecipient(false)
                        setRecipient('')
                      }}
                      aria-label="Close"
                      className="grid size-6 place-items-center rounded-md border border-line text-t2 transition-colors hover:text-t1"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value.trim())}
                  placeholder="Paste a recipient address"
                  autoFocus
                  className="input mono text-[13px] text-t1"
                />
              </div>
            )}
          </div>

          <div className="mt-3">
            {!isConnected ? (
              <ConnectButton full />
            ) : (
              <Button
                full
                variant="primary"
                className="h-[64px] w-full text-[17px]"
                disabled={!hasRoute || amountIn <= 0n || insufficient}
                loading={busy === 'start'}
                onClick={run}
              >
                {route ? (
                  <span className="flex items-center gap-1.5">
                    {`Bridge ${source?.symbol ?? ''}`}
                    {route.legs.some((l) => l.kind === 'swap') && (
                      <span className="text-[13px] font-medium opacity-70">+ swap</span>
                    )}
                  </span>
                ) : (
                  'No route for this pair'
                )}
              </Button>
            )}
          </div>
        </Card>

        <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1">
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-t1">Route</h3>
              {route && <Badge tone={route.type === 'direct' ? 'mint' : 'blue'}>{route.type === 'direct' ? 'Direct' : 'Composite'}</Badge>}
            </div>
            {route ? (
              <>
                <p className="mb-2.5 rounded-lg bg-ink-850 px-2.5 py-2 text-[11px] leading-relaxed text-t2">{route.detail}</p>
                <Row label="Source asset" value={source?.symbol ?? '-'} />
                <Row label="Destination asset" value={dest?.symbol ?? '-'} />
                <Row label="Wallet signatures" value={String(route.txCount)} />
                <Row label="You receive" value={estimate.data && dest ? `${fmt(estimate.data.amountOut, dest.decimals, 6)} ${dest.symbol}` : '—'} />
                <Row
                  label="ETA"
                  value={
                    route.legs.some((l) => l.kind === 'arbitrum')
                      ? '≈1–10 min (retryable ticket)'
                      : route.legs.some((l) => l.kind === 'portal')
                      ? '≈1–3 min per deposit'
                      : route.legs.some((l) => l.kind === 'cctp')
                        ? fast
                          ? '~15s–2 min attest + dest tx'
                          : '~13–19 min (hard finality)'
                        : 'a few seconds per swap'
                  }
                />
                <div className="mt-2 space-y-1.5 border-t border-line pt-2">
                  {(estimate.data?.lines?.length ? estimate.data.lines : route.legs.map((l, i) => ({ leg: legLabel(i, l), detail: '' }))).map(
                    (l, i) => (
                      <div key={i} className="text-[11px] leading-5">
                        <div className="text-t1">
                          {i + 1}. {l.leg}
                        </div>
                        {l.detail && <div className="text-t3">{l.detail}</div>}
                      </div>
                    ),
                  )}
                </div>
                {estimate.data?.failed && <p className="mt-2 text-[11px] text-[#ffb4b6]">{estimate.data.failed}</p>}
              </>
            ) : (
              <p className="text-[12px] leading-5 text-t3">
                {`${source?.symbol ?? 'The selected asset'} has no verified route from ${from.short} to ${to.short}.`}
              </p>
            )}
          </Card>


          <Card className="p-4">
            <div className="flex items-start gap-2 text-[11px] leading-relaxed text-t2">
              <Info size={14} className="mt-0.5 shrink-0 text-accent" />
              <div className="space-y-1.5">
                <p>
                  <span className="font-semibold text-t1">Direct routes</span> move the same asset: USDC through Circle CCTP,
                  ETH through the chain's own OP Stack portal.
                </p>
                <p>
                  <span className="font-semibold text-t1">Bridge + swap</span> routes are composites. Every step is a real,
                  verified operation you sign yourself, and the app never presents them as one transaction.
                </p>
                <p className="text-t3">
                  CCTP moves native USDC only. ETH deposits are one-way; the 7-day withdrawal window is not offered.
                </p>
              </div>
            </div>
          </Card>

          <ActiveTransfers />
        </div>
      </div>

      <ChainSelect
        open={pick === 'from' || pick === 'to'}
        onClose={() => setPick(null)}
        chains={CHAINS}
        value={pick === 'from' ? fromId : toId}
        onSelect={(id) => {
          if (pick === 'from') {
            setFromId(id)
            setSourceId(keyOf(id, NATIVE))
          } else {
            setToId(id)
            setDestId(keyOf(id, NATIVE))
          }
        }}
        title={pick === 'from' ? 'Source network' : 'Destination network'}
        subtitle="Only testnets on the allowlist are listed."
      />

      <TokenPicker
        open={pick === 'source'}
        title="Send asset"
        groups={[{ chain: from, tokens: sourceOptions, notes: sourceNotes }]}
        chains={CHAINS}
        onChainChange={(id) => setFromId(id)}
        value={source ? { chainId: fromId, address: source.address } : null}
        onClose={() => setPick(null)}
        onSelect={(c, t) => setSourceId(keyOf(c.id, t.address))}
      />
      <TokenPicker
        open={pick === 'dest'}
        title="Receive asset"
        groups={[{ chain: to, tokens: destOptions, notes: destNotes }]}
        chains={CHAINS}
        onChainChange={(id) => setToId(id)}
        value={dest ? { chainId: toId, address: dest.address } : null}
        onClose={() => setPick(null)}
        onSelect={(c, t) => setDestId(keyOf(c.id, t.address))}
      />
    </div>
  )
}

/**
 * Live transfers, drawn as a picture rather than a paragraph: the two token marks, the chains they
 * sit on, and a dot travelling between them for as long as the transfer is in flight.
 */
function ActiveTransfers() {
  const items = useActivity()
  const { address } = useAccount()
  const active = items
    .filter(
      (i) =>
        address &&
        i.owner?.toLowerCase() === address.toLowerCase() &&
        i.kind !== 'swap' &&
        i.status === 'pending',
    )
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, 3)
  if (!address || active.length === 0) return null
  return (
    <div className="space-y-3">
      {active.map((i) => (
        <TransferCard key={i.id} item={i} />
      ))}
    </div>
  )
}

function TransferCard({ item }: { item: ActivityItem }) {
  const from = getChain(item.fromChainId)
  const to = getChain(item.toChainId)
  const done = item.steps.filter((s) => s.status === 'done' || s.status === 'skipped').length
  const total = Math.max(item.steps.length, 1)
  const activeStep = item.steps.some((s) => s.status === 'active')
  const pctDone = Math.round(((done + (activeStep ? 0.5 : 0)) / total) * 100)
  const current = item.steps.find((s) => s.status === 'active') ?? item.steps.find((s) => s.status === 'pending')

  return (
    <Card className="enter shrink-0">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="col-head">Bridging</span>
        <span className="flex items-center gap-2">
          <span className="dot bg-accent" style={{ animation: 'pulse 1.4s ease-in-out infinite' }} />
          <span className="mono text-[13px] font-semibold text-t1">{pctDone}%</span>
          <button
            onClick={() => cancelActivity(item.id)}
            title="Cancel this transfer"
            aria-label="Cancel this transfer"
            className="grid size-6 place-items-center rounded-md border border-line text-t2 transition-colors hover:border-[#ff8f8f]/40 hover:text-[#ffb4b4]"
          >
            <X size={12} />
          </button>
        </span>
      </div>

      <div className="flex items-center gap-4 px-4 py-4">
        <TokenBadge symbol={item.tokenIn.symbol} chain={from} chainId={item.fromChainId} address={item.tokenIn.address} />
        <div className="relative h-px flex-1 bg-line-strong">
          <span
            className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-accent"
            style={{ animation: 'flow 1.8s linear infinite' }}
          />
        </div>
        <TokenBadge
          symbol={item.tokenOut?.symbol ?? item.tokenIn.symbol}
          chain={to}
          chainId={item.toChainId}
          address={item.tokenOut?.address}
        />
      </div>

      <div className="px-4 pb-4 text-center">
        <div className="mono text-[13px] text-t1">
          {item.amountIn} {item.tokenIn.symbol} → {item.tokenOut?.symbol ?? item.tokenIn.symbol}
        </div>
        {from && to && (
          <div className="mt-1 text-[12px] text-t2">
            {from.short} → {to.short}
          </div>
        )}
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink-600">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(pctDone, 6)}%` }}
          />
        </div>
        {current && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-t3">
            <Spinner size={11} /> <span className="truncate">{current.label}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

/** token mark with the chain badge tucked into its bottom-right corner, like the portfolio list */
function TokenBadge({
  symbol,
  chain,
  chainId,
  address,
}: {
  symbol: string
  chain?: ReturnType<typeof getChain>
  chainId: number
  address?: string
}) {
  return (
    <div className="relative shrink-0">
      <TokenIcon symbol={symbol} size={38} chainId={chainId} address={address} />
      {chain && (
        <span className="absolute -bottom-1 -right-1 grid size-[18px] place-items-center overflow-hidden rounded-full border border-ink-850 bg-ink-800">
          <ChainLogo chain={chain} size={12} />
        </span>
      )}
    </div>
  )
}
