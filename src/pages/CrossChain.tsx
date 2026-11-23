import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Info, Layers, Wallet } from 'lucide-react'
import { formatUnits } from 'viem'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { getPublicClient, getWalletClient } from 'wagmi/actions'
import { CCTP_CHAINS, getChain, type Address } from '../config/chains'
import { SWAP_CHAINS } from '../config/chains'
import { USDC_OF, tokensForChain, type TokenCfg } from '../config/tokens'
import { Card, Button, Badge, Row, notify, TokenIcon, ChainLogo, Spinner } from '../components/ui'
import { ChainChip, ChainSelect } from '../components/ChainSelect'
import { TokenSelect } from '../components/TokenSelect'
import { PageHeader } from '../components/Layout'
import { Timeline } from '../components/Timeline'
import { addActivity, updateStep, updateActivity, finalizeFromSteps, getActivity } from '../lib/activity'
import { fetchCctpFees, maxFeeFor, cctpRouteAvailable } from '../lib/cctp'
import { quoteBest, applySlippage, formatAmount, erc20Abi } from '../lib/uniswap'
import { executeCctpBridge, submitReceiveMessage } from '../lib/bridgeExec'
import { executeSwap } from '../lib/swapExec'
import { startTracking } from '../lib/tracker'
import { describeBlock, assertCctpRoute } from '../lib/guard'
import { fmt, safeParseUnits, pct } from '../lib/format'
import { wagmiConfig } from '../lib/wallet'
import { walletSender } from '../lib/tx'

const USDC_DECIMALS = 6

