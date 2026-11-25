import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownUp, ChevronDown, Info, Settings2, Wallet } from 'lucide-react'
import { formatUnits } from 'viem'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { getPublicClient, getWalletClient } from 'wagmi/actions'
import { SWAP_CHAINS, getChain, explorerTx, type Address } from '../config/chains'
import {
  NATIVE_SENTINEL,
  TOKENS,
  WETH,
  isNativeToken,
  nativeToken,
  tokensForChain,
  type TokenCfg,
} from '../config/tokens'
import { Card, Button, Badge, Row, notify, TokenIcon, Modal, Spinner, ChainLogo } from '../components/ui'
import { ConnectButton } from '../components/Layout'
import { ChainChip, ChainSelect } from '../components/ChainSelect'
import { TokenPicker } from '../components/TokenPicker'
import { addActivity, updateStep, finalizeFromSteps, getActivity, updateActivity } from '../lib/activity'
import { quoteBest, maxFillable, applySlippage, erc20Balance, formatAmount, erc20Abi } from '../lib/uniswap'
import { executeSwap, buildSwapCalldata } from '../lib/swapExec'
import { assertSwapRoute } from '../lib/guard'
import { decodeTxError } from '../lib/errors'
import { fmt, safeParseUnits, pct } from '../lib/format'
import { pairsForChain, poolsForChain } from '../config/pools'
import { wagmiConfig } from '../lib/wallet'
import { walletSender } from '../lib/tx'

const SLIPPAGE_PRESETS = [10, 50, 100]

