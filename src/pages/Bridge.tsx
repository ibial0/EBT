import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowDownUp, ChevronDown, Info, Route as RouteIcon } from 'lucide-react'
import { formatUnits } from 'viem'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { getPublicClient, getWalletClient } from 'wagmi/actions'
import { CHAINS, getChain, type Address } from '../config/chains'
import { nativeToken, tokensForChain, type TokenCfg } from '../config/tokens'
import { Card, Button, Badge, Row, notify, ChainLogo, TokenIcon } from '../components/ui'
import { ChainChip, ChainSelect } from '../components/ChainSelect'
import { ConnectButton, PageHeader } from '../components/Layout'
import { Timeline } from '../components/Timeline'
import { addActivity, updateStep, updateActivity, finalizeFromSteps, getActivity } from '../lib/activity'
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
        {fromChain ? <ChainLogo chain={fromChain} size={28} /> : null}
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold leading-5 text-t1">{source?.symbol ?? '—'}</div>
          <div className="truncate text-[10px] leading-4 text-t2">{fromChain?.short}</div>
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        <span className="absolute inset-x-0 top-1/2 -z-0 h-px -translate-y-1/2 bg-line-strong" />
        <span className="relative z-10 whitespace-nowrap rounded-full border border-line bg-ink-900 px-2 py-[2px] text-[9px] font-medium uppercase tracking-[0.08em] text-t2">
          {label}
        </span>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2.5">
        <div className="min-w-0 text-right">
          <div className="truncate text-[13px] font-semibold leading-5 text-t1">{dest?.symbol ?? '—'}</div>
          <div className="truncate text-[10px] leading-4 text-t2">{toChain?.short}</div>
        </div>
        {toChain ? <ChainLogo chain={toChain} size={28} /> : null}
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
  const [pick, setPick] = useState<'from' | 'to' | 'source' | 'dest' | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | undefined>()
  const [lastError, setLastError] = useState<ReturnType<typeof decodeTxError> | null>(null)

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

  useEffect(() => {
    if (address && !recipient) setRecipient(address)
  }, [address, recipient])

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
    if (!/^0x[0-9a-fA-F]{40}$/.test(recipient)) return notify('Recipient is not a valid EVM address.', 'error')
    if (amountIn <= 0n) return notify('Enter an amount.', 'error')
    if (insufficient) return notify(`Not enough ${source.symbol} on ${from.short}.`, 'error')

    setBusy('start')
    setLastError(null)
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
        meta: { routeType: route.type, routeLabel: route.label, txCount: route.txCount, recipient },
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
            recipient: recipient as Address,
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
            recipient: recipient as Address,
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
              const before = await l2.getBalance({ address: recipient as Address }).catch(() => 0n)
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
      setLastError(d)
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
    <div className="space-y-5">
      <PageHeader
        eyebrow="Asset movement"
        title="Bridge"
        subtitle="Pick two networks and the app works out what can actually move between them: direct same-asset routes through Circle CCTP or the canonical OP Stack portal, and bridge plus swap routes where that is the only way. Nothing is inferred from token symbols."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-5">
          <div className="relative">
            <div className="rounded-[14px] border border-line-strong bg-ink-850 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="col-head">You send</span>
                <span className={"mono text-[12px] " + (sourceBalance.isError ? 'text-[#e6c17a]' : 'text-t2')}>
                  {!isConnected
                    ? '-'
                    : sourceBalance.isLoading
                      ? 'loading…'
                      : sourceBalance.isError || balance == null
                        ? 'balance unavailable'
                        : `${fmt(balance, source?.decimals ?? 18, 5)} ${source?.symbol ?? ''}`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <ChainChip chainId={fromId} onClick={() => setPick('from')} />
                <button
                  onClick={() => setPick('source')}
                  className="flex h-11 items-center gap-2 rounded-full border border-line-strong bg-ink-700 pl-1.5 pr-3 transition-colors hover:border-accent/50 hover:bg-ink-600"
                >
                  {source ? <TokenIcon symbol={source.symbol} size={26} chainId={fromId} address={source.address} verified={source.verified} /> : null}
                  <span className="display text-[15px] text-t1">{source?.symbol ?? 'select'}</span>
                  <ChevronDown size={13} className="text-t3" />
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setFromId(toId)
                setToId(fromId)
              }}
              className="absolute left-1/2 top-1/2 z-10 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-ink-800 text-t1 transition-all duration-150 hover:scale-110 hover:border-accent/60 hover:text-accent"
              title="Swap direction"
            >
              <ArrowDownUp size={14} />
            </button>

            <div className="mt-2 rounded-[14px] border border-line-strong bg-ink-850 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="col-head">You receive</span>
                <span>{estimate.data && dest ? `${fmt(estimate.data.amountOut, dest.decimals, 6)} ${dest.symbol}` : '-'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <ChainChip chainId={toId} onClick={() => setPick('to')} />
                <button
                  onClick={() => setPick('dest')}
                  className="flex h-11 items-center gap-2 rounded-full border border-line-strong bg-ink-700 pl-1.5 pr-3 transition-colors hover:border-accent/50 hover:bg-ink-600"
                >
                  {dest ? <TokenIcon symbol={dest.symbol} size={26} chainId={toId} address={dest.address} verified={dest.verified} /> : null}
                  <span className="display text-[15px] text-t1">{dest?.symbol ?? 'nothing reachable'}</span>
                  <ChevronDown size={13} className="text-t3" />
                </button>
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
                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5">
                    <span className="mono text-[12px] uppercase tracking-[0.6px] text-t2">
                      {route.txCount} signature{route.txCount === 1 ? '' : 's'} ·{' '}
                      {(estimate.data?.lines.length ?? route.legs.length)} verified step
                      {(estimate.data?.lines.length ?? route.legs.length) === 1 ? '' : 's'}
                    </span>
                    <Badge tone={route.type === 'direct' ? 'mint' : 'blue'}>
                      {route.type === 'direct' ? 'Direct' : 'Bridge + swap'}
                    </Badge>
                  </div>
                </>
              ) : (
                <span className="text-[12px] text-t3">Select an asset to see the route.</span>
              )}
            </div>
          )}

          <div className="field mt-3 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="label">Amount</span>
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
                className="rounded-md border border-line px-2 py-0.5 text-[11px] text-t1 transition-colors hover:border-line-strong"
              >
                MAX
              </button>
            </div>
            <div className="flex items-center gap-3">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0.0"
                inputMode="decimal"
                className="input text-2xl font-semibold"
              />
              <span className="shrink-0 text-sm font-medium text-t1">{source?.symbol ?? ''}</span>
            </div>
            {insufficient && <div className="mt-1 text-[11px] text-[#ffb4b6]">Amount exceeds your balance on {from.short}.</div>}
            {srcGas.data && !srcGas.data.ok && (
              <div className="mt-1 text-[11px] text-[#e6c17a]">
                No {srcGas.data.symbol} for gas on {from.short}, get some from the Faucets page.
              </div>
            )}
          </div>

          {route?.legs.some((l) => l.kind === 'swap') && (
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

          {route?.legs.some((l) => l.kind === 'cctp') && (
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

          <div className="field mt-3 p-3">
            <div className="mb-1 label">Recipient on {to.short}</div>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.trim())}
              placeholder="0x…"
              className="input mono rounded-md border border-line bg-ink-800 px-2.5 py-2 text-[12px] text-t1"
            />
          </div>

          {!isConnected ? (
            <div className="mt-4">
              <ConnectButton full />
            </div>
          ) : (
            <Button
              full
              size="lg"
              variant="primary"
              className="mt-4 h-[52px] text-[16px]"
              disabled={!hasRoute || amountIn <= 0n || insufficient}
              loading={busy === 'start'}
              onClick={run}
            >
              {route ? (route.type === 'direct' ? `Bridge ${source?.symbol}` : `Bridge ${source?.symbol} + swap`) : 'No route for this pair'}
            </Button>
          )}

          {chainId !== fromId && isConnected && (
            <button onClick={() => ensureChain(fromId)} className="mt-2 w-full text-center text-[11px] text-[#e6c17a] hover:underline">
              Wallet is on {getChain(chainId)?.short ?? chainId}, switching to {from.short} is needed to sign.
            </button>
          )}
        </Card>

        <div className="space-y-3">
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
                {estimate.data && <Row label="You receive" value={`${fmt(estimate.data.amountOut, dest?.decimals ?? 18, 6)} ${dest?.symbol ?? ''}`} />}
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

          {routes.length > 1 && (
            <Card className="p-4">
              <h3 className="mb-2 text-sm font-semibold text-t1">Other valid routes</h3>
              <div className="space-y-1.5">
                {routes.slice(1, 4).map((r) => (
                  <div key={r.id} className="panel p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-t1">{r.label}</span>
                      <Badge tone="default">{r.txCount} tx</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {lastError && (
            <Card className="border-[#ff8f8f]/30 p-4">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-[#ffb4b6]">
                <AlertTriangle size={13} /> {lastError.title}
              </div>
              <p className="text-[11px] leading-relaxed text-t1">{lastError.detail}</p>
              {lastError.hint && <p className="mt-1 text-[11px] leading-relaxed text-t3">{lastError.hint}</p>}
            </Card>
          )}

          {activity && (
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-t1">Progress</h3>
                <Badge tone={activity.status === 'complete' ? 'mint' : activity.status === 'failed' ? 'red' : 'amber'}>{activity.status}</Badge>
              </div>
              <Timeline steps={activity.steps} />
              <Link to={`/activity/${activity.id}`} className="mt-2 block text-center text-[11px] text-t2 hover:text-accent">
                open full record
              </Link>
            </Card>
          )}

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