export default function CrossChain() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()

  const [fromId, setFromId] = useState(11155111)
  const [toId, setToId] = useState(84532)
  const [target, setTarget] = useState<TokenCfg | null>(null)
  const [amount, setAmount] = useState('')
  const [slippageBps, setSlippageBps] = useState(100)
  const [pick, setPick] = useState<'from' | 'to' | 'target' | null>(null)
  const [busy, setBusy] = useState(false)
  const [activeId, setActiveId] = useState<string | undefined>()

  const from = getChain(fromId)!
  const to = getChain(toId)!
  const routeOk = cctpRouteAvailable(fromId, toId)
  const destSwapOk = Boolean(to.uniswap)
  const destTokens = useMemo(
    () => tokensForChain(toId).filter((t) => t.symbol !== 'USDC'),
    [toId],
  )
  const chosenTarget = target ?? destTokens[0] ?? null
  const amountIn = safeParseUnits(amount, USDC_DECIMALS)

  const fees = useQuery({
    queryKey: ['cctp-fees', from.cctpDomain, to.cctpDomain],
    queryFn: () => fetchCctpFees(from.cctpDomain!, to.cctpDomain!),
    enabled: routeOk,
    staleTime: 45_000,
    retry: 2,
  })

  const usdcIn = USDC_OF(fromId)
  const destClient = useMemo(() => getPublicClient(wagmiConfig, { chainId: toId as never }), [toId])

  const maxFee = maxFeeFor(amountIn, fees.data?.fastBps ?? 0)
  const arriving = amountIn > maxFee ? amountIn - maxFee : 0n
  const targetWrapped = chosenTarget && chosenTarget.symbol === 'WETH' ? chosenTarget : chosenTarget

  const destQuote = useQuery({
    queryKey: ['xc-dest-quote', toId, arriving.toString(), chosenTarget?.address],
    queryFn: async () => {
      if (!destClient || !to.uniswap || !USDC_OF(toId) || !arriving) return null
      return quoteBest(destClient, to, USDC_OF(toId)!.address, targetWrapped!.address, arriving)
    },
    enabled: Boolean(destClient && to.uniswap && arriving > 0n && chosenTarget),
    staleTime: 10_000,
    retry: 0,
  })

  const activity = activeId ? getActivity(activeId) : undefined
  const nextStep = activity?.steps.find((s) => s.status === 'pending' || s.status === 'active')
  const attestationReady = Boolean(activity?.meta?.message)

  async function ensureChain(id: number) {
    if (chainId !== id) await switchChainAsync({ chainId: id as never })
  }

  async function start() {
    if (!address) return notify('Connect a wallet first.', 'error')
    if (!routeOk) return notify('CCTP is not available for this pair.', 'error')
    if (!destSwapOk || !chosenTarget) return notify(`${to.short} has no verified swap venue for the destination leg.`, 'error')
    if (amountIn <= 0n) return notify('Enter an amount.', 'error')

    const item = addActivity({
      kind: 'bridge',
      provider: 'cctp',
      fromChainId: fromId,
      toChainId: toId,
      owner: address,
      tokenIn: { symbol: 'USDC', address: usdcIn?.address, decimals: 6 },
      tokenOut: { symbol: chosenTarget.symbol, address: chosenTarget.address, decimals: chosenTarget.decimals },
      amountIn: amount,
      status: 'draft',
      meta: {
        composite: true,
        fast: true,
        sourceDomain: from.cctpDomain!,
        destDomain: to.cctpDomain!,
        maxFee: maxFee.toString(),
        targetToken: chosenTarget.address,
        targetSymbol: chosenTarget.symbol,
        targetDecimals: chosenTarget.decimals,
        slippageBps,
        feeTier: destQuote.data?.fee ?? 0,
      },
      steps: [
        { key: 'approve', label: 'Approve USDC for CCTP', status: 'pending', chainId: fromId },
        { key: 'burn', label: `Burn USDC on ${from.short}`, status: 'pending', chainId: fromId },
        { key: 'attestation', label: 'Circle attestation', status: 'pending', note: 'Fast transfer' },
        { key: 'receive', label: `Mint USDC on ${to.short}`, status: 'pending', chainId: toId },
        { key: 'approveDst', label: `Approve USDC for the swap on ${to.short}`, status: 'pending', chainId: toId },
        { key: 'swapDst', label: `Swap USDC → ${chosenTarget.symbol} on ${to.short}`, status: 'pending', chainId: toId },
      ],
    })
    setActiveId(item.id)
    notify('Plan created. Execute the steps in order, you sign each one.', 'success')
  }

  async function runNext() {
    if (!activity || !address || !nextStep) return
    setBusy(true)
    const meta = activity.meta ?? {}
    try {
      if (nextStep.key === 'approve' || nextStep.key === 'burn') {
        await ensureChain(activity.fromChainId)
        const client = getPublicClient(wagmiConfig, { chainId: activity.fromChainId as never })!
        const wallet = await getWalletClient(wagmiConfig, { chainId: activity.fromChainId as never })
        await executeCctpBridge({
          fromChainId: activity.fromChainId,
          toChainId: activity.toChainId,
          amount: safeParseUnits(activity.amountIn, 6),
          fast: true,
          maxFee: BigInt(String(meta.maxFee ?? '0')),
          recipient: address as Address,
          wallet: walletSender(wallet),
          client,
          onStep: (step, state, hash) => {
            updateStep(activity.id, step, { status: state === 'active' ? 'active' : state === 'done' ? 'done' : 'failed', hash })
            finalizeFromSteps(activity.id)
          },
        })
        updateStep(activity.id, 'attestation', { status: 'active', note: 'Polling Circle Iris…' })
        startTracking(activity.id)
      } else if (nextStep.key === 'receive') {
        const msg = meta.message as string | undefined
        const att = meta.attestation as string | undefined
        if (!msg || !att) return notify('Attestation is still pending.', 'error')
        await ensureChain(activity.toChainId)
        const client = getPublicClient(wagmiConfig, { chainId: activity.toChainId as never })!
        const wallet = await getWalletClient(wagmiConfig, { chainId: activity.toChainId as never })
        updateStep(activity.id, 'receive', { status: 'active' })
        const hash = await submitReceiveMessage({
          chain: getChain(activity.toChainId)!,
          account: address as Address,
          message: msg as `0x${string}`,
          attestation: att as `0x${string}`,
          wallet: walletSender(wallet),
          client,
        })
        updateStep(activity.id, 'receive', { status: 'done', hash })
        finalizeFromSteps(activity.id)
      } else if (nextStep.key === 'approveDst' || nextStep.key === 'swapDst') {
        await ensureChain(activity.toChainId)
        const dest = getChain(activity.toChainId)!
        const client = getPublicClient(wagmiConfig, { chainId: activity.toChainId as never })!
        const wallet = await getWalletClient(wagmiConfig, { chainId: activity.toChainId as never })
        const usdc = USDC_OF(activity.toChainId)!
        const targetToken = tokensForChain(activity.toChainId).find((t) => t.address === meta.targetToken)
        if (!targetToken) throw new Error('Destination token is no longer in the registry.')

        const fresh = await quoteBest(client, dest, usdc.address, targetToken.address, arriving > 0n ? arriving : safeParseUnits(activity.amountIn, 6))
        if (!fresh) throw new Error(`No pool currently offers USDC → ${targetToken.symbol} on ${dest.short}.`)

        const outMin = applySlippage(fresh.amountOut, Number(meta.slippageBps ?? 100))
        await executeSwap({
          chain: dest,
          account: address as Address,
          tokenIn: { address: usdc.address, symbol: 'USDC', decimals: 6 },
          tokenOut: { address: targetToken.address, symbol: targetToken.symbol, decimals: targetToken.decimals },
          amountIn: arriving > 0n ? arriving : safeRequiredAmount(activity.amountIn),
          amountOutMinimum: outMin,
          fee: fresh.fee,
          wallet: walletSender(wallet),
          publicClient: client,
          onStep: (step, state, hash) => {
            const key = step === 'approve' ? 'approveDst' : 'swapDst'
            updateStep(activity.id, key, { status: state === 'active' ? 'active' : state === 'done' ? 'done' : 'failed', hash })
            finalizeFromSteps(activity.id)
          },
        })
        updateActivity(activity.id, { amountOut: formatAmount(fresh.amountOut, targetToken.decimals) })
      }
    } catch (e) {
      notify(describeBlock((e as Error).message), 'error')
      if (nextStep) updateStep(activity.id, nextStep.key, { status: 'failed' })
      finalizeFromSteps(activity.id)
    } finally {
      setBusy(false)
    }
  }

  function safeRequiredAmount(v: string) {
    const a = safeParseUnits(v, 6)
    return a > maxFee ? a - maxFee : a
  }

  const stepLabel: Record<string, string> = {
    approve: 'Approve USDC & burn',
    burn: 'Burn USDC',
    attestation: 'Waiting for attestation',
    receive: 'Mint USDC on destination',
    approveDst: 'Approve USDC for swap',
    swapDst: `Swap to ${chosenTarget?.symbol ?? 'token'}`,
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cross-chain swap"
        subtitle="Pay USDC on one testnet, receive another token on another. It runs as two verified hops: CCTP burns/mints your USDC, then Uniswap swaps it on the destination. You sign each hop, so you always see what is happening."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="panel p-3">
              <div className="mb-1 label">Pay with · USDC on</div>
              <ChainChip chainId={fromId} onClick={() => setPick('from')} />
            </div>
            <div className="panel p-3">
              <div className="mb-1 label">Receive on</div>
              <ChainChip chainId={toId} onClick={() => setPick('to')} />
            </div>
          </div>

          <div className="panel mt-2 p-3">
            <div className="mb-1 flex items-center justify-between label">
              <span>Amount (USDC)</span>
              {!routeOk && <span className="text-[#ffb4b6]">no CCTP route</span>}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0.0"
                inputMode="decimal"
                className="input text-2xl font-semibold"
              />
              <div className="flex items-center gap-1.5 rounded-lg border border-line bg-ink-850 px-2 py-1">
                <TokenIcon symbol="USDC" color="#2775ca" size={20} />
                <span className="text-sm font-medium text-t1">USDC</span>
              </div>
            </div>
          </div>

          <div className="panel mt-2 flex items-center justify-between p-3">
            <div>
              <div className="mb-1 label">Receive as</div>
              <button
                onClick={() => setPick('target')}
                className="flex items-center gap-2 rounded-lg border border-line bg-ink-850 px-2 py-1.5 hover:bg-ink-700"
              >
                {chosenTarget ? <TokenIcon symbol={chosenTarget.symbol} color={chosenTarget.color} size={20} /> : <Layers size={18} />}
                <span className="text-sm font-medium text-t1">{chosenTarget?.symbol ?? 'no venue'}</span>
              </button>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-t3">estimated out</div>
              <div className="mono text-sm text-t1">
                {destQuote.data && chosenTarget ? `${formatAmount(destQuote.data.amountOut, chosenTarget.decimals, 6)}` : '-'}
              </div>
            </div>
          </div>

          {!destSwapOk && (
            <div className="mt-2 rounded-lg border border-[#e3c07b]/25 bg-[#e3c07b]/8 px-3 py-2 text-[11px] leading-relaxed text-[#e3c07b]">
              {to.short} has no verified Uniswap v3 deployment, so a cross-chain *swap* cannot complete there. You can still bridge
              USDC to it from the Bridge page.
            </div>
          )}

          {!activity ? (
            <Button full size="lg" className="mt-3" disabled={!isConnected || !routeOk || !destSwapOk} onClick={start}>
              {!isConnected ? (
                <>
                  <Wallet size={16} /> Connect a wallet
                </>
              ) : (
                <>
                  Build route plan <ArrowRight size={15} />
                </>
              )}
            </Button>
          ) : (
            <div className="mt-3">
              <Button full size="lg" onClick={runNext} loading={busy} disabled={!nextStep}>
                {!nextStep ? 'All steps complete' : `${stepLabel[nextStep.key] ?? nextStep.label}`}
              </Button>
              {nextStep?.key === 'attestation' && !attestationReady && (
                <div className="mt-2 flex items-center gap-2 text-[11px] text-t3">
                  <Spinner size={12} /> Circle is attesting, this page polls automatically.
                </div>
              )}
            </div>
          )}
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold text-white">Route economics</h3>
            <Row label="Hop 1" value={`USDC · ${from.short} → ${to.short} (CCTP)`} />
            <Row label="Hop 2" value={chosenTarget ? `USDC → ${chosenTarget.symbol} on ${to.short}` : '-'} />
            <Row label="CCTP max fee" value={fees.data ? `${fmt(maxFee, 6, 6)} USDC` : fees.isLoading ? '…' : '-'} />
            <Row label="USDC arriving" value={arriving > 0n ? `${fmt(arriving, 6, 6)}` : '-'} />
            <Row label="Dest pool" value={destQuote.data ? `${destQuote.data.fee / 10000}% · impact ${pct(destQuote.data.priceImpactBps, 2)}` : destQuote.isFetching ? '…' : 'no quote'} />
            <Row label="Slippage" value={pct(slippageBps, 2)} />
            <Row label="Signatures" value={activity ? '4–5 wallet approvals' : '4–5 wallet approvals'} />
          </Card>

          {activity && (
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Plan progress</h3>
                <Badge tone={activity.status === 'complete' ? 'mint' : activity.status === 'failed' ? 'red' : 'amber'}>{activity.status}</Badge>
              </div>
              <Timeline steps={activity.steps} />
            </Card>
          )}

          <Card className="p-4">
            <h3 className="mb-1.5 text-sm font-semibold text-white">Bridge vs swap vs cross-chain</h3>
            <div className="space-y-1.5 text-[11px] leading-relaxed text-t2">
              <p><span className="text-t1">Bridge</span>, same asset, different chain (USDC → USDC). No price risk while it moves.</p>
              <p><span className="text-t1">Swap</span>, different asset, same chain (ETH → USDC). One pool, one transaction.</p>
              <p><span className="text-t1">Cross-chain swap</span>, different asset, different chain. Two hops, 4–5 signatures.</p>
              <p className="text-[#e3c07b]/90">
                No verified provider does an atomic testnet cross-chain swap, so this is a real composition, never packaged as one
                transaction.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <ChainSelect open={pick === 'from' || pick === 'to'} onClose={() => setPick(null)} chains={CCTP_CHAINS} value={pick === 'from' ? fromId : toId} onSelect={(id) => (pick === 'from' ? setFromId(id) : setToId(id))} title={pick === 'from' ? 'Source chain' : 'Destination chain'} />
      <TokenSelect
        open={pick === 'target'}
        onClose={() => setPick(null)}
        tokens={destTokens}
        value={chosenTarget?.address}
        chainName={to.name}
        chainId={toId}
        onSelect={(t) => setTarget(t)}
        allowImport={false}
      />
    </div>
  )
}