export default function Swap() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()

  const supportedSwap = useMemo(() => new Set(SWAP_CHAINS.map((c) => c.id)), [])
  /**
   * Swap has no network selector by design: it always runs on the wallet's own chain.
   * Disconnected, it previews Sepolia so the panel is not empty.
   */
  /** every swap-capable chain with the tokens that actually have a pool there */
  const swapGroups = useMemo(
    () =>
      SWAP_CHAINS.map((c) => {
        const addrs = new Set<string>()
        for (const pool of poolsForChain(c.id)) {
          addrs.add(pool.token0.toLowerCase())
          addrs.add(pool.token1.toLowerCase())
        }
        const tokens = tokensForChain(c.id).filter((t) => addrs.has(t.address.toLowerCase()))
        return { chain: c, tokens }
      }).filter((g) => g.tokens.length > 0),
    [],
  )

  const chainSupported = !isConnected || supportedSwap.has(chainId)
  // preview chain, used when there is no wallet to switch; the picker is the only place a
  // network is chosen on this page
  const [previewChain, setPreviewChain] = useState(11155111)
  const swapChainId = isConnected && supportedSwap.has(chainId) ? chainId : previewChain
  const [sellFocus, setSellFocus] = useState(false)
  const [tokenIn, setTokenIn] = useState<TokenCfg>(() => tokensForChain(11155111)[0])
  const [tokenOut, setTokenOut] = useState<TokenCfg>(() => tokensForChain(11155111)[1])
  const [amount, setAmount] = useState('')
  const [slippageBps, setSlippageBps] = useState(50)
  const [showSlip, setShowSlip] = useState(false)
  const [pick, setPick] = useState<'in' | 'out' | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | undefined>()
  const [debounced, setDebounced] = useState('')

  const chain = getChain(swapChainId)!

  useEffect(() => {
    const t = setTimeout(() => setDebounced(amount), 350)
    return () => clearTimeout(t)
  }, [amount])

  useEffect(() => {
    const c = getChain(swapChainId)!
    const list = tokensForChain(swapChainId)
    const native = nativeToken(swapChainId)
    const first = c.nativeIsUsdc ? list[0] : native
    const second = list.find((x) => x.address !== first?.address) ?? native
    setTokenIn(first)
    setTokenOut(second)
    setAmount('')
  }, [swapChainId])

  // On Arc the native gas token IS USDC (18 dp) and the same money has a 6-dp ERC-20 view.
  // Offering both would let a user pick the same asset twice, so native is hidden there.
  const selectable: TokenCfg[] = useMemo(() => {
    const list = tokensForChain(swapChainId)
    return chain.nativeIsUsdc ? list : [nativeToken(swapChainId), ...list]
  }, [swapChainId, chain.nativeIsUsdc])

  /**
   * Only tokens that appear in a verified pool on this chain are offered, and the
   * buy list is further narrowed to tokens actually paired with the selected sell
   * token. A pair with no pool would quote zero and fail at signing, so it is not
   * shown instead of being shown and rejected.
   */
  const poolKey = (t: TokenCfg) =>
    (isNativeToken(t) ? (WETH[swapChainId] ?? '').toLowerCase() : t.address.toLowerCase())

  const tradeable: TokenCfg[] = useMemo(() => {
    const addrs = new Set<string>()
    for (const pool of poolsForChain(swapChainId)) {
      addrs.add(pool.token0.toLowerCase())
      addrs.add(pool.token1.toLowerCase())
    }
    const kept = selectable.filter((t) => addrs.has(poolKey(t)))
    return kept.length >= 2 ? kept : selectable
  }, [selectable, swapChainId])

  const outOptions: TokenCfg[] = useMemo(() => {
    const inKey = poolKey(tokenIn)
    const paired = new Set<string>()
    for (const pair of pairsForChain(swapChainId)) {
      if (pair.token0.toLowerCase() === inKey) paired.add(pair.token1.toLowerCase())
      if (pair.token1.toLowerCase() === inKey) paired.add(pair.token0.toLowerCase())
    }
    const kept = tradeable.filter((t) => t.address !== tokenIn.address && paired.has(poolKey(t)))
    return kept.length > 0 ? kept : tradeable.filter((t) => t.address !== tokenIn.address)
  }, [tradeable, tokenIn, swapChainId])
  const amountIn = safeParseUnits(debounced, tokenIn.decimals)
  const sameToken = tokenIn.address === tokenOut.address

  const publicClient = useMemo(() => getPublicClient(wagmiConfig, { chainId: swapChainId as never }), [swapChainId])

  const quote = useQuery({
    queryKey: ['swap-quote', swapChainId, tokenIn.address, tokenOut.address, amountIn.toString()],
    queryFn: async () => {
      if (!publicClient || !chain.uniswap) return null
      const inAddr = (isNativeToken(tokenIn) ? undefined : tokenIn.address) as Address | undefined
      const outAddr = (isNativeToken(tokenOut) ? undefined : tokenOut.address) as Address | undefined
      // native legs are quoted against WETH then wrapped at execution
      const qIn = inAddr ?? (WETH[swapChainId] as Address)
      const qOut = outAddr ?? (WETH[swapChainId] as Address)
      return quoteBest(publicClient, chain, qIn, qOut, amountIn)
    },
    enabled: Boolean(publicClient && chain.uniswap && amountIn > 0n && !sameToken),
    staleTime: 8000,
    refetchInterval: 15_000,
    retry: 0,
  })

  const depth = useQuery({
    queryKey: ['depth', swapChainId, tokenIn.address, tokenOut.address, amountIn.toString()],
    queryFn: async () => {
      if (!publicClient || !chain.uniswap) return null
      const inAddr = (isNativeToken(tokenIn) ? WETH[swapChainId] : tokenIn.address) as Address
      const outAddr = (isNativeToken(tokenOut) ? WETH[swapChainId] : tokenOut.address) as Address
      const ceiling = amountIn > 0n ? amountIn : 10n ** BigInt(tokenIn.decimals)
      return maxFillable(publicClient, chain, inAddr, outAddr, ceiling)
    },
    enabled: Boolean(publicClient && chain.uniswap && amountIn > 0n && !sameToken && !quote.isFetching && !quote.data),
    staleTime: 15_000,
    retry: 0,
  })

  const balanceIn = useQuery({
    queryKey: ['bal', swapChainId, tokenIn.address, address],
    queryFn: async () => {
      if (!publicClient || !address) return 0n
      if (isNativeToken(tokenIn)) return publicClient.getBalance({ address: address as Address })
      return erc20Balance(publicClient, tokenIn.address, address as Address)
    },
    enabled: Boolean(publicClient && address),
    refetchInterval: 20_000,
  })

  const allowance = useQuery({
    queryKey: ['allow', swapChainId, tokenIn.address, address],
    queryFn: async () => {
      if (!publicClient || !address || isNativeToken(tokenIn) || !chain.uniswap) return 0n
      return (await publicClient.readContract({
        address: tokenIn.address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address as Address, chain.uniswap.router02],
      })) as bigint
    },
    enabled: Boolean(publicClient && address && !isNativeToken(tokenIn) && chain.uniswap),
  })

  const activity = activeId ? getActivity(activeId) : undefined
  const needsApproval = !isNativeToken(tokenIn) && (allowance.data ?? 0n) < amountIn
  const out = quote.data?.amountOut ?? 0n
  const minOut = applySlippage(out, slippageBps)
  const insufficient = isConnected && amountIn > 0n && (balanceIn.data ?? 0n) < amountIn
  const rate = amountIn > 0n && out > 0n ? Number(formatUnits(out, tokenOut.decimals)) / Number(formatUnits(amountIn, tokenIn.decimals)) : 0

  function flip() {
    setTokenIn(tokenOut)
    setTokenOut(tokenIn)
    setAmount('')
  }

  async function ensureChain(id: number) {
    if (chainId !== id) await switchChainAsync({ chainId: id as never })
  }

  async function runSwap() {
    if (!address) return notify('Connect a wallet first.', 'error')
    if (!quote.data) return notify('No executable quote yet.', 'error')
    if (insufficient) return notify('Insufficient balance.', 'error')

    setBusy('start')
    try {
      await ensureChain(swapChainId)
      const c = assertSwapRoute(swapChainId)
      const client = getPublicClient(wagmiConfig, { chainId: swapChainId as never })!
      const wallet = await getWalletClient(wagmiConfig, { chainId: swapChainId as never })

      const item = addActivity({
        kind: 'swap',
        provider: 'uniswap',
        fromChainId: swapChainId,
        toChainId: swapChainId,
        owner: address,
        tokenIn: { symbol: tokenIn.symbol, address: tokenIn.address, decimals: tokenIn.decimals },
        tokenOut: { symbol: tokenOut.symbol, address: tokenOut.address, decimals: tokenOut.decimals },
        amountIn: debounced,
        amountOut: formatAmount(out, tokenOut.decimals),
        status: 'pending',
        meta: { feeTier: quote.data.fee, slippageBps, minOut: minOut.toString(), priceImpactBps: quote.data.priceImpactBps ?? '' },
        steps: [
          { key: 'approve', label: `Approve ${tokenIn.symbol}`, status: 'pending', chainId: swapChainId },
          { key: 'swap', label: `Swap ${tokenIn.symbol} → ${tokenOut.symbol}`, status: 'pending', chainId: swapChainId },
        ],
      })
      setActiveId(item.id)

      await executeSwap({
        chain: c,
        account: address as Address,
        tokenIn: { address: isNativeToken(tokenIn) ? null : tokenIn.address, symbol: tokenIn.symbol, decimals: tokenIn.decimals },
        tokenOut: { address: isNativeToken(tokenOut) ? null : tokenOut.address, symbol: tokenOut.symbol, decimals: tokenOut.decimals },
        amountIn,
        amountOutMinimum: minOut,
        fee: quote.data.fee,
        wallet: walletSender(wallet),
        publicClient: client as never,
        onStep: (step, state, hash) => {
          updateStep(item.id, step, { status: state === 'active' ? 'active' : state === 'done' ? 'done' : 'failed', hash })
          finalizeFromSteps(item.id)
        },
      })
      notify('Swap confirmed on-chain.', 'success')
      balanceIn.refetch()
      allowance.refetch()
      quote.refetch()
    } catch (e) {
      const d = decodeTxError(e, swapChainId)
      notify(`${d.title}: ${d.detail}`, 'error')
      if (activeId) {
        if (d.kind === 'rejected') updateActivity(activeId, { status: 'cancelled', error: 'Rejected in wallet' })
        else finalizeFromSteps(activeId)
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">

      <div className="mx-auto w-full max-w-[560px] space-y-4">
        {!chainSupported && (
          <Card className="border-warn/40 p-4 lg:col-span-2">
            <div className="text-[14px] font-semibold text-t1">
              Swaps run on {SWAP_CHAINS.map((c) => c.short).join(', ')}.
            </div>
            <p className="mt-1 text-[13px] leading-5 text-t2">
              Your wallet is on {getChain(chainId)?.short ?? chainId}, which has no verified Uniswap v3 pool. Switch to one of
              the chains below to swap.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SWAP_CHAINS.map((c) => (
                <Button
                  key={c.id}
                  size="sm"
                  variant="secondary"
                  onClick={() => switchChainAsync({ chainId: c.id as never }).catch(() => undefined)}
                >
                  <ChainLogo chain={c} size={15} /> {c.short}
                </Button>
              ))}
            </div>
          </Card>
        )}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-end">
            <button onClick={() => setShowSlip(true)} className="chip chip-accent hover:border-accent">
              <Settings2 size={11} /> {pct(slippageBps, 2)}
            </button>
          </div>

          <div className="relative">
            <div className="rounded-[14px] border border-line-strong bg-ink-850 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="col-head">Sell</span>
                <div className="flex items-center gap-2">
                  <div
                    style={{ display: sellFocus ? 'flex' : 'none' }}
                    className="items-center gap-1.5"
                  >
                    {[25, 50, 75].map((pct) => (
                      <button
                        key={pct}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (!address || balanceIn.data == null) return
                          const raw = (balanceIn.data * BigInt(pct)) / 100n
                          const keep = isNativeToken(tokenIn) ? balanceIn.data / 50n : 0n
                          setAmount(formatUnits(raw > keep ? raw - keep : 0n, tokenIn.decimals))
                        }}
                        className="mono rounded border border-line px-1.5 py-[2px] text-[10px] leading-none text-t3 transition-colors hover:border-line-strong hover:text-t1"
                      >
                        {pct}%
                      </button>
                    ))}
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (!address || balanceIn.data == null) return
                        const keep = isNativeToken(tokenIn) ? balanceIn.data / 50n : 0n
                        setAmount(formatUnits(balanceIn.data > keep ? balanceIn.data - keep : 0n, tokenIn.decimals))
                      }}
                      className="mono rounded border border-line px-1.5 py-[2px] text-[10px] leading-none text-t2 transition-colors hover:border-accent/50 hover:text-accent"
                    >
                      MAX
                    </button>
                  </div>
                  <span className="mono text-[12px] text-t2">
                    {balanceIn.data != null ? fmt(balanceIn.data, tokenIn.decimals, 5) : '—'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  onFocus={() => setSellFocus(true)}
                  onBlur={() => window.setTimeout(() => setSellFocus(false), 150)}
                  placeholder="0.0"
                  inputMode="decimal"
                  className="input display text-[40px] leading-[48px] tracking-[-0.02em]"
                />
                <button
                  onClick={() => setPick('in')}
                  className="flex h-12 shrink-0 items-center gap-2 rounded-full border border-line-strong bg-ink-700 pl-1.5 pr-3 transition-colors hover:border-accent/50 hover:bg-ink-600"
                >
                  <TokenIcon
                    symbol={tokenIn.symbol}
                    size={30}
                    chainId={swapChainId}
                    address={isNativeToken(tokenIn) ? null : tokenIn.address}
                    verified={tokenIn.verified}
                  />
                  <span className="display text-[15px] text-t1">{tokenIn.symbol}</span>
                  <ChevronDown size={15} className="text-t2" />
                </button>
              </div>
            </div>

            <button
              onClick={flip}
              className="absolute left-1/2 top-1/2 z-10 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line-strong bg-ink-800 text-t1 transition-all duration-150 hover:scale-110 hover:border-accent/60 hover:text-accent"
              aria-label="Flip direction"
            >
              <ArrowDownUp size={15} />
            </button>

            <div className="mt-2 rounded-[14px] border border-line-strong bg-ink-850 p-4">
              <div className="mb-2 col-head">Buy</div>
              <div className="flex items-center gap-3">
                <div className="input display flex-1 truncate text-[40px] leading-[48px] tracking-[-0.02em] text-t1">
                  {quote.isFetching ? <Spinner size={20} /> : out > 0n ? formatAmount(out, tokenOut.decimals, 6) : <span className="text-t3">0.0</span>}
                </div>
                <button
                  onClick={() => setPick('out')}
                  className="flex h-12 shrink-0 items-center gap-2 rounded-full border border-line-strong bg-ink-700 pl-1.5 pr-3 transition-colors hover:border-accent/50 hover:bg-ink-600"
                >
                  <TokenIcon
                    symbol={tokenOut.symbol}
                    size={30}
                    chainId={swapChainId}
                    address={isNativeToken(tokenOut) ? null : tokenOut.address}
                    verified={tokenOut.verified}
                  />
                  <span className="display text-[15px] text-t1">{tokenOut.symbol}</span>
                  <ChevronDown size={15} className="text-t2" />
                </button>
              </div>
            </div>
          </div>

          {sameToken && <div className="mt-2 text-[11px] text-[#e6c17a]">Pick two different tokens.</div>}
          {insufficient && <div className="mt-2 text-[11px] text-[#ffb4b4]">Insufficient {tokenIn.symbol} balance on {chain.short}.</div>}
          {amountIn > 0n && !quote.isFetching && !quote.data && !sameToken && (
            <div className="mt-2 rounded-lg border border-[#e6c17a]/25 bg-[#e6c17a]/8 px-3 py-2.5 text-[12px] leading-5 text-[#e6c17a]">
              <div className="font-medium">
                {depth.isFetching
                  ? `Checking how much ${tokenIn.symbol} this pool can fill`
                  : depth.data
                    ? `This pool can fill about ${formatAmount(depth.data.amount, tokenIn.decimals, 6)} ${tokenIn.symbol} right now`
                    : `No fillable ${tokenIn.symbol} to ${tokenOut.symbol} route on ${chain.short}`}
              </div>
              <div className="mt-0.5 text-[#e6c17a]/80">
                {depth.data
                  ? 'Larger orders would only partially fill, so the router would revert. Try the size below or split the swap.'
                  : 'Every fee tier failed the fill check, so there is no honest quote to show.'}
              </div>
              {depth.data && (
                <button
                  onClick={() => setAmount(formatAmount(depth.data!.amount, tokenIn.decimals, 6))}
                  className="mt-2 rounded-md border border-[#e6c17a]/40 px-2.5 py-1 text-[11px] text-[#e6c17a] transition-colors hover:bg-[#e6c17a]/10"
                >
                  Use {formatAmount(depth.data.amount, tokenIn.decimals, 4)} {tokenIn.symbol}
                </button>
              )}
            </div>
          )}

          {quote.data?.priceImpactBps != null && quote.data.priceImpactBps > 1500 && (
            <div className="mt-3 rounded-lg border border-[#ff8f8f]/30 bg-[#ff8f8f]/8 px-3 py-2 text-[12px] leading-5 text-[#ffb4b4]">
              Very thin pool: this quote moves the price by {(quote.data.priceImpactBps / 100).toFixed(1)}%. Check the pool before
              signing.
            </div>
          )}

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
              disabled={!quote.data || insufficient || amountIn <= 0n}
              loading={busy === 'start'}
              onClick={runSwap}
            >
              {needsApproval ? 'Approve and swap' : 'Swap'}
            </Button>
          )}

          {chainId !== swapChainId && isConnected && (
            <button onClick={() => ensureChain(swapChainId)} className="mt-2 w-full text-center text-[11px] text-[#e6c17a] hover:underline">
              Wallet is on {getChain(chainId)?.short ?? chainId}, switch to {chain.short} to sign.
            </button>
          )}
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold text-t1">Quote details</h3>
            {quote.isError && <div className="text-[11px] text-[#ffb4b4]">Quote failed: {(quote.error as Error).message}</div>}
            <Row label="Rate" value={rate > 0 ? `1 ${tokenIn.symbol} ≈ ${rate < 0.0001 ? rate.toExponential(3) : rate.toFixed(6)} ${tokenOut.symbol}` : '-'} />
            <Row
              label="Price impact"
              value={
                quote.data?.priceImpactBps != null ? (
                  <span className={quote.data.priceImpactBps > 300 ? 'text-[#e6c17a]' : ''}>{pct(quote.data.priceImpactBps, 2)}</span>
                ) : (
                  '-'
                )
              }
              hint="Compared with the pool's current mid price"
            />
            <Row label="Minimum received" value={out > 0n ? `${formatAmount(minOut, tokenOut.decimals, 6)} ${tokenOut.symbol}` : '-'} />
            <Row label="Slippage tolerance" value={pct(slippageBps, 2)} />
            <Row label="Route" value={quote.data?.route ?? '-'} />
            <Row label="Approval" value={!isConnected ? '-' : isNativeToken(tokenIn) ? 'not needed (native)' : needsApproval ? 'required, exact amount' : 'already approved'} />
            <Row label="Pool fee" value={quote.data ? `${quote.data.fee / 10000}%` : '-'} />
          </Card>

          {activity && (
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-t1">Last swap</h3>
                <Badge tone={activity.status === 'complete' ? 'mint' : activity.status === 'failed' ? 'red' : 'amber'}>{activity.status}</Badge>
              </div>
              <div className="space-y-1.5">
                {activity.steps.map((s) => (
                  <div key={s.key} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-t2">{s.label}</span>
                    {s.hash ? (
                      <a href={explorerTx(activity.fromChainId, s.hash)} target="_blank" rel="noreferrer" className="mono text-t1 hover:text-accent">
                        {s.hash.slice(0, 8)}…
                      </a>
                    ) : (
                      <span className="text-t3">{s.status}</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-4">
            <div className="flex items-start gap-2 text-[11px] leading-relaxed text-t2">
              <Info size={14} className="mt-0.5 shrink-0 text-accent" />
              <p>
                Approvals are always for the exact amount, never unlimited.
                {chain.nativeIsUsdc
                  ? ` On ${chain.short} the gas token is USDC; swaps use its 6-decimal ERC-20 interface at 0x3600…0000.`
                  : ` Native ${chain.viem.nativeCurrency.symbol} is wrapped by the router inside the same transaction.`}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <TokenPicker
        open={pick !== null}
        onClose={() => setPick(null)}
        title={pick === 'in' ? 'Sell token' : 'Buy token'}
        groups={swapGroups}
        chains={SWAP_CHAINS}
        value={
          pick === 'in'
            ? { chainId: swapChainId, address: tokenIn.address }
            : { chainId: swapChainId, address: tokenOut.address }
        }
        onSelect={(c, t) => {
          if (isConnected && c.id !== chainId) switchChainAsync({ chainId: c.id as never }).catch(() => undefined)
          else if (!isConnected) setPreviewChain(c.id)
          if (pick === 'in') {
            if (t.address === tokenOut.address) setTokenOut(tokenIn)
            setTokenIn(t)
          } else {
            if (t.address === tokenIn.address) setTokenIn(tokenOut)
            setTokenOut(t)
          }
        }}
      />

      <Modal open={showSlip} onClose={() => setShowSlip(false)} title="Slippage tolerance">
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-3 gap-2">
            {SLIPPAGE_PRESETS.map((bps) => (
              <button
                key={bps}
                onClick={() => setSlippageBps(bps)}
                className={`panel py-2 text-sm ${slippageBps === bps ? 'border-accent/50 bg-accent/10 text-accent' : 'text-t1 hover:bg-ink-700'}`}
              >
                {(bps / 100).toFixed(bps === 10 ? 1 : 0)}%
              </button>
            ))}
          </div>
          <div className="panel flex items-center gap-2 p-2.5">
            <input
              value={(slippageBps / 100).toString()}
              onChange={(e) => {
                const v = Number(e.target.value)
                if (!Number.isNaN(v) && v >= 0 && v <= 50) setSlippageBps(Math.round(v * 100))
              }}
              className="input text-sm"
            />
            <span className="text-xs text-t3">% custom</span>
          </div>
          <p className="text-[11px] leading-relaxed text-t3">
            Minimum received is recomputed after every quote. High slippage on thin testnet pools can still revert, that is the pool,
            not the app.
          </p>
        </div>
      </Modal>
    </div>
  )
}
