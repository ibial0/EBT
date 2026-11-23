import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowDownUp, Info, ShieldCheck, Wallet } from 'lucide-react'
import { formatUnits } from 'viem'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { getPublicClient, getWalletClient } from 'wagmi/actions'
import { CCTP_CHAINS, CHAINS, getChain, type Address } from '../config/chains'
import { USDC_OF, nativeToken } from '../config/tokens'
import { Card, Button, Badge, Row, notify, ChainLogo, TokenIcon } from '../components/ui'
import { ChainSelect, ChainChip } from '../components/ChainSelect'
import { ConnectButton } from '../components/Layout'
import { PageHeader } from '../components/Layout'
import { Timeline } from '../components/Timeline'
import { addActivity, updateActivity, updateStep, finalizeFromSteps, getActivity } from '../lib/activity'
import { fetchCctpFees, maxFeeFor, cctpRouteAvailable } from '../lib/cctp'
import { executeCctpBridge, submitReceiveMessage, executeOpDeposit, isMessageUsed } from '../lib/bridgeExec'
import { opStackBridgeAvailable } from '../lib/opstack'
import { describeBlock, assertCctpRoute } from '../lib/guard'
import { startTracking } from '../lib/tracker'
import { fmt, safeParseUnits, pct } from '../lib/format'
import { erc20Abi } from '../lib/uniswap'
import { checkGas, walletSender } from '../lib/tx'
import { decodeTxError } from '../lib/errors'
import { wagmiConfig } from '../lib/wallet'

type RouteKind = 'cctp' | 'opstack' | 'none'

