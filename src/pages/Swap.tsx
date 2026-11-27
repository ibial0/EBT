import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownUp, ChevronDown, Info, Settings2 } from 'lucide-react'
import { formatUnits } from 'viem'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { getPublicClient, getWalletClient } from 'wagmi/actions'
import { SWAP_CHAINS, getChain, explorerTx, type Address } from '../config/chains'
import {
  isNativeToken,
  nativeToken,
  tokensForChain,
  type TokenCfg,
} from '../config/tokens'
import { WETH } from '../config/tokens'
import { Card, Button, Badge, Row, notify, TokenIcon, Modal, Spinner, ChainLogo, NetworkLogo } from '../components/ui'
import { ConnectButton } from '../components/Layout'
import { ChainSelect } from '../components/ChainSelect'
import { TokenPicker, syntheticChainForNetwork, type PickerGroup } from '../components/TokenPicker'
import { addActivity, updateStep, finalizeFromSteps, getActivity, updateActivity } from '../lib/activity'
import { quoteBest, maxFillable, applySlippage, erc20Balance, formatAmount, erc20Abi, type SwapQuote } from '../lib/uniswap'
import { dexesForChain, quoteBestV2, executeV2Swap, hasV2Dex, primaryV2Dex, v2PairsForChain, type V2Quote } from '../lib/dexV2'
import { CUSTOM_DEX_EVENT, customDexChainIds } from '../lib/customDex'
import {
  NON_EVM_SWAP_NETWORKS,
  getNonEvmSwapNet,
  quoteNonEvmSwap,
  type NonEvmSwapId,
  type NonEvmSwapQuote,
  type NonEvmSwapToken,
} from '../lib/nonEvmSwap'
import { loadNonEvmPortfolio } from '../lib/nonEvmPortfolio'
import { useNonEvmWallets } from '../lib/walletsMulti'
import { getNetwork, type NetworkEntry } from '../config/networks'
import { executeSwap } from '../lib/swapExec'
import { assertSwapRoute } from '../lib/guard'
import { decodeTxError } from '../lib/errors'
import { fmt, safeParseUnits, pct } from '../lib/format'
import { pairsForChain, poolsForChain } from '../config/pools'
import { lastSelection } from '../lib/lastSelection'
import { ensureWalletChain, wagmiConfig } from '../lib/wallet'
import { discoverNativePools, discoverV2Pair } from '../lib/poolDiscovery'
import { walletSender } from '../lib/tx'

const SLIPPAGE_PRESETS = [10, 50, 100]

const NON_EVM_SYNTH_ID: Record<NonEvmSwapId, number> = {
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG': -101,
  'stellar:testnet': -105,
}
const NON_EVM_BY_SYNTH: Record<number, NonEvmSwapId> = {
  [-101]: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
  [-105]: 'stellar:testnet',
}

function asTokenCfg(chainId: number, tok: NonEvmSwapToken): TokenCfg {
  return {
    chainId,
    address: tok.assetId as Address,
    symbol: tok.symbol,
    name: tok.name,
    decimals: tok.decimals,
    kind: tok.symbol === 'USDC' ? 'usdc' : 'token',
    color: tok.color,
    verified: true,
  }
}

export default function Swap() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const multiWallets = useNonEvmWallets()

  /** bump when the owner adds/removes a custom DEX in Settings, so lists recompute without a reload */
  const [dexVersion, setDexVersion] = useState(0)
  useEffect(() => {
    const on = () => setDexVersion((v) => v + 1)
    window.addEventListener(CUSTOM_DEX_EVENT, on)
    return () => window.removeEventListener(CUSTOM_DEX_EVENT, on)
  }, [])

  /** swap-ready chains: the built-in registry plus any chain where the owner enabled a custom DEX */
  const swapChains = useMemo(() => {
    const seen = new Set(SWAP_CHAINS.map((c) => c.id))
    const extra = customDexChainIds()
      .map((id) => getChain(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c) && !seen.has(c!.id))
    return extra.length ? [...SWAP_CHAINS, ...extra] : SWAP_CHAINS
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dexVersion])

  const supportedSwap = useMemo(() => new Set(swapChains.map((c) => c.id)), [swapChains])

  const nonEvmEntries = useMemo(
    () =>
      NON_EVM_SWAP_NETWORKS.map((net) => ({
        swapNet: net,
        entry: getNetwork(net.id),
        synthId: NON_EVM_SYNTH_ID[net.id],
      })).filter((x): x is { swapNet: (typeof NON_EVM_SWAP_NETWORKS)[number]; entry: NetworkEntry; synthId: number } => Boolean(x.entry)),
    [],
  )

  const [nonEvmMode, setNonEvmMode] = useState<NonEvmSwapId | null>(null)
  const nonEvmNet = useMemo(() => getNonEvmSwapNet(nonEvmMode), [nonEvmMode])
  const nonEvmEntry = useMemo(() => (nonEvmMode ? getNetwork(nonEvmMode) : undefined), [nonEvmMode])
  const [nonEvmIn, setNonEvmIn] = useState<NonEvmSwapToken>(() => NON_EVM_SWAP_NETWORKS[0].tokens[0])
  const [nonEvmOut, setNonEvmOut] = useState<NonEvmSwapToken>(() => NON_EVM_SWAP_NETWORKS[0].tokens[1])
  const pendingNonEvmPickRef = useRef<{ netId: NonEvmSwapId; role: 'in' | 'out'; assetId: string } | null>(null)

  const chainSupported = !isConnected || supportedSwap.has(chainId)
  const [previewChain, setPreviewChain] = useState(lastSelection.swap()?.chainId ?? 11155111)
  // The chain the user picked wins; the wallet follows it (the UI already offers to switch).
  const swapChainId = previewChain
  const syncedWalletChain = useRef(false)
  useEffect(() => {
    if (!isConnected || !supportedSwap.has(chainId)) return
    if (!syncedWalletChain.current) {
      syncedWalletChain.current = true
      // Keep the selection restored from this tab; only adopt the wallet chain on a fresh visit.
      if (!lastSelection.swap()) setPreviewChain(chainId)
      return
    }
    setPreviewChain(chainId)
  }, [chainId, isConnected])
  const [sellFocus, setSellFocus] = useState(false)
  const [tokenIn, setTokenIn] = useState<TokenCfg>(() => tokensForChain(11155111)[0])
  const [tokenOut, setTokenOut] = useState<TokenCfg>(() => tokensForChain(11155111)[1])
  const [amount, setAmount] = useState('')
  const [slippageBps, setSlippageBps] = useState(50)
  const [showSlip, setShowSlip] = useState(false)
  const [pick, setPick] = useState<'in' | 'out' | null>(null)
  /** tokens on this chain that have a live pool against the wrapped native coin (discovered on chain) */
  const [nativePools, setNativePools] = useState<Set<string>>(() => new Set())
  const pendingPickRef = useRef<{ chainId: number; role: 'in' | 'out'; token: TokenCfg } | null>(null)
  const restoredFor = useRef<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  /** liquid journey: out (card→sell token), back (token→card), inR (card→buy token), done */
  const [flow, setFlow] = useState<'idle' | 'out' | 'back' | 'inR' | 'done'>('idle')
  const flowRef = useRef(flow)
  useEffect(() => { flowRef.current = flow }, [flow])
  const flowTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => { flowTimersRef.current.forEach(clearTimeout) }, [])
  const [activeId, setActiveId] = useState<string | undefined>()
  const [debounced, setDebounced] = useState('')
  const [showChainPick, setShowChainPick] = useState(false)

  // Fetch non-EVM balances for any connected Solana/Stellar wallet so balances display in picker & Swap box
  const relevantNonEvmWallets = useMemo(() => {
    const out: Partial<Record<'solana' | 'stellar', NonNullable<(typeof multiWallets)['solana']>>> = {}
    if (multiWallets.solana) out.solana = multiWallets.solana
    if (multiWallets.stellar) out.stellar = multiWallets.stellar
    return out
  }, [multiWallets.solana, multiWallets.stellar])
  const hasRelevantNonEvm = Boolean(relevantNonEvmWallets.solana || relevantNonEvmWallets.stellar)

  const nonEvmBalQuery = useQuery({
    queryKey: ['swap-nonevm-bal', relevantNonEvmWallets.solana?.address, relevantNonEvmWallets.stellar?.address],
    queryFn: () => loadNonEvmPortfolio(relevantNonEvmWallets),
    enabled: hasRelevantNonEvm,
    staleTime: 20_000,
    retry: 0,
  })

  const nonEvmBalancesBySynth = useMemo(() => {
    const m = new Map<number, Record<string, bigint | null>>()
    for (const h of nonEvmBalQuery.data ?? []) {
      const sid = NON_EVM_SYNTH_ID[h.networkId as NonEvmSwapId]
      if (!sid) continue
      const netSwap = getNonEvmSwapNet(h.networkId)
      const map: Record<string, bigint | null> = {}
      if (netSwap?.tokens[0]) map[netSwap.tokens[0].assetId.toLowerCase()] = h.native
      for (const tk of h.tokens) {
        map[tk.address.toLowerCase()] = tk.balance
        const matched = netSwap?.tokens.find((x) => x.symbol === tk.symbol)
        if (matched) map[matched.assetId.toLowerCase()] = tk.balance
      }
      m.set(sid, map)
    }
    return m
  }, [nonEvmBalQuery.data])

  /** every swap-capable chain (EVM + non-EVM) with its tokens, in one unified picker list */
  const allSwapGroups = useMemo<PickerGroup[]>(() => {
    const evm: PickerGroup[] = swapChains.map((c) => {
      const addrs = new Set<string>()
      for (const pool of poolsForChain(c.id)) {
        addrs.add(pool.token0.toLowerCase())
        addrs.add(pool.token1.toLowerCase())
      }
      for (const pair of v2PairsForChain(c.id)) {
        addrs.add(pair.token0.toLowerCase())
        addrs.add(pair.token1.toLowerCase())
      }
      const tokens = tokensForChain(c.id).filter(
        (t) => addrs.has(t.address.toLowerCase()) || (c.id === swapChainId && nativePools.has(t.address.toLowerCase())),
      )
      if (c.nativeIsUsdc || (c.uniswap?.kind === 'v1' && !c.dexV2?.length)) return { chain: c, tokens }
      const native = nativeToken(c.id)
      return { chain: c, tokens: [native, ...tokens.filter((t) => t.address !== native.address)] }
    }).filter((g) => g.tokens.length > 0)

    const nonEvm: PickerGroup[] = nonEvmEntries.map(({ swapNet, entry, synthId }) => ({
      chain: syntheticChainForNetwork(entry, synthId),
      network: entry,
      tokens: swapNet.tokens.map((t) => asTokenCfg(synthId, t)),
      nonEvmBalances: nonEvmBalancesBySynth.get(synthId),
    }))

    return [...evm, ...nonEvm]
  }, [nonEvmEntries, nonEvmBalancesBySynth])

  const allPickerChains = useMemo(() => allSwapGroups.map((g) => g.chain), [allSwapGroups])

  const swapCardRef = useRef<HTMLDivElement>(null)
  const sideColRef = useRef<HTMLDivElement>(null)
  const [plugFrac, setPlugFrac] = useState(0.44)

  useEffect(() => {
    const card = swapCardRef.current
    const col = sideColRef.current
    if (!card || !col) return
    const update = () => {
      const ch = card.getBoundingClientRect().height
      const lh = col.getBoundingClientRect().height
      if (lh > 0 && ch > 0) setPlugFrac(Math.min((ch * 0.44) / lh, 0.95))
    }
    const ro = new ResizeObserver(update)
    ro.observe(card)
    ro.observe(col)
    update()
    return () => ro.disconnect()
  }, [nonEvmMode])

  const chain = getChain(swapChainId)!

  useEffect(() => {
    const t = setTimeout(() => setDebounced(amount), 350)
    return () => clearTimeout(t)
  }, [amount])

  useEffect(() => {
    if (!nonEvmNet) return
    const p = pendingNonEvmPickRef.current
    if (p && p.netId === nonEvmNet.id) {
      pendingNonEvmPickRef.current = null
      const chosen = nonEvmNet.tokens.find((t) => t.assetId === p.assetId) ?? nonEvmNet.tokens[0]
      const fallback = nonEvmNet.tokens.find((t) => t.assetId !== chosen.assetId) ?? nonEvmNet.tokens[1]
      if (p.role === 'in') {
        setNonEvmIn(chosen)
        setNonEvmOut(fallback)
      } else {
        setNonEvmOut(chosen)
        setNonEvmIn(fallback)
      }
      setAmount('')
      return
    }
    setNonEvmIn(nonEvmNet.tokens[0])
    setNonEvmOut(nonEvmNet.tokens[1])
    setAmount('')
  }, [nonEvmNet])

  useEffect(() => {
    const c = getChain(swapChainId)!
    const list = tokensForChain(swapChainId)
    const native = nativeToken(swapChainId)
    const hideNative = Boolean(c.nativeIsUsdc || (c.uniswap?.kind === 'v1' && !c.dexV2?.length))
    const poolAddrs = new Set<string>()
    for (const p of poolsForChain(swapChainId)) {
      poolAddrs.add(p.token0.toLowerCase())
      poolAddrs.add(p.token1.toLowerCase())
    }
    for (const p of v2PairsForChain(swapChainId)) {
      poolAddrs.add(p.token0.toLowerCase())
      poolAddrs.add(p.token1.toLowerCase())
    }
    const pooled = list.filter((x) => poolAddrs.has(x.address.toLowerCase()))
    const activeList = pooled.length >= 2 ? pooled : list
    const pending = pendingPickRef.current
    if (pending && pending.chainId === swapChainId) {
      pendingPickRef.current = null
      const keyOf = (x: TokenCfg) =>
        (isNativeToken(x) ? (WETH[swapChainId] ?? '').toLowerCase() : x.address.toLowerCase())
      const fallback = (hideNative ? activeList : [native, ...activeList]).find(
        (x) =>
          x.address.toLowerCase() !== pending.token.address.toLowerCase() &&
          keyOf(x) !== keyOf(pending.token),
      ) ?? activeList[0]
      if (pending.role === 'in') {
        setTokenIn(pending.token)
        if (fallback) setTokenOut(fallback)
      } else {
        setTokenOut(pending.token)
        if (fallback) setTokenIn(fallback)
      }
      setAmount('')
      return
    }
    const keyOf = (x: TokenCfg) =>
      (isNativeToken(x) ? (WETH[swapChainId] ?? '').toLowerCase() : x.address.toLowerCase())
    // One pass per chain. React StrictMode mounts effects twice in dev, so a boolean ref let the
    // second pass fall through to the defaults and wipe the restored pair; remember the chain instead.
    if (restoredFor.current === swapChainId) return
    restoredFor.current = swapChainId
    const saved = lastSelection.swap()
    if (saved && saved.chainId === swapChainId) {
      const fullPool = (hideNative ? list : [native, ...list].filter(Boolean)) as TokenCfg[]
      const norm = (x: TokenCfg) => (isNativeToken(x) ? 'native' : x.address.toLowerCase())
      const byAddr = (addr?: string) =>
        addr ? fullPool.find((x) => norm(x) === addr.toLowerCase()) : undefined
      const bySym = (sym?: string) => (sym ? fullPool.find((x) => x.symbol === sym) : undefined)
      const back = byAddr(saved.inAddress) ?? bySym(saved.inSymbol)
      const out = byAddr(saved.outAddress) ?? bySym(saved.outSymbol)
      if (back && out && norm(back) !== norm(out)) {
        setTokenIn(back)
        setTokenOut(out)
        setAmount('')
        return
      }
    }
    const first = hideNative ? activeList[0] : native
    const second =
      activeList.find((x) => x.address !== first?.address && (!first || keyOf(x) !== keyOf(first))) ??
      activeList.find((x) => x.address !== first?.address) ??
      native
    setTokenIn(first)
    setTokenOut(second)
    setAmount('')
  }, [swapChainId])

  // Remember the chain and both tokens for this tab; a full reload starts fresh.
  useEffect(() => {
    lastSelection.setSwap({
      chainId: previewChain,
      inSymbol: tokenIn.symbol,
      outSymbol: tokenOut.symbol,
      inAddress: isNativeToken(tokenIn) ? 'native' : tokenIn.address.toLowerCase(),
      outAddress: isNativeToken(tokenOut) ? 'native' : tokenOut.address.toLowerCase(),
    })
  }, [previewChain, tokenIn, tokenOut])

  const selectable: TokenCfg[] = useMemo(() => {
    const list = tokensForChain(swapChainId)
    const hideNative = Boolean(chain.nativeIsUsdc || (chain.uniswap?.kind === 'v1' && !chain.dexV2?.length))
    return hideNative ? list : [nativeToken(swapChainId), ...list]
  }, [swapChainId, chain.nativeIsUsdc, chain.uniswap?.kind, chain.dexV2])

  const poolKey = (t: TokenCfg) =>
    (isNativeToken(t) ? (WETH[swapChainId] ?? '').toLowerCase() : t.address.toLowerCase())

  const tradeable: TokenCfg[] = useMemo(() => {
    const addrs = new Set<string>()
    for (const pool of poolsForChain(swapChainId)) {
      addrs.add(pool.token0.toLowerCase())
      addrs.add(pool.token1.toLowerCase())
    }
    for (const pair of v2PairsForChain(swapChainId)) {
      addrs.add(pair.token0.toLowerCase())
      addrs.add(pair.token1.toLowerCase())
    }
    const kept = selectable.filter(
      (t) => addrs.has(poolKey(t)) || isNativeToken(t) || nativePools.has(t.address.toLowerCase()),
    )
    return kept.length >= 2 ? kept : selectable
  }, [selectable, swapChainId, nativePools])

  useMemo(() => {
    const inKey = poolKey(tokenIn)
    const paired = new Set<string>()
    for (const pair of [...pairsForChain(swapChainId), ...v2PairsForChain(swapChainId)]) {
      if (pair.token0.toLowerCase() === inKey) paired.add(pair.token1.toLowerCase())
      if (pair.token1.toLowerCase() === inKey) paired.add(pair.token0.toLowerCase())
    }
    const kept = tradeable.filter(
      (t) => t.address !== tokenIn.address && poolKey(t) !== inKey && paired.has(poolKey(t)),
    )
    if (kept.length > 0) return kept
    const diffPool = tradeable.filter((t) => t.address !== tokenIn.address && poolKey(t) !== inKey)
    return diffPool.length > 0 ? diffPool : tradeable.filter((t) => t.address !== tokenIn.address)
  }, [tradeable, tokenIn, swapChainId])

  const hasAmm =
    poolsForChain(swapChainId).length > 0 || v2PairsForChain(swapChainId).length > 0 || nativePools.size > 0

  const isNonEvm = Boolean(nonEvmNet && nonEvmMode)
  const amountIn = safeParseUnits(debounced, isNonEvm ? nonEvmIn.decimals : tokenIn.decimals)
  const sameToken = isNonEvm ? nonEvmIn.assetId === nonEvmOut.assetId : tokenIn.address === tokenOut.address

  const publicClient = useMemo(() => getPublicClient(wagmiConfig, { chainId: swapChainId as never }), [swapChainId])

  /**
   * Ask the chain which tokens actually have a pool against the wrapped native coin.
   * This is what lets a token that is missing from the curated pool list (LINK, WBTC …)
   * still be sold into native gas money, on any chain where a Uniswap v3 factory exists.
   */
  const discoveryKey = useMemo(
    () =>
      selectable
        .filter((t) => !isNativeToken(t))
        .map((t) => t.address.toLowerCase())
        .sort()
        .join(','),
    [selectable],
  )
  useEffect(() => {
    const v3Factory = chain.uniswap?.factory
    const v2Factory = dexesForChain(swapChainId)[0]?.factory
    const weth = WETH[swapChainId]
    if ((!v3Factory && !v2Factory) || !weth || !publicClient || !discoveryKey) {
      setNativePools(new Set())
      return
    }
    let alive = true
    const queue = discoveryKey.split(',')
    const hits = new Set<string>()
    const workers = Array.from({ length: Math.min(6, queue.length) }, async () => {
      while (queue.length > 0 && alive) {
        const token = queue.shift() as string
        if (v3Factory) {
          const pools = await discoverNativePools(
            publicClient as never,
            swapChainId,
            v3Factory as Address,
            token as Address,
            weth,
          ).catch(() => [])
          if (pools.length > 0) hits.add(token)
        } else if (v2Factory) {
          const pair = await discoverV2Pair(
            publicClient as never,
            swapChainId,
            v2Factory as Address,
            token as Address,
            weth,
          ).catch(() => null)
          if (pair) hits.add(token)
        }
      }
    })
    void Promise.all(workers).then(() => {
      if (alive) setNativePools(hits)
    })
    return () => {
      alive = false
    }
  }, [chain.uniswap?.factory, swapChainId, discoveryKey, publicClient, dexVersion])

  const quote = useQuery<SwapQuote | V2Quote | null>({
    queryKey: ['swap-quote', swapChainId, tokenIn.address, tokenOut.address, amountIn.toString()],
    queryFn: async () => {
      if (!publicClient || (!chain.uniswap && !hasV2Dex(chain.id))) return null
      const inIsNative = isNativeToken(tokenIn)
      const outIsNative = isNativeToken(tokenOut)
      const inAddr = (inIsNative ? undefined : tokenIn.address) as Address | undefined
      const outAddr = (outIsNative ? undefined : tokenOut.address) as Address | undefined
      const qIn = inAddr ?? (WETH[swapChainId] as Address)
      const qOut = outAddr ?? (WETH[swapChainId] as Address)
      if (!qIn || !qOut) return null
      const allowV3 = Boolean(chain.uniswap && !(chain.uniswap.kind === 'v1' && (inIsNative || outIsNative)))
      const [q3, q2] = await Promise.all([
        allowV3 ? quoteBest(publicClient, chain, qIn, qOut, amountIn) : Promise.resolve(null),
        hasV2Dex(chain.id) ? quoteBestV2(publicClient, chain.id, qIn, qOut, amountIn, tokenIn.decimals, tokenOut.decimals) : Promise.resolve(null),
      ])
      if (q3 && q2) return q3.amountOut >= q2.amountOut ? q3 : q2
      return q3 ?? q2
    },
    enabled: Boolean(!isNonEvm && publicClient && (chain.uniswap || hasV2Dex(chain.id)) && amountIn > 0n && !sameToken),
    staleTime: 8000,
    refetchInterval: 15_000,
    retry: 0,
  })

  const nonEvmQuote = useQuery<NonEvmSwapQuote | null>({
    queryKey: ['non-evm-swap-quote', nonEvmMode, nonEvmIn.assetId, nonEvmOut.assetId, debounced, slippageBps],
    queryFn: async () => {
      if (!nonEvmMode) return null
      return quoteNonEvmSwap({
        networkId: nonEvmMode,
        tokenIn: nonEvmIn,
        tokenOut: nonEvmOut,
        amountDecimal: debounced,
        slippageBps,
      })
    },
    enabled: Boolean(nonEvmMode && debounced && Number(debounced) > 0 && nonEvmIn.assetId !== nonEvmOut.assetId),
    staleTime: 10_000,
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
    enabled: Boolean(
      !isNonEvm &&
        publicClient &&
        chain.uniswap &&
        !(chain.uniswap.kind === 'v1' && (isNativeToken(tokenIn) || isNativeToken(tokenOut))) &&
        amountIn > 0n &&
        !sameToken &&
        !quote.isFetching &&
        !quote.data,
    ),
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
    enabled: Boolean(!isNonEvm && publicClient && address),
    refetchInterval: 20_000,
  })

  const activeSynthId = nonEvmMode ? NON_EVM_SYNTH_ID[nonEvmMode] : swapChainId
  const nonEvmWallet = nonEvmNet ? multiWallets[nonEvmNet.walletFamily] : undefined
  const nonEvmSellBalance = isNonEvm && nonEvmWallet
    ? (nonEvmBalancesBySynth.get(activeSynthId)?.[nonEvmIn.assetId.toLowerCase()] ?? null)
    : null
  const sellBalance = isNonEvm ? nonEvmSellBalance : (balanceIn.data ?? null)
  const sellDecimals = isNonEvm ? nonEvmIn.decimals : tokenIn.decimals

  const activeRouter = quote.data && 'router' in quote.data ? quote.data.router : (chain.uniswap?.router02 ?? primaryV2Dex(chain.id)?.router)

  const allowance = useQuery({
    queryKey: ['allow', swapChainId, tokenIn.address, address, activeRouter],
    queryFn: async () => {
      if (!publicClient || !address || isNativeToken(tokenIn) || !activeRouter) return 0n
      return (await publicClient.readContract({
        address: tokenIn.address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address as Address, activeRouter],
      })) as bigint
    },
    enabled: Boolean(!isNonEvm && publicClient && address && !isNativeToken(tokenIn) && activeRouter),
  })

  const activity = activeId ? getActivity(activeId) : undefined
  const needsApproval = !isNonEvm && !isNativeToken(tokenIn) && (allowance.data ?? 0n) < amountIn
  const out = quote.data?.amountOut ?? 0n
  const minOut = applySlippage(out, slippageBps)
  const evmInsufficient = !isNonEvm && isConnected && amountIn > 0n && (balanceIn.data ?? 0n) < amountIn
  const nonEvmInsufficient = Boolean(isNonEvm && nonEvmWallet && nonEvmSellBalance != null && amountIn > 0n && nonEvmSellBalance < amountIn)
  const insufficient = evmInsufficient || nonEvmInsufficient

  const evmRate = amountIn > 0n && out > 0n ? Number(formatUnits(out, tokenOut.decimals)) / Number(formatUnits(amountIn, tokenIn.decimals)) : 0
  const nonEvmRate =
    isNonEvm && Number(debounced) > 0 && nonEvmQuote.data
      ? Number(nonEvmQuote.data.amountOutFormatted) / Number(debounced)
      : 0
  const rate = isNonEvm ? nonEvmRate : evmRate

  const wallTokenIn: TokenCfg = isNonEvm ? asTokenCfg(activeSynthId, nonEvmIn) : tokenIn
  const wallTokenOut: TokenCfg = isNonEvm ? asTokenCfg(activeSynthId, nonEvmOut) : tokenOut

  function flip() {
    if (isNonEvm) {
      setNonEvmIn(nonEvmOut)
      setNonEvmOut(nonEvmIn)
      setAmount('')
      return
    }
    setTokenIn(tokenOut)
    setTokenOut(tokenIn)
    setAmount('')
  }

  async function ensureChain(id: number) {
    await ensureWalletChain(id)
  }

  async function runSwap() {
    if (!address) return notify('Connect a wallet first.', 'error')
    if (!quote.data) return notify('No executable quote yet.', 'error')
    if (insufficient) return notify('Insufficient balance.', 'error')

    flowTimersRef.current.forEach(clearTimeout)
    flowTimersRef.current = []
    let cancelled = false
    let createdId: string | undefined

    setBusy('start')
    try {
      await ensureChain(swapChainId)
      const c = assertSwapRoute(swapChainId)
      const client = getPublicClient(wagmiConfig, { chainId: swapChainId as never })!
      const wallet = await getWalletClient(wagmiConfig, { chainId: swapChainId as never })

      const q = quote.data
      const quoteIsV2 = 'router' in q

      const item = addActivity({
        kind: 'swap',
        provider: quoteIsV2 ? 'dexv2' : 'uniswap',
        fromChainId: swapChainId,
        toChainId: swapChainId,
        owner: address,
        tokenIn: { symbol: tokenIn.symbol, address: tokenIn.address, decimals: tokenIn.decimals },
        tokenOut: { symbol: tokenOut.symbol, address: tokenOut.address, decimals: tokenOut.decimals },
        amountIn: debounced,
        amountOut: formatAmount(out, tokenOut.decimals),
        status: 'pending',
        meta: quoteIsV2
          ? { dex: q.dexName, slippageBps, minOut: minOut.toString(), priceImpactBps: q.priceImpactBps ?? '' }
          : { feeTier: q.fee, slippageBps, minOut: minOut.toString(), priceImpactBps: q.priceImpactBps ?? '' },
        steps: [
          { key: 'approve', label: `Approve ${tokenIn.symbol}`, status: 'pending', chainId: swapChainId },
          { key: 'swap', label: `Swap ${tokenIn.symbol} → ${tokenOut.symbol}`, status: 'pending', chainId: swapChainId },
        ],
      })
      createdId = item.id
      setActiveId(item.id)

      setFlow('out')
      const outStart = Date.now()
      let backStart = 0
      let inRStart = 0
      let hadApprove = false
      let txCount = 0
      let swapSigned = false
      let swapConfirmed = false
      let backStarted = false
      let inRStarted = false
      let doneStarted = false

      const later = (fn: () => void, ms: number) => {
        const t = setTimeout(() => { if (!cancelled) fn() }, ms)
        flowTimersRef.current.push(t)
        return t
      }

      const startDone = () => {
        if (cancelled || doneStarted) return
        doneStarted = true
        setFlow('done')
        later(() => setFlow('idle'), 4000)
      }

      const startInR = () => {
        if (cancelled || inRStarted) return
        inRStarted = true
        inRStart = Date.now()
        setFlow('inR')
        if (swapConfirmed) {
          later(startDone, 1450)
        }
      }

      const startBack = () => {
        if (cancelled || backStarted) return
        backStarted = true
        backStart = Date.now()
        setFlow('back')
        later(() => {
          if (swapSigned || swapConfirmed) startInR()
        }, 2250)
      }

      const baseSender = walletSender(wallet)
      const trackedWallet = {
        sendTransaction: async (txReq: Parameters<typeof baseSender.sendTransaction>[0]) => {
          const hash = await baseSender.sendTransaction(txReq)
          txCount += 1
          const isSwapTx = !hadApprove || txCount >= 2
          if (isSwapTx && !swapSigned) {
            swapSigned = true
            if (!backStarted) {
              const remOut = Math.max(0, 1500 - (Date.now() - outStart))
              later(startBack, remOut)
            } else if (!inRStarted) {
              const remBack = Math.max(0, 2250 - (Date.now() - backStart))
              later(startInR, remBack)
            }
          }
          return hash
        },
      }

      const onStep = (step: 'approve' | 'swap', state: 'active' | 'done' | 'failed', hash?: string) => {
        updateStep(item.id, step, { status: state === 'active' ? 'active' : state === 'done' ? 'done' : 'failed', hash })
        finalizeFromSteps(item.id)

        if (step === 'approve' && state === 'active') {
          hadApprove = true
        } else if (step === 'approve' && state === 'done') {
          if (hadApprove) {
            const remOut = Math.max(0, 1500 - (Date.now() - outStart))
            later(startBack, remOut)
          }
        } else if (step === 'swap' && state === 'done') {
          swapConfirmed = true
          if (inRStarted) {
            const remInR = Math.max(0, 1450 - (Date.now() - inRStart))
            later(startDone, remInR)
          } else if (backStarted) {
            const remBack = Math.max(0, 2250 - (Date.now() - backStart))
            later(startInR, remBack)
          } else {
            const remOut = Math.max(0, 1500 - (Date.now() - outStart))
            later(startBack, remOut)
          }
        }
      }

      if (quoteIsV2) {
        await executeV2Swap({
          chain: c,
          account: address as Address,
          tokenIn: isNativeToken(tokenIn) ? null : tokenIn.address,
          tokenOut: isNativeToken(tokenOut) ? null : tokenOut.address,
          amountIn,
          amountOutMinimum: minOut,
          quote: q,
          wallet: trackedWallet,
          publicClient: client as never,
          onStep,
        })
      } else {
        await executeSwap({
          chain: c,
          account: address as Address,
          tokenIn: { address: isNativeToken(tokenIn) ? null : tokenIn.address, symbol: tokenIn.symbol, decimals: tokenIn.decimals },
          tokenOut: { address: isNativeToken(tokenOut) ? null : tokenOut.address, symbol: tokenOut.symbol, decimals: tokenOut.decimals },
          amountIn,
          amountOutMinimum: minOut,
          fee: q.fee,
          wallet: trackedWallet,
          publicClient: client as never,
          onStep,
        })
      }
      notify('Swap confirmed on-chain.', 'success')
      balanceIn.refetch()
      allowance.refetch()
      quote.refetch()
    } catch (e) {
      cancelled = true
      flowTimersRef.current.forEach(clearTimeout)
      flowTimersRef.current = []
      const d = decodeTxError(e, swapChainId)
      notify(`${d.title}: ${d.detail}`, 'error')
      setFlow('idle')
      if (createdId) {
        if (d.kind === 'rejected') updateActivity(createdId, { status: 'cancelled', error: 'Rejected in wallet' })
        else finalizeFromSteps(createdId)
      }
    } finally {
      setBusy(null)
    }
  }

  const sellSymbol = isNonEvm ? nonEvmIn.symbol : tokenIn.symbol
  const buySymbol = isNonEvm ? nonEvmOut.symbol : tokenOut.symbol
  const canFillSell = isNonEvm ? Boolean(nonEvmWallet && nonEvmSellBalance != null) : Boolean(address && balanceIn.data != null)

  return (
    <div className="space-y-5">
      <h1 className="sr-only">Swap</h1>
      <div className="flex items-stretch gap-6">
        <div ref={sideColRef} className="relative hidden flex-1 items-center justify-center xl:flex">
          <Wire side="left" dir={flow === 'back' ? 'back' : flow === 'out' ? 'out' : null} plugFrac={plugFrac} />
          <Plug side="left" live={flow === 'out' || flow === 'back'} frac={plugFrac} />
          <WallToken token={wallTokenIn} nonEvm={isNonEvm} pulse={flow === 'back'} glow={flow === 'out'} />
        </div>
        <div className="w-full max-w-[560px]">
          <div ref={swapCardRef}>
            <Card className="relative overflow-hidden p-5">
              {flow === 'back' && (
                <div
                  key="flash-center"
                  className="card-flash pointer-events-none absolute inset-0 z-0 bg-[rgba(171,184,255,0.08)] ring-1 ring-inset ring-[rgba(198,208,255,0.4)]"
                />
              )}
              {(flow === 'out' || flow === 'inR') && (
                <div
                  key={`card-glow-${flow}`}
                  className="card-glow-shimmer pointer-events-none absolute inset-0 z-0"
                  style={{
                    borderRadius: 'inherit',
                    border: '1.5px solid rgba(198,210,255,0.72)',
                    boxShadow: 'inset 0 0 28px rgba(171,184,255,0.16)',
                  }}
                />
              )}
              <div className="mb-4 flex items-center justify-between gap-2">
                <button
                  onClick={() => setShowChainPick(true)}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-ink-850 px-2.5 text-[12px] text-t1 transition-colors hover:border-[#3f4a66]"
                >
                  {isNonEvm && nonEvmEntry ? (
                    <NetworkLogo network={nonEvmEntry} size={16} />
                  ) : (
                    <ChainLogo chain={chain} size={16} />
                  )}
                  <span className="max-w-[110px] truncate">{isNonEvm ? nonEvmNet!.short : chain.short}</span>
                  <ChevronDown size={12} className="text-t2" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="group relative">
                    <span
                      tabIndex={0}
                      aria-label="Approval policy"
                      className="grid size-7 cursor-help place-items-center rounded-lg border border-line text-t3 transition-colors hover:border-line-strong hover:text-accent"
                    >
                      <Info size={13} />
                    </span>
                    <div className="pointer-events-none absolute right-0 top-full z-30 mt-2 hidden w-[260px] rounded-lg border border-line-strong bg-ink-800 p-2.5 text-[11px] leading-5 text-t2 shadow-[0_12px_32px_rgba(0,0,0,0.5)] group-hover:block group-focus-within:block">
                      {isNonEvm
                        ? `Quotes on ${nonEvmNet!.name} are fetched live from ${nonEvmNet!.provider}.`
                        : chain.nativeIsUsdc
                          ? `Approvals are always for the exact amount. On ${chain.short} the gas token is USDC.`
                          : `Approvals are always for the exact amount, never unlimited. Native ${chain.viem.nativeCurrency.symbol} is wrapped in the same transaction.`}
                    </div>
                  </div>
                  <button onClick={() => setShowSlip(true)} className="chip chip-accent hover:border-accent">
                    <Settings2 size={11} /> {pct(slippageBps, 2)}
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="rounded-[14px] border border-line-strong bg-ink-850 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="col-head">Sell</span>
                    <div className="flex items-center gap-2">
                      <div
                        style={{ display: sellFocus && canFillSell ? 'flex' : 'none' }}
                        className="items-center gap-1.5"
                      >
                        {[25, 50, 75].map((p) => (
                          <button
                            key={p}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              if (sellBalance == null) return
                              const raw = (sellBalance * BigInt(p)) / 100n
                              const keep = !isNonEvm && isNativeToken(tokenIn) ? sellBalance / 50n : 0n
                              setAmount(formatUnits(raw > keep ? raw - keep : 0n, sellDecimals))
                            }}
                            className="mono rounded border border-line px-1.5 py-[2px] text-[10px] leading-none text-t3 transition-colors hover:border-line-strong hover:text-t1"
                          >
                            {p}%
                          </button>
                        ))}
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            if (sellBalance == null) return
                            const keep = !isNonEvm && isNativeToken(tokenIn) ? sellBalance / 50n : 0n
                            setAmount(formatUnits(sellBalance > keep ? sellBalance - keep : 0n, sellDecimals))
                          }}
                          className="mono rounded border border-line px-1.5 py-[2px] text-[10px] leading-none text-t2 transition-colors hover:border-accent/50 hover:text-accent"
                        >
                          MAX
                        </button>
                      </div>
                      <span className="mono text-[12px] text-t2">
                        {sellBalance != null ? fmt(sellBalance, sellDecimals, 5) : '—'}
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
                        symbol={sellSymbol}
                        size={30}
                        chainId={isNonEvm ? undefined : swapChainId}
                        address={isNonEvm || isNativeToken(tokenIn) ? null : tokenIn.address}
                        verified={isNonEvm ? true : tokenIn.verified}
                      />
                      <span className="display text-[15px] text-t1">{sellSymbol}</span>
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
                      {isNonEvm ? (
                        nonEvmQuote.isFetching ? (
                          <Spinner size={20} />
                        ) : nonEvmQuote.data ? (
                          nonEvmQuote.data.amountOutFormatted
                        ) : (
                          <span className="text-t3">0.0</span>
                        )
                      ) : quote.isFetching ? (
                        <Spinner size={20} />
                      ) : out > 0n ? (
                        formatAmount(out, tokenOut.decimals, 6)
                      ) : (
                        <span className="text-t3">0.0</span>
                      )}
                    </div>
                    <button
                      onClick={() => setPick('out')}
                      className="flex h-12 shrink-0 items-center gap-2 rounded-full border border-line-strong bg-ink-700 pl-1.5 pr-3 transition-colors hover:border-accent/50 hover:bg-ink-600"
                    >
                      <TokenIcon
                        symbol={buySymbol}
                        size={30}
                        chainId={isNonEvm ? undefined : swapChainId}
                        address={isNonEvm || isNativeToken(tokenOut) ? null : tokenOut.address}
                        verified={isNonEvm ? true : tokenOut.verified}
                      />
                      <span className="display text-[15px] text-t1">{buySymbol}</span>
                      <ChevronDown size={15} className="text-t2" />
                    </button>
                  </div>
                </div>
              </div>

              {sameToken && <div className="mt-2 text-[11px] text-[#e6c17a]">Pick two different tokens.</div>}
              {insufficient && (
                <div className="mt-2 text-[11px] text-[#ffb4b4]">
                  Insufficient {sellSymbol} balance on {isNonEvm ? nonEvmNet!.short : chain.short}.
                </div>
              )}

              {isNonEvm && Number(debounced) > 0 && !nonEvmQuote.isFetching && !nonEvmQuote.data && !sameToken && (
                <div className="mt-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-[12px] text-warn">
                  No active pool/orderbook path returned by {nonEvmNet!.provider} for {nonEvmIn.symbol} → {nonEvmOut.symbol} at this size.
                </div>
              )}

              {!isNonEvm && !hasAmm && (
                <div className="mb-3 rounded-lg border border-[#e6c17a]/25 bg-[#e6c17a]/8 px-3 py-2.5 text-[12px] leading-5 text-[#e6c17a]">
                  <div className="font-medium">No AMM is deployed on {chain.short}.</div>
                  <div className="mt-0.5 text-[#e6c17a]/80">
                    A swap needs a DEX on the same chain. This testnet has none that we could verify on chain, so there is no
                    honest route to show. Bridge the token to a chain that has a pool instead.
                  </div>
                </div>
              )}

              {!isNonEvm && amountIn > 0n && !quote.isFetching && !quote.data && !sameToken && (
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

              {!isNonEvm && quote.data?.priceImpactBps != null && quote.data.priceImpactBps > 1500 && (
                <div className="mt-3 rounded-lg border border-[#ff8f8f]/30 bg-[#ff8f8f]/8 px-3 py-2 text-[12px] leading-5 text-[#ffb4b4]">
                  Very thin pool: this quote moves the price by {(quote.data.priceImpactBps / 100).toFixed(1)}%. Check the pool before
                  signing.
                </div>
              )}

              {isNonEvm ? (
                !nonEvmWallet ? (
                  <div className="mt-4">
                    <ConnectButton full />
                  </div>
                ) : (
                  <Button
                    full
                    size="lg"
                    variant="secondary"
                    className="mt-4 h-[52px] text-[14px]"
                    disabled
                  >
                    Live {nonEvmNet!.provider} quote · signing coming soon
                  </Button>
                )
              ) : !isConnected ? (
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

              {!isNonEvm && chainId !== swapChainId && isConnected && (
                <button onClick={() => ensureChain(swapChainId)} className="mt-2 w-full text-center text-[11px] text-[#e6c17a] hover:underline">
                  Wallet is on {getChain(chainId)?.short ?? chainId}, switch to {chain.short} to sign.
                </button>
              )}
              {!isNonEvm && chain.uniswap?.kind === 'v1' && !chain.dexV2?.length && (
                <div className="mt-2.5 text-center text-[11px] text-t3">
                  Uses ERC-20 / wrapped HTS pools directly on {chain.short} (no unverified native wrap path).
                </div>
              )}
            </Card>
          </div>
        </div>
        <div className="relative hidden flex-1 items-center justify-center xl:flex">
          <Wire side="right" dir={flow === 'inR' ? 'out' : null} plugFrac={plugFrac} />
          <Plug side="right" live={flow === 'inR'} frac={plugFrac} />
          <WallToken
            token={wallTokenOut}
            nonEvm={isNonEvm}
            pulse={flow === 'done'}
            glow={flow === 'inR'}
            amountBadge={
              flow === 'done' && (quote.data?.amountOut || out > 0n)
                ? `${fmt(quote.data?.amountOut ?? out, tokenOut.decimals, 4)} ${tokenOut.symbol}`
                : null
            }
          />
        </div>
      </div>

      {/* Quote details and last swap */}
      <div className="flex justify-center">
        <div className="w-full max-w-[560px] space-y-3">
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold text-t1">Quote details</h3>
            {isNonEvm ? (
              <>
                <Row
                  label="Rate"
                  value={rate > 0 ? `1 ${nonEvmIn.symbol} ≈ ${rate < 0.0001 ? rate.toExponential(3) : rate.toFixed(6)} ${nonEvmOut.symbol}` : '-'}
                />
                <Row
                  label="Price impact"
                  value={nonEvmQuote.data?.priceImpactPct != null ? `${nonEvmQuote.data.priceImpactPct.toFixed(2)}%` : '-'}
                />
                <Row
                  label="Minimum received"
                  value={nonEvmQuote.data ? `${nonEvmQuote.data.minOutFormatted} ${nonEvmOut.symbol}` : '-'}
                />
                <Row label="Slippage tolerance" value={pct(slippageBps, 2)} />
                <Row label="Route" value={nonEvmQuote.data?.route ?? '-'} />
                <Row label="Provider" value={nonEvmQuote.data?.provider ?? nonEvmNet!.provider} />
              </>
            ) : (
              <>
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
                <Row label="Pool fee" value={quote.data ? ('fee' in quote.data ? `${quote.data.fee / 10000}%` : '0.3% (AMM V2)') : '-'} />
              </>
            )}
          </Card>

          {!isNonEvm && activity && (
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
        </div>
      </div>

      {/* Unsupported-chain notice */}
      {!isNonEvm && !chainSupported && (
        <div className="flex justify-center">
          <Card className="w-full max-w-[560px] border-warn/40 p-4">
            <div className="text-[14px] font-semibold text-t1">
              Swaps run on {swapChains.map((c) => c.short).join(', ')}.
            </div>
            <p className="mt-1 text-[13px] leading-5 text-t2">
              Your wallet is on {getChain(chainId)?.short ?? chainId}, which has no verified DEX pool. Switch to one of
              the chains below to swap.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {swapChains.map((c) => (
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
        </div>
      )}

      <TokenPicker
        open={pick !== null}
        filterKey="swap-token"
        onClose={() => setPick(null)}
        title={pick === 'in' ? 'Sell token' : 'Buy token'}
        groups={allSwapGroups}
        chains={allPickerChains}
        value={
          pick === 'in'
            ? { chainId: activeSynthId, address: isNonEvm ? nonEvmIn.assetId : tokenIn.address }
            : { chainId: activeSynthId, address: isNonEvm ? nonEvmOut.assetId : tokenOut.address }
        }
        onSelect={(c, t) => {
          const role = pick ?? 'in'
          const targetNonEvm = NON_EVM_BY_SYNTH[c.id]
          if (targetNonEvm) {
            if (nonEvmMode !== targetNonEvm) {
              pendingNonEvmPickRef.current = { netId: targetNonEvm, role, assetId: t.address }
              setNonEvmMode(targetNonEvm)
              return
            }
            const netObj = getNonEvmSwapNet(targetNonEvm)!
            const picked = netObj.tokens.find((x) => x.assetId === t.address)
            if (!picked) return
            if (role === 'in') {
              if (picked.assetId === nonEvmOut.assetId) setNonEvmOut(nonEvmIn)
              setNonEvmIn(picked)
            } else {
              if (picked.assetId === nonEvmIn.assetId) setNonEvmIn(nonEvmOut)
              setNonEvmOut(picked)
            }
            return
          }

          if (nonEvmMode) setNonEvmMode(null)
          if (c.id !== swapChainId) {
            pendingPickRef.current = { chainId: c.id, role, token: t }
            if (isConnected && c.id !== chainId) switchChainAsync({ chainId: c.id as never }).catch(() => undefined)
            else setPreviewChain(c.id)
            return
          }
          if (role === 'in') {
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

      <ChainSelect
        open={showChainPick}
        onClose={() => setShowChainPick(false)}
        chains={swapChains}
        extraNetworks={nonEvmEntries.map((x) => x.entry)}
        value={swapChainId}
        extraValue={nonEvmMode}
        onSelect={async (id) => {
          setNonEvmMode(null)
          if (isConnected && supportedSwap.has(id)) {
            try { await switchChainAsync({ chainId: id }) } catch {}
          } else {
            setPreviewChain(id)
          }
        }}
        onSelectExtra={(netId) => {
          setNonEvmMode(netId as NonEvmSwapId)
        }}
        title="Swap network"
      />
    </div>
  )
}

/**
 * The token that is being sold (left) or bought (right), mounted on the wall beside the
 * card: a plain circular mark with a small bracket, no names, no chain chrome.
 */
function WallToken({
  token,
  nonEvm,
  pulse,
  glow,
  amountBadge,
}: {
  token: TokenCfg
  nonEvm?: boolean
  pulse?: boolean
  glow?: boolean
  amountBadge?: string | null
}) {
  return (
    <div className="pointer-events-none relative">
      {glow && (
        <div
          key="anticipate"
          className="token-anticipate absolute inset-[-6px] rounded-full"
          style={{
            border: '1.5px solid rgba(198,210,255,0.4)',
            boxShadow: '0 0 28px rgba(171,184,255,0.25)',
          }}
        />
      )}
      {pulse && (
        <div
          key="reflect"
          className="token-reflect absolute inset-[-8px] rounded-full"
          style={{
            border: '2px solid rgba(198,210,255,0.6)',
            boxShadow: '0 0 32px rgba(171,184,255,0.45)',
          }}
        />
      )}
      <div
        className={
          (pulse ? 'token-pop ' : '') +
          'grid size-[160px] place-items-center rounded-full border border-line-strong bg-ink-800 shadow-[0_18px_46px_rgba(0,0,0,0.45)] transition-transform duration-500'
        }
      >
        <TokenIcon
          symbol={token.symbol}
          size={132}
          chainId={nonEvm ? undefined : token.chainId}
          address={nonEvm ? undefined : token.address}
          verified={nonEvm ? true : token.address !== '0x0000000000000000000000000000000000000000' ? true : undefined}
        />
      </div>
      {amountBadge && (
        <span className="amount-rise pointer-events-none absolute -right-3 -top-2 z-20 whitespace-nowrap rounded-md border border-[#6adbb6]/40 bg-[#0d1f18]/90 px-2 py-0.5 text-[12px] font-semibold text-[#6adbb6] shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          +{amountBadge}
        </span>
      )}
    </div>
  )
}

/** Solve monotonic 1D cubic Bezier(0, p1, p2, 1) at parameter x in [0, 1]. */
function cubicBezier(x1: number, y1: number, x2: number, y2: number, x: number): number {
  const bx = (t: number) => {
    const u = 1 - t
    return 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t
  }
  const dbx = (t: number) => {
    const u = 1 - t
    return 3 * u * u * x1 + 6 * u * t * (x2 - x1) + 3 * t * t * (1 - x2)
  }
  let t = x
  for (let i = 0; i < 5; i++) {
    const err = bx(t) - x
    const d = dbx(t)
    if (Math.abs(err) < 1e-5 || Math.abs(d) < 1e-6) break
    t = Math.max(0, Math.min(1, t - err / d))
  }
  const u = 1 - t
  return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t
}

function Wire({ side, dir, plugFrac = 0.44 }: { side: 'left' | 'right'; dir: 'out' | 'back' | null; plugFrac?: number }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const outerRef = useRef<SVGPathElement>(null)
  const mainRef = useRef<SVGPathElement>(null)
  const liquidGroupRef = useRef<SVGGElement>(null)
  const auraRef = useRef<SVGPathElement>(null)
  const bulgeRef = useRef<SVGPathElement>(null)
  const tailRef = useRef<SVGPathElement>(null)
  const midRef = useRef<SVGPathElement>(null)
  const headRef = useRef<SVGEllipseElement>(null)
  const coreRef = useRef<SVGEllipseElement>(null)
  const trailBeadRef = useRef<SVGCircleElement>(null)

  const [box, setBox] = useState({ w: 300, h: 460 })
  const boxRef = useRef(box)
  boxRef.current = box
  const plugFracRef = useRef(plugFrac)
  plugFracRef.current = plugFrac
  const animatingRef = useRef(false)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const update = () => {
      const r = svg.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) {
        const next = { w: Math.round(r.width), h: Math.round(r.height) }
        boxRef.current = next
        setBox((prev) => (prev.w === next.w && prev.h === next.h ? prev : next))
      }
    }
    const ro = new ResizeObserver(update)
    ro.observe(svg)
    update()
    return () => ro.disconnect()
  }, [])

  const buildPath = (w: number, h: number, frac: number, sag1 = 0, sag2 = 0) => {
    const y = frac * h
    const cpY1 = 0.70 * h + sag1
    const cpY2 = 0.46 * h + sag2
    return side === 'left'
      ? `M ${(0.50 * w).toFixed(1)} ${(0.52 * h).toFixed(1)} C ${(0.68 * w).toFixed(1)} ${cpY1.toFixed(1)}, ${(0.88 * w).toFixed(1)} ${cpY2.toFixed(1)}, ${(0.96 * w).toFixed(1)} ${y.toFixed(1)} L ${(w + 15).toFixed(1)} ${y.toFixed(1)}`
      : `M ${(0.50 * w).toFixed(1)} ${(0.52 * h).toFixed(1)} C ${(0.32 * w).toFixed(1)} ${cpY1.toFixed(1)}, ${(0.12 * w).toFixed(1)} ${cpY2.toFixed(1)}, ${(0.04 * w).toFixed(1)} ${y.toFixed(1)} L -15 ${y.toFixed(1)}`
  }

  useLayoutEffect(() => {
    if (animatingRef.current) return
    const d = buildPath(box.w, box.h, plugFrac)
    outerRef.current?.setAttribute('d', d)
    mainRef.current?.setAttribute('d', d)
    if (!dir && liquidGroupRef.current) liquidGroupRef.current.style.opacity = '0'
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box.w, box.h, plugFrac, side, dir])

  useEffect(() => {
    const hideLiquid = () => {
      if (liquidGroupRef.current) liquidGroupRef.current.style.opacity = '0'
      for (const el of [auraRef.current, bulgeRef.current, tailRef.current, midRef.current, headRef.current, coreRef.current, trailBeadRef.current]) {
        if (el) el.setAttribute('opacity', '0')
      }
    }

    if (!dir) {
      animatingRef.current = false
      const { w, h } = boxRef.current
      const d = buildPath(w, h, plugFracRef.current)
      outerRef.current?.setAttribute('d', d)
      mainRef.current?.setAttribute('d', d)
      hideLiquid()
      return
    }

    animatingRef.current = true
    const durSec = dir === 'back' ? 1.95 : 1.25
    const settleSec = dir === 'back' ? 0.45 : 0.35
    const totalSec = durSec + settleSec
    const startMs = performance.now()
    let rafId = 0

    const segPath = (pathEl: SVGPathElement, sA: number, sB: number, steps = 6) => {
      let d = ''
      for (let i = 0; i <= steps; i++) {
        const s = sA + ((sB - sA) * i) / steps
        const pt = pathEl.getPointAtLength(s)
        d += (i === 0 ? 'M ' : ' L ') + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1)
      }
      return d
    }

    const tick = (now: number) => {
      const elapsedSec = (now - startMs) / 1000
      const { w, h } = boxRef.current
      const frac = plugFracRef.current

      let sag1 = 0
      let sag2 = 0
      if (elapsedSec < durSec) {
        const u = elapsedSec / durSec
        const weight = Math.sin(u * Math.PI)
        sag1 = 16 * weight
        sag2 = 8 * weight
      } else if (elapsedSec < totalSec) {
        const after = elapsedSec - durSec
        const rebound = -Math.exp(-5.5 * after) * Math.sin((after / settleSec) * Math.PI * 3)
        sag1 = 11 * rebound
        sag2 = 6 * rebound
      }

      const d = buildPath(w, h, frac, sag1, sag2)
      const mainEl = mainRef.current
      outerRef.current?.setAttribute('d', d)
      if (!mainEl) return
      mainEl.setAttribute('d', d)

      if (elapsedSec <= durSec) {
        if (liquidGroupRef.current) liquidGroupRef.current.style.opacity = '1'
        const totalLen = mainEl.getTotalLength()
        const cx = w * 0.5
        const cy = h * 0.5
        let lo = 0
        let hi = totalLen
        for (let i = 0; i < 12; i++) {
          const mid = (lo + hi) * 0.5
          const pt = mainEl.getPointAtLength(mid)
          if (Math.hypot(pt.x - cx, pt.y - cy) < 35) lo = mid
          else hi = mid
        }
        const sEdge = Math.min(hi, totalLen * 0.45)
        const sPlug = Math.max(sEdge + 12, totalLen - 2)
        const clampS = (s: number) => Math.max(sEdge, Math.min(sPlug, s))

        const u = Math.min(1, elapsedSec / durSec)
        const prog = dir === 'back'
          ? cubicBezier(0.62, 0.08, 0.35, 1.0, u)
          : cubicBezier(0.32, 0.05, 0.22, 1.0, u)

        const sHead = dir === 'out'
          ? sPlug - prog * (sPlug - sEdge)
          : sEdge + prog * (sPlug - sEdge)
        const trailSign = dir === 'out' ? 1 : -1

        const pHead = mainEl.getPointAtLength(sHead)
        const tokenDist = Math.hypot(pHead.x - cx, pHead.y - cy)
        const tokenAlpha = Math.min(1, Math.max(0, (tokenDist - 35) / 15))
        const plugAlpha = Math.min(1, Math.max(0, (sPlug - sHead) / 12))
        const alpha = Math.min(tokenAlpha, plugAlpha)

        const sFront = clampS(sHead - trailSign * 6)
        const sBulgeEnd = clampS(sHead + trailSign * 24)
        const sMidEnd = clampS(sHead + trailSign * 12)
        const sTailEnd = clampS(sHead + trailSign * 28)

        const bulgeD = segPath(mainEl, sFront, sBulgeEnd, 6)
        auraRef.current?.setAttribute('d', bulgeD)
        auraRef.current?.setAttribute('opacity', (0.52 * alpha).toFixed(3))
        bulgeRef.current?.setAttribute('d', bulgeD)
        bulgeRef.current?.setAttribute('opacity', (0.65 * alpha).toFixed(3))

        tailRef.current?.setAttribute('d', segPath(mainEl, sMidEnd, sTailEnd, 5))
        tailRef.current?.setAttribute('opacity', (0.78 * alpha).toFixed(3))

        midRef.current?.setAttribute('d', segPath(mainEl, sHead, sMidEnd, 5))
        midRef.current?.setAttribute('opacity', (0.96 * alpha).toFixed(3))

        const pA = mainEl.getPointAtLength(Math.max(0, sHead - 2))
        const pB = mainEl.getPointAtLength(Math.min(totalLen, sHead + 2))
        const vx = dir === 'out' ? pA.x - pB.x : pB.x - pA.x
        const vy = dir === 'out' ? pA.y - pB.y : pB.y - pA.y
        const deg = (Math.atan2(vy, vx) * 180) / Math.PI
        const xform = `translate(${pHead.x.toFixed(1)}, ${pHead.y.toFixed(1)}) rotate(${deg.toFixed(1)})`

        headRef.current?.setAttribute('transform', xform)
        headRef.current?.setAttribute('opacity', alpha.toFixed(3))
        coreRef.current?.setAttribute('transform', xform)
        coreRef.current?.setAttribute('opacity', alpha.toFixed(3))

        const sBead = sHead + trailSign * 34
        const inSpan = sBead >= sEdge && sBead <= sPlug
        if (inSpan && trailBeadRef.current) {
          const pBead = mainEl.getPointAtLength(sBead)
          trailBeadRef.current.setAttribute('cx', pBead.x.toFixed(1))
          trailBeadRef.current.setAttribute('cy', pBead.y.toFixed(1))
          trailBeadRef.current.setAttribute('opacity', (0.8 * alpha).toFixed(3))
        } else if (trailBeadRef.current) {
          trailBeadRef.current.setAttribute('opacity', '0')
        }
      } else {
        hideLiquid()
      }

      if (elapsedSec < totalSec) {
        rafId = requestAnimationFrame(tick)
      } else {
        animatingRef.current = false
        const rest = buildPath(w, h, frac)
        outerRef.current?.setAttribute('d', rest)
        mainRef.current?.setAttribute('d', rest)
        hideLiquid()
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      animatingRef.current = false
      cancelAnimationFrame(rafId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dir, side])

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      viewBox={`0 0 ${box.w} ${box.h}`}
    >
      <defs>
        <filter
          id={`wireGlow-${side}`}
          filterUnits="userSpaceOnUse"
          x="-40"
          y="-40"
          width={box.w + 80}
          height={box.h + 80}
        >
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g>
        <path
          ref={outerRef}
          fill="none"
          stroke="rgba(171,184,255,0.10)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          ref={mainRef}
          fill="none"
          stroke="rgba(171,184,255,0.42)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <g ref={liquidGroupRef} filter={`url(#wireGlow-${side})`}>
          <path ref={auraRef} fill="none" stroke="rgba(171,184,255,0.52)" strokeWidth="12" strokeLinecap="round" />
          <path ref={bulgeRef} fill="none" stroke="rgba(198,210,255,0.48)" strokeWidth="7.5" strokeLinecap="round" />
          <path ref={tailRef} fill="none" stroke="#abb8ff" strokeWidth="3" strokeLinecap="round" />
          <path ref={midRef} fill="none" stroke="#dce4ff" strokeWidth="4.8" strokeLinecap="round" />
          <ellipse ref={headRef} cx="0" cy="0" rx="5.4" ry="3.3" fill="#eef3ff" />
          <ellipse ref={coreRef} cx="0" cy="0" rx="3.1" ry="1.8" fill="#ffffff" />
          <circle ref={trailBeadRef} cx="0" cy="0" r="1.9" fill="#d8e0ff" />
        </g>
      </g>
    </svg>
  )
}

function Plug({ side, live, frac = 0.44 }: { side: 'left' | 'right'; live?: boolean; frac?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ top: `${frac * 100}%` }}
      className={
        'pointer-events-none absolute hidden -translate-y-1/2 xl:block ' +
        (side === 'left' ? '-right-6' : '-left-6')
      }
    >
      <span
        className={
          'block h-[18px] w-[11px] rounded-[3px] border bg-ink-800 shadow-[0_2px_10px_rgba(0,0,0,0.45)] transition-colors duration-300 ' +
          (live ? 'border-[rgba(198,208,255,0.9)] shadow-[0_0_14px_rgba(171,184,255,0.7)]' : 'border-[rgba(171,184,255,0.5)]')
        }
      >
        <span className="mt-1 block h-[2px] w-full bg-[rgba(171,184,255,0.35)]" />
      </span>
    </span>
  )
}