export default function Bridge() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()

  const [fromId, setFromId] = useState(11155111)
  const [toId, setToId] = useState(84532)
  const [amount, setAmount] = useState('')
  const [fast, setFast] = useState(true)
  const [recipient, setRecipient] = useState('')
  const [pick, setPick] = useState<'from' | 'to' | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | undefined>()
  const [lastError, setLastError] = useState<ReturnType<typeof decodeTxError> | null>(null)

  const from = getChain(fromId)!
  const to = getChain(toId)!

  const available = useMemo<RouteKind[]>(() => {
    const list: RouteKind[] = []
    if (cctpRouteAvailable(fromId, toId)) list.push('cctp')
    if (opStackBridgeAvailable(fromId, toId)) list.push('opstack')
    return list.length ? list : ['none']
  }, [fromId, toId])

  const [picked, setPicked] = useState<RouteKind>('cctp')
  const kind: RouteKind = available.includes(picked) ? picked : available[0]

  const isOpRoute = kind === 'opstack'
  const isCctp = kind === 'cctp'
  const assetDecimals = isOpRoute ? 18 : 6
  const assetSymbol = isOpRoute ? from.viem.nativeCurrency.symbol : 'USDC'
  const usdc = USDC_OF(fromId)
  const amountIn = safeParseUnits(amount, assetDecimals)

  useEffect(() => {
    if (address && !recipient) setRecipient(address)
  }, [address, recipient])

  const fees = useQuery({
    queryKey: ['cctp-fees', from.cctpDomain, to.cctpDomain],
    queryFn: () => fetchCctpFees(from.cctpDomain!, to.cctpDomain!),
    enabled: isCctp,
    staleTime: 45_000,
    refetchInterval: 60_000,
    retry: 2,
  })

  const fromClient = useMemo(() => getPublicClient(wagmiConfig, { chainId: fromId as never }), [fromId])
  const toClient = useMemo(() => getPublicClient(wagmiConfig, { chainId: toId as never }), [toId])

  const tokenBalance = useQuery({
    queryKey: ['bridge-bal', fromId, address, isCctp, usdc?.address],
    queryFn: async () => {
      if (!fromClient || !address) return null
      if (isOpRoute) return fromClient.getBalance({ address: address as Address })
      if (!usdc) return null
      try {
        return (await fromClient.readContract({
          address: usdc.address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address as Address],
        })) as bigint
      } catch {
        return null
      }
    },
    enabled: Boolean(fromClient && address && (isOpRoute || usdc)),
    refetchInterval: 15_000,
  })

  const srcGas = useQuery({
    queryKey: ['gas-src', fromId, address],
    queryFn: () => (fromClient && address ? checkGas(fromClient, from, address as Address) : null),
    enabled: Boolean(fromClient && address),
    refetchInterval: 20_000,
  })

  const dstGas = useQuery({
    queryKey: ['gas-dst', toId, address],
    queryFn: () => (toClient && address ? checkGas(toClient, to, address as Address) : null),
    enabled: Boolean(toClient && address && isCctp),
    refetchInterval: 20_000,
  })

  const bps = fast ? (fees.data?.fastBps ?? 0) : (fees.data?.standardBps ?? 0)
  const maxFee = isCctp ? maxFeeFor(amountIn, bps) : 0n
  const receive = amountIn > maxFee ? amountIn - maxFee : 0n

  const activity = activeId ? getActivity(activeId) : undefined
  const balance = tokenBalance.data ?? null
  const insufficient = isConnected && amountIn > 0n && (balance ?? 0n) < amountIn
  const balanceError = tokenBalance.isError || (tokenBalance.isSuccess && tokenBalance.data === null)

  async function ensureChain(id: number) {
    if (chainId !== id) await switchChainAsync({ chainId: id as never })
  }

  async function runBridge() {
    if (!address) return notify('Connect a wallet first.', 'error')
    if (!/^0x[0-9a-fA-F]{40}$/.test(recipient)) return notify('Recipient is not a valid EVM address.', 'error')
    if (amountIn <= 0n) return notify('Enter an amount.', 'error')
    if (insufficient) return notify(`Not enough ${assetSymbol} on ${from.short}.`, 'error')
    if (kind === 'none') return notify('No verified route for this pair.', 'error')

    setBusy('start')
    setLastError(null)
    try {
      await ensureChain(fromId)
      const client = getPublicClient(wagmiConfig, { chainId: fromId as never })!
      const wallet = await getWalletClient(wagmiConfig, { chainId: fromId as never })
      const sender = { sendTransaction: (tx: Parameters<typeof wallet.sendTransaction>[0]) => wallet!.sendTransaction(tx as never) }

      if (isOpRoute) {
        const item = addActivity({
          kind: 'deposit',
          provider: 'opstack',
          fromChainId: fromId,
          toChainId: toId,
          owner: address,
          tokenIn: { symbol: assetSymbol, decimals: 18 },
          tokenOut: { symbol: assetSymbol, decimals: 18 },
          amountIn: amount,
          status: 'pending',
          steps: [
            { key: 'deposit', label: `Deposit ${assetSymbol} on ${from.short}`, status: 'pending', chainId: fromId },
            { key: 'arrive', label: `${assetSymbol} arrives on ${to.short}`, status: 'pending', chainId: toId, note: '≈1–3 min after inclusion' },
          ],
        })
        setActiveId(item.id)
        await executeOpDeposit({
          fromChain: from,
          toChainId: toId,
          recipient: recipient as Address,
          mint: amountIn,
          wallet: sender,
          client,
          onStep: (step, state, hash) => {
            updateStep(item.id, step, { status: state === 'active' ? 'active' : state === 'done' ? 'done' : 'failed', hash })
            if (state === 'done') updateStep(item.id, 'arrive', { status: 'active', note: 'Waiting for the sequencer to include the deposit.' })
            finalizeFromSteps(item.id)
          },
        })
        notify('Deposit sent — it lands on the L2 in a minute or two.', 'success')
      } else {
        const { from: f, to: t } = assertCctpRoute(fromId, toId)
        const item = addActivity({
          kind: 'bridge',
          provider: 'cctp',
          fromChainId: fromId,
          toChainId: toId,
          owner: address,
          tokenIn: { symbol: 'USDC', address: f.usdc, decimals: 6 },
          tokenOut: { symbol: 'USDC', address: t.usdc, decimals: 6 },
          amountIn: amount,
          amountOut: fmt(receive, 6, 6),
          status: 'pending',
          meta: { fast, sourceDomain: f.cctpDomain!, destDomain: t.cctpDomain!, maxFee: maxFee.toString(), feeBps: bps },
          steps: [
            { key: 'approve', label: 'Approve USDC (exact amount)', status: 'pending', chainId: fromId },
            { key: 'burn', label: `Burn USDC on ${f.short}`, status: 'pending', chainId: fromId },
            { key: 'attestation', label: 'Circle attestation', status: 'pending', note: fast ? 'Fast transfer — soft finality' : 'Standard — hard finality' },
            { key: 'receive', label: `Mint on ${t.short}`, status: 'pending', chainId: toId, note: 'You sign receiveMessage after attestation.' },
          ],
        })
        setActiveId(item.id)

        await executeCctpBridge({
          fromChainId: fromId,
          toChainId: toId,
          amount: amountIn,
          fast,
          maxFee,
          recipient: recipient as Address,
          wallet: sender,
          client,
          onStep: (step, state, hash) => {
            updateStep(item.id, step, { status: state === 'active' ? 'active' : state === 'done' ? 'done' : 'failed', hash })
            finalizeFromSteps(item.id)
          },
        })
        updateStep(item.id, 'attestation', { status: 'active', note: 'Polling Circle Iris…' })
        startTracking(item.id, {
          onDone: (s) => {
            if (s === 'complete') notify('Attestation ready — finish the mint on the destination.', 'success')
          },
        })
        tokenBalance.refetch()
        notify('Burn confirmed. Circle is attesting the transfer.', 'success')
      }
    } catch (e) {
      const d = decodeTxError(e, chainId)
      setLastError(d)
      notify(`${d.title}: ${d.detail}`, 'error')
      if (activeId) {
        finalizeFromSteps(activeId)
      }
    } finally {
      setBusy(null)
    }
  }

  async function completeReceive() {
    if (!activity || !address) return
    const msg = activity.meta?.message as string | undefined
    const att = activity.meta?.attestation as string | undefined
    if (!msg || !att) return notify('Attestation not ready yet.', 'error')

    setBusy('receive')
    setLastError(null)
    const destChain = getChain(activity.toChainId)!
    try {
      await ensureChain(activity.toChainId)
      const client = getPublicClient(wagmiConfig, { chainId: activity.toChainId as never })!
      const wallet = await getWalletClient(wagmiConfig, { chainId: activity.toChainId as never })

      if (await isMessageUsed(client, msg as `0x${string}`)) {
        updateStep(activity.id, 'receive', { status: 'done', note: 'Already minted — nothing left to do.' })
        finalizeFromSteps(activity.id)
        notify('Already minted on the destination. Refreshing balance…', 'success')
        return
      }

      updateStep(activity.id, 'receive', { status: 'active', note: 'Simulating, then asking your wallet…' })
      const hash = await submitReceiveMessage({
        chain: destChain,
        account: address as Address,
        message: msg as `0x${string}`,
        attestation: att as `0x${string}`,
        wallet: walletSender(wallet),
        client,
      })
      updateStep(activity.id, 'receive', { status: 'done', hash })
      finalizeFromSteps(activity.id)
      notify(`USDC minted on ${destChain.short}.`, 'success')
    } catch (e) {
      const d = decodeTxError(e, activity.toChainId)
      setLastError(d)
      if (d.kind === 'revert' && /already/i.test(d.detail)) {
        updateStep(activity.id, 'receive', { status: 'done', note: 'Already minted.' })
      } else {
        updateStep(activity.id, 'receive', { status: 'failed', note: `${d.title} — ${d.detail}` })
      }
      finalizeFromSteps(activity.id)
      notify(`${d.title}: ${d.detail}`, 'error')
    } finally {
      setBusy(null)
    }
  }

  const routeLabel = isCctp ? 'Circle CCTP v2' : isOpRoute ? 'OP Stack deposit' : 'No verified route'

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bridge"
        subtitle="USDC moves with Circle CCTP v2. ETH moves with the chain's own OP Stack portal (Sepolia → Base/OP/Unichain/Ink/World/GIWA). A bridge burns on one chain and mints on the other — it is not a swap."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-4">
          <div className="relative">
            <div className="panel p-3">
              <div className="mb-1 flex items-center justify-between label">
                <span>From</span>
                <span className={balanceError ? 'text-[#e3c07b]' : ''}>
                  {!isConnected
                    ? '—'
                    : tokenBalance.isLoading
                      ? 'loading…'
                      : balanceError
                        ? 'balance unavailable'
                        : `${fmt(balance ?? 0n, assetDecimals, 5)} ${assetSymbol}`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <ChainChip chainId={fromId} onClick={() => setPick('from')} />
                <Badge>{assetSymbol}</Badge>
              </div>
            </div>

            <button
              onClick={() => {
                setFromId(toId)
                setToId(fromId)
              }}
              className="absolute left-1/2 top-1/2 z-10 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg border border-line bg-ink-800 text-t1 transition hover:border-line-strong hover:text-t1"
              title="Swap direction"
            >
              <ArrowDownUp size={14} />
            </button>

            <div className="panel mt-2 p-3">
              <div className="mb-1 label">To</div>
              <div className="flex items-center justify-between gap-2">
                <ChainChip chainId={toId} onClick={() => setPick('to')} />
                <span className="shrink-0 text-[10px] text-t3">{to.cctpDomain != null ? 'CCTP' : 'OP'}</span>
              </div>
            </div>
          </div>

          {available.length > 1 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {available.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setPicked(r)
                    setAmount('')
                  }}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    kind === r ? 'border-line-strong bg-ink-700' : 'border-line hover:bg-ink-700'
                  }`}
                >
                  <span
                    className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border"
                    style={{ borderColor: kind === r ? '#ededed' : '#3a3a3e' }}
                  >
                    {kind === r && <span className="h-2 w-2 rounded-full bg-[#ededed]" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-t1">
                      {r === 'cctp' ? 'USDC · CCTP' : `${from.viem.nativeCurrency.symbol} · OP Stack`}
                    </span>
                    <span className="block text-[11px] leading-4 text-t3">
                      {r === 'cctp' ? 'burn and mint, Circle attested' : 'canonical L1 to L2 deposit'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="panel mt-3 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="label">Amount</span>
              <button
                onClick={() => {
                  if (isOpRoute) {
                    const v = balance ?? 0n
                    const keep = v / 50n
                    setAmount(formatUnits(v > keep ? v - keep : 0n, 18))
                  } else if (balance != null) setAmount(formatUnits(balance, 6))
                }}
                className="rounded-md border border-line px-2 py-0.5 text-[11px] text-t1 transition-colors hover:border-line-strong"
              >
                {isOpRoute ? 'MAX − gas' : 'MAX'}
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
              <div className="flex items-center gap-1.5 rounded-lg border border-line bg-ink-850 px-2 py-1">
                {isOpRoute ? (
                  <ChainLogo chain={from} size={20} />
                ) : (
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-[#2775ca] text-[8px] font-bold text-white">USDC</span>
                )}
                <span className="text-sm font-medium text-t1">{assetSymbol}</span>
              </div>
            </div>
            {insufficient && <div className="mt-1 text-[11px] text-[#ffb4b6]">Amount exceeds your balance on {from.short}.</div>}
            {srcGas.data && !srcGas.data.ok && (
              <div className="mt-1 text-[11px] text-[#e3c07b]">
                No {srcGas.data.symbol} for gas on {from.short} — get some from the Faucets page.
              </div>
            )}
          </div>

          {isCctp && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setFast(true)} className={`panel p-3 text-left transition ${fast ? 'border-accent/50 bg-accent/8' : 'hover:bg-ink-700'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-t1">Fast</span>
                  <Badge tone={fast ? 'mint' : 'default'}>{fees.data ? pct(fees.data.fastBps, 2) : '—'}</Badge>
                </div>
                <div className="mt-0.5 text-[10px] leading-relaxed text-t3">Fee at mint · attested after soft finality</div>
              </button>
              <button onClick={() => setFast(false)} className={`panel p-3 text-left transition ${!fast ? 'border-accent/50 bg-accent/8' : 'hover:bg-ink-700'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-t1">Standard</span>
                  <Badge tone={!fast ? 'mint' : 'default'}>{fees.data ? pct(fees.data.standardBps, 2) : '—'}</Badge>
                </div>
                <div className="mt-0.5 text-[10px] leading-relaxed text-t3">No protocol fee · waits for hard finality</div>
              </button>
            </div>
          )}

          <div className="panel mt-3 p-3">
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
            <Button full size="lg" variant="primary" className="mt-4" disabled={kind === 'none' || amountIn <= 0n || insufficient} loading={busy === 'start'} onClick={runBridge}>
              {kind === 'none' ? 'No verified route for this pair' : `Bridge ${assetSymbol}`}
            </Button>
          )}

          {chainId !== fromId && isConnected && (
            <button onClick={() => ensureChain(fromId)} className="mt-2 w-full text-center text-[11px] text-[#e3c07b] hover:underline">
              Wallet is on {getChain(chainId)?.short ?? chainId} — switching to {from.short} is needed to sign.
            </button>
          )}
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Route</h3>
              <Badge tone={kind === 'none' ? 'red' : 'mint'}>{routeLabel}</Badge>
            </div>
            <Row label="Provider" value={isCctp ? 'Circle CCTP v2' : isOpRoute ? 'OP Stack (canonical portal)' : '—'} />
            <Row label="Asset" value={isCctp ? 'USDC (native)' : isOpRoute ? `${assetSymbol} (native)` : '—'} />
            {isCctp && (
              <>
                <Row label="Protocol fee" value={fees.isLoading ? '…' : fees.error ? 'fee API error' : `${fmt(maxFee, 6, 6)} USDC max`} />
                <Row label="You receive" value={amountIn > 0n ? `${fmt(receive, 6, 6)} USDC` : '—'} />
              </>
            )}
            {isOpRoute && <Row label="You receive" value={amountIn > 0n ? `${fmt(amountIn, 18, 6)} ${assetSymbol} on ${to.short}` : '—'} />}
            <Row label="ETA" value={isCctp ? (fast ? '~15s–2 min attest + dest tx' : '~13–19 min (hard finality)') : '≈1–3 min after L1 inclusion'} />
            <Row label="Source" value={<span className="mono">{from.short} · {fromId}</span>} />
            <Row label="Destination" value={<span className="mono">{to.short} · {toId}</span>} />
            {isCctp && isConnected && (
              <Row
                label={`Gas on ${to.short}`}
                value={dstGas.isLoading ? '…' : dstGas.data?.ok ? 'ok' : <span className="text-[#e3c07b]">no {dstGas.data?.symbol}</span>}
                hint="The mint is a transaction on the destination chain and needs gas there"
              />
            )}
          </Card>

          {lastError && (
            <Card className="border-[#e5484d]/30 p-4">
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
                <h3 className="text-sm font-semibold text-white">Progress</h3>
                <Badge tone={activity.status === 'complete' ? 'mint' : activity.status === 'failed' ? 'red' : 'amber'}>{activity.status}</Badge>
              </div>
              <Timeline steps={activity.steps} />
              {activity.meta?.message && activity.steps.find((s) => s.key === 'receive')?.status !== 'done' && (
                <Button full className="mt-3" loading={busy === 'receive'} onClick={completeReceive}>
                  {activity.steps.find((s) => s.key === 'receive')?.status === 'failed' ? 'Retry mint on' : 'Sign receiveMessage on'} {to.short}
                </Button>
              )}
              {activity.steps.find((s) => s.key === 'receive')?.status === 'failed' && (
                <p className="mt-2 text-[10px] leading-relaxed text-t3">
                  Your USDC is already burned — retrying never burns again, it only repeats the mint.
                </p>
              )}
              <Link to={`/activity/${activity.id}`} className="mt-2 block text-center text-[11px] text-t2 hover:text-accent">
                open full record →
              </Link>
            </Card>
          )}

          <Card className="p-4">
            <div className="flex items-start gap-2 text-[11px] leading-relaxed text-t2">
              <Info size={14} className="mt-0.5 shrink-0 text-accent" />
              <div className="space-y-1.5">
                <p>
                  <span className="font-semibold text-t1">CCTP</span> moves native USDC only — it cannot move ETH or arbitrary
                  ERC-20s.
                </p>
                <p>
                  <span className="font-semibold text-t1">ETH</span> reaches Base/OP/Unichain/Ink/World/GIWA through their own OP
                  Stack portal. Deposits take ~1–3 min; withdrawals need a 7-day challenge window and are not offered.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ChainSelect
        open={pick !== null}
        onClose={() => setPick(null)}
        chains={CHAINS}
        value={pick === 'from' ? fromId : toId}
        onSelect={(id) => (pick === 'from' ? setFromId(id) : setToId(id))}
        title={pick === 'from' ? 'Source network' : 'Destination network'}
        subtitle="Only testnets on the allowlist are listed."
      />
    </div>
  )
}
