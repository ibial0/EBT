import { useEffect, useMemo, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownUp, Check, ChevronDown, Info, Plus, Route as RouteIcon, UserRoundPlus, Wallet, X } from 'lucide-react'
import { formatUnits } from 'viem'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { getPublicClient, getWalletClient } from 'wagmi/actions'
import { CHAINS, getChain, type Address } from '../config/chains'
import { NON_EVM_NETWORKS, getNetwork, type NetworkEntry } from '../config/networks'
import { WETH, isNativeToken, nativeToken, tokensForChain, type TokenCfg } from '../config/tokens'
import { useSearchParams } from 'react-router-dom'
import { initiateWithdrawEth, rememberWithdrawal } from '../lib/orbitWithdraw'
import { Card, Button, Badge, Row, notify, ChainLogo, NetworkLogo, TokenIcon, Spinner } from '../components/ui'
import {
  NON_EVM_BRIDGE_ENDPOINTS,
  quoteNonEvmCctp,
  type NonEvmBridgeEndpoint,
} from '../lib/nonEvmBridge'
import { loadNonEvmPortfolio } from '../lib/nonEvmPortfolio'
import { WALLET_FAMILIES, openWalletModal, useNonEvmWallets } from '../lib/walletsMulti'
import { ChainChip, ChainSelect } from '../components/ChainSelect'
import { ConnectButton } from '../components/Layout'
import { Timeline } from '../components/Timeline'
import { addActivity, updateStep, updateActivity, finalizeFromSteps, getActivity, useActivity, cancelActivity, type ActivityItem } from '../lib/activity'
import { fetchCctpFees, maxFeeFor } from '../lib/cctp'
import { quoteBest, applySlippage, erc20Abi } from '../lib/uniswap'
import { quoteBestV2, executeV2Swap } from '../lib/dexV2'
import { executeCctpBridge, executeOpDeposit, executeOrbitDeposit } from '../lib/bridgeExec'
import { executeSwap } from '../lib/swapExec'
import { ACROSS_ETH_CHAINS, ACROSS_WETH, fetchAcrossFee, executeAcrossBridge } from '../lib/across'
import { startTracking } from '../lib/tracker'
import { startDepositTracking } from '../lib/depositTrack'
import { startOrbitTracking } from '../lib/orbitTrack'
import { startAcrossTracking } from '../lib/acrossTrack'
import { ORBIT_ETH_NATIVE, orbitBridgeFor } from '../config/orbit'
import { fmt, safeParseUnits } from '../lib/format'
import { checkGas, walletSender } from '../lib/tx'
import { decodeTxError } from '../lib/errors'
import { ensureWalletChain, wagmiConfig } from '../lib/wallet'
import { findRoutes, nativeSymbolOf, noRouteReason, reachableDestTokens, usableSourceTokens, type RouteCandidate, type RouteLeg } from '../lib/routes'
import { TokenPicker, syntheticChainForNetwork, type PickerGroup } from '../components/TokenPicker'

const NATIVE = '0x0000000000000000000000000000000000000000'

/** Arbitrum bridge portal slugs, used for chains whose exit is a canonical withdrawal. */
const PORTAL_SLUG: Record<number, string> = { 46630: 'robinhood-chain-testnet', 11155111: 'sepolia' }
const keyOf = (chainId: number, address: string) => `${chainId}:${address.toLowerCase()}`

interface ExtraBridgeChain {
  synthId: number
  network: NetworkEntry
  endpoint?: NonEvmBridgeEndpoint
  tokens: TokenCfg[]
}

const EXTRA_BRIDGE_DEFS: Array<{ synthId: number; networkId: string; extraTokens: Array<{ symbol: string; name: string; address: string; decimals: number; color: string }> }> = [
  {
    synthId: -101,
    networkId: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
    extraTokens: [
      { symbol: 'USDC', name: 'USD Coin (Circle Devnet)', address: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', decimals: 6, color: '#2775ca' },
      { symbol: 'EURC', name: 'Euro Coin (Circle Devnet)', address: 'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr', decimals: 6, color: '#1a5cff' },
      { symbol: 'SOL', name: 'Solana (Native)', address: 'So11111111111111111111111111111111111111112', decimals: 9, color: '#9945ff' },
    ],
  },
  {
    synthId: -102,
    networkId: 'sui:69WiPg3DAQiwdxfncX6wYQ2siKwAe6L9BZthQea3JNMD',
    extraTokens: [
      { symbol: 'USDC', name: 'USD Coin (Circle Testnet)', address: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC', decimals: 6, color: '#2775ca' },
      { symbol: 'SUI', name: 'Sui (Native)', address: '0x2::sui::SUI', decimals: 9, color: '#4da2ff' },
    ],
  },
  {
    synthId: -103,
    networkId: 'aptos:2',
    extraTokens: [
      { symbol: 'USDC', name: 'USD Coin (Aptos FA)', address: '0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832', decimals: 6, color: '#2775ca' },
      { symbol: 'APT', name: 'Aptos Coin (Native)', address: '0x1::aptos_coin::AptosCoin', decimals: 8, color: '#38bdf8' },
    ],
  },
  {
    synthId: -104,
    networkId: 'starknet:SN_SEPOLIA',
    extraTokens: [
      { symbol: 'USDC', name: 'USD Coin (Starknet Sepolia)', address: '0x0512feAc6339Ff7889822cb5aA2a86C848e9D392bB0E3E237C008674feeD8343', decimals: 6, color: '#2775ca' },
      { symbol: 'STRK', name: 'Starknet Token', address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d', decimals: 18, color: '#8b5cf6' },
      { symbol: 'ETH', name: 'Ether (Starknet Sepolia)', address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', decimals: 18, color: '#627eea' },
    ],
  },
  {
    synthId: -105,
    networkId: 'stellar:testnet',
    extraTokens: [
      { symbol: 'USDC', name: 'USD Coin (Stellar Testnet)', address: 'USDC-GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', decimals: 7, color: '#2775ca' },
      { symbol: 'EURC', name: 'Euro Coin (Stellar Testnet)', address: 'EURC-GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO', decimals: 7, color: '#1a5cff' },
      { symbol: 'XLM', name: 'Lumens (Native)', address: 'native', decimals: 7, color: '#cbd5e1' },
    ],
  },
  {
    synthId: -106,
    networkId: 'algorand:testnet-v1.0',
    extraTokens: [
      { symbol: 'USDC', name: 'USD Coin (Algorand ASA 10458941)', address: '10458941', decimals: 6, color: '#2775ca' },
      { symbol: 'ALGO', name: 'Algorand (Native)', address: 'native', decimals: 6, color: '#94a3b8' },
    ],
  },
  {
    synthId: -107,
    networkId: 'near:testnet',
    extraTokens: [
      { symbol: 'USDC', name: 'USD Coin (NEAR Testnet)', address: '3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af', decimals: 6, color: '#2775ca' },
      { symbol: 'NEAR', name: 'NEAR (Native)', address: 'native', decimals: 24, color: '#00ec97' },
    ],
  },
  {
    synthId: -108,
    networkId: 'cosmos:grand-1',
    extraTokens: [
      { symbol: 'USDC', name: 'USD Coin (Noble Testnet)', address: 'uusdc', decimals: 6, color: '#2775ca' },
    ],
  },
  {
    synthId: -109,
    networkId: 'polkadot:westend-asset-hub',
    extraTokens: [
      { symbol: 'USDC', name: 'USD Coin (Polkadot Asset Hub)', address: '1337', decimals: 6, color: '#2775ca' },
      { symbol: 'WND', name: 'Westend (Native)', address: 'native', decimals: 12, color: '#e6007a' },
    ],
  },
  {
    synthId: -110,
    networkId: 'xrpl:1',
    extraTokens: [
      { symbol: 'USDC', name: 'USD Coin (XRPL Testnet)', address: 'rHuGNhqTG32mfmAvWA8hUyWRLV3tCSwKQt', decimals: 6, color: '#2775ca' },
      { symbol: 'XRP', name: 'XRP (Native)', address: 'native', decimals: 6, color: '#cbd5e1' },
    ],
  },
]

const EXTRA_BRIDGE_MAP = new Map<number, ExtraBridgeChain>(
  EXTRA_BRIDGE_DEFS.flatMap((d) => {
    const net = getNetwork(d.networkId)
    if (!net) return []
    const ep = NON_EVM_BRIDGE_ENDPOINTS.find((e) => e.network.id === d.networkId)
    const tokens: TokenCfg[] = d.extraTokens.map((t) => ({
      chainId: d.synthId,
      address: t.address as Address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      kind: t.symbol === 'USDC' ? 'usdc' : 'token',
      color: t.color,
      verified: true,
    }))
    return [[d.synthId, { synthId: d.synthId, network: net, endpoint: ep, tokens }]]
  }),
)

const EXTRA_BRIDGE_LIST: ExtraBridgeChain[] = [...EXTRA_BRIDGE_MAP.values()]
const EXTRA_SYNTH_BY_NETWORK_ID = new Map<string, number>(EXTRA_BRIDGE_LIST.map((x) => [x.network.id, x.synthId]))

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

function legLabel(_index: number, leg: RouteLeg): string {
  if (leg.kind === 'swap') {
    const a = symbolOn(leg.chainId, leg.tokenIn)
    const b = symbolOn(leg.chainId, leg.tokenOut)
    return `Swap ${a.symbol} → ${b.symbol} on ${getChain(leg.chainId)?.short}`
  }
  if (leg.kind === 'cctp') return `Bridge USDC ${getChain(leg.from)?.short} → ${getChain(leg.to)?.short}`
  if (leg.kind === 'across') {
    const sym = leg.isNative ? nativeSymbolOf(leg.from) : symbolOn(leg.from, leg.inToken).symbol
    return `Across ${sym} ${getChain(leg.from)?.short} → ${getChain(leg.to)?.short}`
  }
  return `Bridge ${nativeSymbolOf(leg.from)} ${getChain(leg.from)?.short} → ${getChain(leg.to)?.short}`
}

/** Visual route: source -> protocol -> destination, with real icons across both EVM and non-EVM networks. */
function RoutePath({
  fromId,
  toId,
  source,
  dest,
  legs,
  overrideLabel,
}: {
  fromId: number
  toId: number
  source?: TokenCfg | null
  dest?: TokenCfg | null
  legs?: RouteLeg[]
  overrideLabel?: string
}) {
  const fromChain = fromId > 0 ? getChain(fromId) : undefined
  const toChain = toId > 0 ? getChain(toId) : undefined
  const fromExtra = fromId < 0 ? EXTRA_BRIDGE_MAP.get(fromId) : undefined
  const toExtra = toId < 0 ? EXTRA_BRIDGE_MAP.get(toId) : undefined

  const bridgeLeg = legs?.find((l) => l.kind !== 'swap')
  const hasSwap = Boolean(legs?.some((l) => l.kind === 'swap'))
  const baseLabel =
    overrideLabel ??
    (bridgeLeg?.kind === 'cctp'
      ? 'CCTP v2'
      : bridgeLeg?.kind === 'across'
        ? 'Across v3'
        : bridgeLeg?.kind === 'portal'
          ? 'OP portal'
          : bridgeLeg?.kind === 'arbitrum'
            ? 'Arbitrum'
            : 'route')
  const label = !overrideLabel && hasSwap && bridgeLeg ? `${baseLabel} + Swap` : baseLabel

  return (
    <div className="grid grid-cols-[auto_minmax(40px,1fr)_auto] items-center gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {fromExtra ? (
          <NetworkLogo network={fromExtra.network} size={36} />
        ) : fromChain ? (
          <ChainLogo chain={fromChain} size={36} />
        ) : null}
        <div className="min-w-0">
          <div className="display truncate text-[16px] leading-6 text-t1">{source?.symbol ?? '—'}</div>
          <div className="truncate text-[10px] leading-4 text-t2">{fromExtra?.network.short ?? fromChain?.short}</div>
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
          <div className="truncate text-[10px] leading-4 text-t2">{toExtra?.network.short ?? toChain?.short}</div>
        </div>
        {toExtra ? (
          <NetworkLogo network={toExtra.network} size={36} />
        ) : toChain ? (
          <ChainLogo chain={toChain} size={36} />
        ) : null}
      </div>
    </div>
  )
}

export default function Bridge() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const nonEvmWallets = useNonEvmWallets()

  // Chains can be deep-linked: /bridge?from=46630&to=11155111 opens that pair directly.
  const [searchParams, setSearchParams] = useSearchParams()
  const paramId = (key: string, fallback: number) => {
    const n = Number(searchParams.get(key))
    return Number.isFinite(n) && n > 0 ? n : fallback
  }
  const [fromId, setFromId] = useState(() => paramId('from', 11155111))
  const [toId, setToId] = useState(() => paramId('to', 84532))

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    next.set('from', String(fromId))
    next.set('to', String(toId))
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromId, toId])
  const [sourceId, setSourceId] = useState(keyOf(11155111, NATIVE))
  const [destId, setDestId] = useState(keyOf(84532, NATIVE))
  const [amount, setAmount] = useState('')
  const [fast, setFast] = useState(true)
  const [slippageBps, setSlippageBps] = useState(100)
  const [recipient, setRecipient] = useState('')
  const [editRecipient, setEditRecipient] = useState(false)
  const [, setAmountFocused] = useState(false)
  const [chipsOpen, setChipsOpen] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)
  const chipsTimer = useRef<number | null>(null)
  const openChips = () => {
    if (chipsTimer.current) {
      window.clearTimeout(chipsTimer.current)
      chipsTimer.current = null
    }
    setChipsOpen(true)
  }
  const scheduleChipsClose = () => {
    if (chipsTimer.current) window.clearTimeout(chipsTimer.current)
    chipsTimer.current = window.setTimeout(() => setChipsOpen(false), 180)
  }
  const [pick, setPick] = useState<'from' | 'to' | 'source' | 'dest' | null>(null)
  const [routeIdx, setRouteIdx] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | undefined>()

  const fromExtra = fromId < 0 ? EXTRA_BRIDGE_MAP.get(fromId) : undefined
  const toExtra = toId < 0 ? EXTRA_BRIDGE_MAP.get(toId) : undefined
  const isNonEvmBridge = Boolean(fromExtra || toExtra)

  const from = fromId > 0 ? getChain(fromId) : undefined
  const to = toId > 0 ? getChain(toId) : undefined
  const fromShort = fromExtra?.network.short ?? from?.short ?? 'Source'
  const toShort = toExtra?.network.short ?? to?.short ?? 'Destination'

  // Auto-select connected destination non-EVM wallet when bridging EVM -> Non-EVM (or Non-EVM -> Non-EVM)
  const connectedToNonEvmAddr = toExtra && toExtra.network.walletFamily !== 'evm'
    ? nonEvmWallets[toExtra.network.walletFamily]?.address ?? ''
    : ''
  const defaultRecipient = toExtra ? connectedToNonEvmAddr : (address ?? '')
  const effectiveRecipient = editRecipient ? recipient.trim() : defaultRecipient

  // Load connected non-EVM balances for picker + source balance display
  const connectedFamilies = Object.keys(nonEvmWallets)
  const nonEvmPortfolioQ = useQuery({
    queryKey: ['bridge-nonevm-bal', connectedFamilies.map((f) => `${f}:${nonEvmWallets[f as keyof typeof nonEvmWallets]?.address ?? ''}`).join(',')],
    queryFn: () => loadNonEvmPortfolio(nonEvmWallets),
    enabled: connectedFamilies.length > 0,
    staleTime: 20_000,
    retry: 0,
  })
  const nonEvmBalMapBySynth = useMemo(() => {
    const out = new Map<number, Record<string, bigint | null>>()
    for (const h of nonEvmPortfolioQ.data ?? []) {
      const sid = EXTRA_SYNTH_BY_NETWORK_ID.get(h.networkId)
      if (sid == null) continue
      const def = EXTRA_BRIDGE_MAP.get(sid)
      const map: Record<string, bigint | null> = {}
      const natDef = def?.tokens.find((tk) => tk.symbol === h.network.nativeCurrency.symbol)
      if (natDef) map[natDef.address.toLowerCase()] = h.native
      for (const tk of h.tokens) {
        map[tk.address.toLowerCase()] = tk.balance
        const symMatch = def?.tokens.find((x) => x.symbol === tk.symbol)
        if (symMatch) map[symMatch.address.toLowerCase()] = tk.balance
      }
      out.set(sid, map)
    }
    return out
  }, [nonEvmPortfolioQ.data])

  /**
   * Route reachability is the expensive part of this page (a search over every token
   * pair), so it is computed after the first paint instead of inside it. The page shows
   * its normal token list immediately and the "route available" ordering settles a
   * moment later — no more ~700ms blank before the panel appears.
   */
  const [reachableSources, setReachableSources] = useState<TokenCfg[]>([])
  useEffect(() => {
    if (isNonEvmBridge) {
      setReachableSources([])
      return
    }
    let alive = true
    const id = window.setTimeout(() => {
      if (alive) setReachableSources(usableSourceTokens(fromId, toId))
    }, 0)
    return () => {
      alive = false
      window.clearTimeout(id)
    }
  }, [isNonEvmBridge, fromId, toId])

  const sourceOptions = useMemo(() => {
    if (fromExtra) return fromExtra.tokens
    const all = [nativeToken(fromId), ...tokensForChain(fromId)]
    if (toExtra) return all
    const ok = new Set(reachableSources.map((t) => t.address.toLowerCase()))
    return [...all].sort((a, b) => Number(ok.has(b.address.toLowerCase())) - Number(ok.has(a.address.toLowerCase())))
  }, [fromId, fromExtra, toExtra, reachableSources])

  const sourceNotes = useMemo(() => {
    const out: Record<string, string> = {}
    if (fromExtra) {
      const hasDomain = fromExtra.endpoint?.cctpDomain != null
      for (const t of fromExtra.tokens) {
        if (!hasDomain) {
          out[t.address.toLowerCase()] = 'Circle Iris Sandbox does not support CCTP v2 for this domain yet.'
        } else if (t.symbol !== 'USDC') {
          out[t.address.toLowerCase()] = `Only Circle USDC bridges from ${fromExtra.network.short} via CCTP v2.`
        }
      }
      return out
    }
    if (toExtra) {
      const hasDomain = Boolean(from?.cctpDomain != null && from?.usdc) && toExtra.endpoint?.cctpDomain != null
      for (const t of sourceOptions) {
        if (t.symbol !== 'USDC' || !hasDomain) {
          out[t.address.toLowerCase()] = hasDomain
            ? `Routes to ${toExtra.network.short} use Circle CCTP v2 USDC.`
            : `${fromShort} or ${toExtra.network.short} does not have an active CCTP v2 domain pair.`
        }
      }
      return out
    }
    const ok = new Set(reachableSources.map((t) => t.address.toLowerCase()))
    for (const t of sourceOptions) {
      if (!ok.has(t.address.toLowerCase())) out[t.address.toLowerCase()] = noRouteReason(fromId, toId, t)
    }
    return out
  }, [sourceOptions, reachableSources, fromId, toId, fromExtra, toExtra, from, fromShort])

  const source = useMemo(
    () =>
      sourceOptions.find((t) => keyOf(fromId, t.address) === sourceId) ??
      (isNonEvmBridge ? sourceOptions.find((t) => t.symbol === 'USDC') : reachableSources[0]) ??
      sourceOptions[0],
    [sourceOptions, sourceId, fromId, isNonEvmBridge, reachableSources],
  )

  const [reachableDests, setReachableDests] = useState<TokenCfg[]>([])
  useEffect(() => {
    if (isNonEvmBridge || !source) {
      setReachableDests([])
      return
    }
    let alive = true
    const token = source
    const id = window.setTimeout(() => {
      if (alive) setReachableDests(reachableDestTokens(fromId, toId, token))
    }, 0)
    return () => {
      alive = false
      window.clearTimeout(id)
    }
  }, [isNonEvmBridge, fromId, toId, source])
  const destOptions = useMemo(() => {
    if (toExtra) return toExtra.tokens
    const all = [nativeToken(toId), ...tokensForChain(toId)]
    if (fromExtra) return all
    const ok = new Set(reachableDests.map((t) => t.address.toLowerCase()))
    return [...all].sort((a, b) => Number(ok.has(b.address.toLowerCase())) - Number(ok.has(a.address.toLowerCase())))
  }, [toId, toExtra, fromExtra, reachableDests])

  const dest = useMemo(
    () =>
      destOptions.find((t) => keyOf(toId, t.address) === destId) ??
      (isNonEvmBridge ? destOptions.find((t) => t.symbol === 'USDC') : reachableDests[0]) ??
      destOptions[0],
    [destOptions, destId, toId, isNonEvmBridge, reachableDests],
  )

  const routes = useMemo(
    () => (isNonEvmBridge || !source || !dest ? [] : findRoutes(fromId, toId, source, dest)),
    [isNonEvmBridge, fromId, toId, source, dest],
  )
  useEffect(() => setRouteIdx(0), [fromId, toId, sourceId, destId])
  const route: RouteCandidate | null = routes[routeIdx] ?? routes[0] ?? null
  const hasCctpLeg = route
    ? route.legs.some((l) => l.kind === 'cctp')
    : Boolean((fromExtra?.endpoint?.cctpDomain ?? from?.cctpDomain) != null && (toExtra?.endpoint?.cctpDomain ?? to?.cctpDomain) != null)
  const hasAcrossLeg = Boolean(route?.legs.some((l) => l.kind === 'across'))

  // Check if non-EVM CCTP v2 route applies
  const srcDomain = fromExtra ? fromExtra.endpoint?.cctpDomain : (from?.usdc ? from.cctpDomain : undefined)
  const dstDomain = toExtra ? toExtra.endpoint?.cctpDomain : (to?.usdc ? to.cctpDomain : undefined)
  const nonEvmCctpEligible =
    isNonEvmBridge &&
    fromId !== toId &&
    srcDomain != null &&
    dstDomain != null &&
    source?.symbol === 'USDC' &&
    dest?.symbol === 'USDC'

  const nonEvmBlockerReason = useMemo(() => {
    if (!isNonEvmBridge) return null
    if (fromId === toId) return 'Source and destination network must be different.'
    if (fromExtra?.network.key === 'suiTestnet' || toExtra?.network.key === 'suiTestnet') {
      return 'Sui Testnet (CCTP Domain 8): Circle Iris Sandbox /v2/burn/USDC/fees currently returns HTTP 400 (Invalid source/destination domain id) for Domain 8.'
    }
    if (srcDomain == null || dstDomain == null) {
      return `No live CCTP v2 domain route connects ${fromShort} and ${toShort}.`
    }
    if (source?.symbol !== 'USDC' || dest?.symbol !== 'USDC') {
      return `Cross-ecosystem routes between ${fromShort} and ${toShort} only support Circle USDC via CCTP v2.`
    }
    return null
  }, [isNonEvmBridge, fromId, toId, fromExtra, toExtra, srcDomain, dstDomain, fromShort, toShort, source?.symbol, dest?.symbol])

  useEffect(() => {
    if (source && !sourceOptions.some((t) => t.address.toLowerCase() === source.address.toLowerCase())) {
      const first = (isNonEvmBridge ? sourceOptions.find((t) => t.symbol === 'USDC') : reachableSources[0]) ?? sourceOptions[0]
      if (first) setSourceId(keyOf(fromId, first.address))
    }
  }, [fromId, sourceOptions, source, isNonEvmBridge, reachableSources])

  useEffect(() => {
    if (dest && !destOptions.some((t) => t.address.toLowerCase() === dest.address.toLowerCase())) {
      const first = (isNonEvmBridge ? destOptions.find((t) => t.symbol === 'USDC') : reachableDests[0]) ?? destOptions[0]
      if (first) setDestId(keyOf(toId, first.address))
    }
  }, [toId, destOptions, dest, isNonEvmBridge, reachableDests])

  const sourceClient = useMemo(
    () => (fromId > 0 ? getPublicClient(wagmiConfig, { chainId: fromId as never }) : undefined),
    [fromId],
  )

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
    enabled: Boolean(fromId > 0 && sourceClient && address && source),
    refetchInterval: 20_000,
  })

  const nonEvmSrcBal =
    fromExtra && source
      ? (nonEvmBalMapBySynth.get(fromExtra.synthId)?.[source.address.toLowerCase()] ?? null)
      : null

  const srcGas = useQuery({
    queryKey: ['gas-src', fromId, address],
    queryFn: () => (sourceClient && from && address ? checkGas(sourceClient, from, address as Address) : null),
    enabled: Boolean(fromId > 0 && from && sourceClient && address),
    refetchInterval: 20_000,
  })

  const fees = useQuery({
    queryKey: ['cctp-fees', srcDomain, dstDomain],
    queryFn: () => fetchCctpFees(srcDomain!, dstDomain!),
    enabled: Boolean(srcDomain != null && dstDomain != null && srcDomain !== dstDomain),
    staleTime: 45_000,
    retry: 2,
  })

  const amountIn = safeParseUnits(amount, source?.decimals ?? 18)
  const balance = fromExtra ? nonEvmSrcBal : (sourceBalance.data ?? null)
  const sourceWalletConnected = fromExtra
    ? Boolean(nonEvmWallets[fromExtra.network.walletFamily as keyof typeof nonEvmWallets]?.address)
    : isConnected
  const insufficient = sourceWalletConnected && source != null && amountIn > 0n && balance != null && balance < amountIn

  const nonEvmCctpQuote = useQuery({
    queryKey: ['nonevm-cctp-quote', srcDomain, dstDomain, amount],
    queryFn: () =>
      quoteNonEvmCctp({
        sourceDomain: srcDomain!,
        destDomain: dstDomain!,
        sourceName: fromShort,
        destName: toShort,
        amountDecimal: amount,
      }),
    enabled: Boolean(nonEvmCctpEligible && Number(amount) > 0),
    staleTime: 25_000,
    retry: 0,
  })

  const estimate = useQuery({
    queryKey: ['route-est', route?.id, fromId, toId, source?.address, dest?.address, amountIn.toString(), fast],
    queryFn: async () => {
      if (!route || !source || !dest || amountIn <= 0n) return null
      let current = amountIn
      const lines: Array<{ leg: string; detail: string }> = []
      for (let i = 0; i < route.legs.length; i++) {
        const leg = route.legs[i]
        if (leg.kind === 'swap') {
          const chain = getChain(leg.chainId)!
          const client = getPublicClient(wagmiConfig, { chainId: leg.chainId as never })!
          if (chain.uniswap) {
            const q = await quoteBest(client, chain, leg.tokenIn, leg.tokenOut, current)
            if (!q) return { amountOut: 0n, lines, failed: `No pool offers this swap on ${chain.short} right now.` }
            current = q.amountOut
            lines.push({
              leg: legLabel(i, leg),
              detail: `Pool fee is inside the quote${q.priceImpactBps ? `, price impact ${q.priceImpactBps}bps` : ''}.`,
            })
          } else if (chain.dexV2?.length) {
            const inTok = symbolOn(leg.chainId, leg.tokenIn)
            const outTok = symbolOn(leg.chainId, leg.tokenOut)
            const q = await quoteBestV2(client, chain.id, leg.tokenIn, leg.tokenOut, current, inTok.decimals, outTok.decimals)
            if (!q) return { amountOut: 0n, lines, failed: `No V2 pool offers this swap on ${chain.short} right now.` }
            current = q.amountOut
            lines.push({
              leg: legLabel(i, leg),
              detail: `${q.route}${q.priceImpactBps ? `, impact ${q.priceImpactBps}bps` : ''}.`,
            })
          } else {
            return { amountOut: 0n, lines, failed: `No verified DEX on ${chain.short}.` }
          }
        } else if (leg.kind === 'cctp') {
          const bps = fast ? (fees.data?.fastBps ?? 0) : (fees.data?.standardBps ?? 0)
          const fee = maxFeeFor(current, bps)
          current = current > fee ? current - fee : 0n
          lines.push({ leg: legLabel(i, leg), detail: `Circle CCTP v2, max protocol fee ${fmt(fee, 6, 6)} USDC.` })
        } else if (leg.kind === 'across') {
          const inTok = symbolOn(leg.from, leg.inToken)
          const sym = leg.isNative ? nativeSymbolOf(leg.from) : inTok.symbol
          try {
            const aq = await fetchAcrossFee({
              fromId: leg.from,
              toId: leg.to,
              inputToken: leg.inToken,
              outputToken: leg.outToken,
              amount: current,
              decimals: inTok.decimals,
              symbol: sym,
            })
            current = aq.outputAmount
            lines.push({
              leg: legLabel(i, leg),
              detail: `Across v3 relayer fee ${fmt(aq.totalFee, inTok.decimals, 6)} ${sym} (~${aq.estimatedFillTimeSec}s fill).`,
            })
          } catch (e) {
            return { amountOut: 0n, lines, failed: e instanceof Error ? e.message : 'Across quote unavailable right now.' }
          }
        } else if (leg.kind === 'arbitrum') {
          lines.push({ leg: legLabel(i, leg), detail: 'Canonical Arbitrum Orbit retryable ticket.' })
        } else {
          lines.push({ leg: legLabel(i, leg), detail: 'Canonical OP Stack deposit, no protocol fee.' })
        }
      }
      return { amountOut: current, lines }
    },
    enabled: Boolean(!isNonEvmBridge && route && source && dest && amountIn > 0n),
    staleTime: 10_000,
    retry: 0,
  })

  /** Unified allowlisted chains (EVM + all non-EVM networks) in one all-chains picker */
  const allGroups = useMemo<PickerGroup[]>(() => {
    const coreEvmIds = new Set([11155111, 84532, 421614, 11155420, 1301, 43113, 80002])
    const buildEvm = (c: (typeof CHAINS)[number]): PickerGroup | null => {
      const native = nativeToken(c.id)
      const erc20 = tokensForChain(c.id).filter((t) => t.address !== native.address)
      const list = c.nativeIsUsdc && erc20.length > 0 ? erc20 : [native, ...erc20]
      if (list.length === 0) return null
      return { chain: c, tokens: list, notes: c.id === fromId ? sourceNotes : undefined }
    }

    const coreEvm = CHAINS.filter((c) => coreEvmIds.has(c.id))
      .map(buildEvm)
      .filter((g): g is PickerGroup => Boolean(g))
    const restEvm = CHAINS.filter((c) => !coreEvmIds.has(c.id))
      .map(buildEvm)
      .filter((g): g is PickerGroup => Boolean(g))

    const extra: PickerGroup[] = EXTRA_BRIDGE_LIST.map((x) => {
      const fam = x.network.walletFamily
      const connected = fam === 'evm' || Boolean(nonEvmWallets[fam]?.address)
      return {
        chain: syntheticChainForNetwork(x.network, x.synthId),
        network: x.network,
        tokens: x.tokens,
        notes: x.synthId === fromId ? sourceNotes : undefined,
        nonEvmBalances: nonEvmBalMapBySynth.get(x.synthId),
        walletConnected: connected,
      }
    })

    return [...coreEvm, ...extra, ...restEvm]
  }, [sourceNotes, fromId, nonEvmBalMapBySynth, nonEvmWallets])

  function requireBridgeWallet(net: NetworkEntry | undefined, onConnectedAction: () => void): boolean {
    if (!net || net.walletFamily === 'evm') return true
    const fam = net.walletFamily
    if (nonEvmWallets[fam]?.address) return true
    openWalletModal({
      focusFamily: fam,
      networkName: net.name,
      reason: `Connect a ${WALLET_FAMILIES[fam].label} wallet to use ${net.name} on Bridge.`,
      onConnected: onConnectedAction,
    })
    return false
  }

  const allPickerChains = useMemo(() => allGroups.map((g) => g.chain), [allGroups])

  /** Going back out of an Orbit chain is a canonical withdrawal, not a one-shot bridge. */
  const orbitWithdrawLink = useMemo(() => {
    const cfg = orbitBridgeFor(fromId)
    if (!cfg || cfg.parentChainId !== toId) return null
    const src = PORTAL_SLUG[fromId]
    const dst = PORTAL_SLUG[toId]
    return `https://portal.arbitrum.io/bridge${src && dst ? `?sourceChain=${src}&destinationChain=${dst}` : ''}`
  }, [fromId, toId])

  const activity = activeId ? getActivity(activeId) : undefined

  async function ensureChain(id: number) {
    await ensureWalletChain(id)
  }

  async function run() {
    let createdId: string | null = null
    if (!address) return notify('Connect a wallet first.', 'error')
    if (!from || !to) return notify('Switch to EVM networks to execute on-chain.', 'error')
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
        if (leg.kind === 'portal' || leg.kind === 'arbitrum' || leg.kind === 'across') {
          return [
            base,
            {
              key: `arrive${i}`,
              label: leg.kind === 'across' ? `Relayer fill on ${getChain(leg.to)?.short ?? 'dest'}` : `Arrives on ${getChain(leg.to)?.short ?? 'L2'}`,
              status: 'pending' as const,
              chainId: leg.to,
              note: leg.kind === 'across' ? 'Waiting for Across relayer to fill the intent.' : 'Waiting for the sequencer to include the deposit.',
            },
          ]
        }
        return [base]
      })
      const item = addActivity({
        kind: route.legs.length > 1 ? 'bridge' : route.legs[0].kind === 'portal' ? 'deposit' : 'bridge',
        provider: route.legs.some((l) => l.kind === 'cctp')
          ? 'cctp'
          : route.legs.some((l) => l.kind === 'across')
            ? 'across'
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
            (a, l) => a + (l.kind === 'portal' ? 180000 : l.kind === 'arbitrum' ? 600000 : l.kind === 'cctp' ? 120000 : l.kind === 'across' ? 20000 : 30000),
            0,
          ),
        },
        steps,
      })
      createdId = item.id
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
          const prevLeg = i > 0 ? route.legs[i - 1] : null
          const prevDeliveredNative =
            i === 0
              ? isNativeToken(source)
              : prevLeg?.kind === 'portal' ||
                prevLeg?.kind === 'arbitrum' ||
                (prevLeg?.kind === 'across' &&
                  ACROSS_ETH_CHAINS.has(prevLeg.to) &&
                  prevLeg.outToken.toLowerCase() === (ACROSS_WETH[prevLeg.to] ?? '').toLowerCase())
          const nextLeg = i < route.legs.length - 1 ? route.legs[i + 1] : null
          const wantNativeOut =
            i === route.legs.length - 1
              ? isNativeToken(dest)
              : nextLeg?.kind === 'portal' ||
                nextLeg?.kind === 'arbitrum' ||
                (nextLeg?.kind === 'across' && nextLeg.isNative)
          const wethAddr = WETH[chain.id]?.toLowerCase()
          const isWrappedIn = leg.tokenIn.toLowerCase() === NATIVE || (Boolean(wethAddr) && leg.tokenIn.toLowerCase() === wethAddr)
          const isWrappedOut = leg.tokenOut.toLowerCase() === NATIVE || (Boolean(wethAddr) && leg.tokenOut.toLowerCase() === wethAddr)
          const nativeIn = prevDeliveredNative && isWrappedIn
          const nativeOut = wantNativeOut && isWrappedOut

          if (chain.uniswap) {
            const q = await quoteBest(client, chain, leg.tokenIn, leg.tokenOut, current)
            if (!q) throw new Error(`No pool offers this swap on ${chain.short} right now.`)
            const inTok = symbolOn(leg.chainId, leg.tokenIn)
            const outTok = symbolOn(leg.chainId, leg.tokenOut)
            await executeSwap({
              chain,
              account: address as Address,
              tokenIn: {
                address: nativeIn ? null : (leg.tokenIn as Address),
                symbol: inTok.symbol,
                decimals: inTok.decimals,
              },
              tokenOut: {
                address: nativeOut ? null : (leg.tokenOut as Address),
                symbol: outTok.symbol,
                decimals: outTok.decimals,
              },
              amountIn: current,
              amountOutMinimum: applySlippage(q.amountOut, slippageBps),
              fee: q.fee,
              wallet: sender,
              publicClient: client as never,
              onStep: (_step, state, hash) =>
                updateStep(item.id, `leg${i}`, { status: state === 'active' ? 'active' : state === 'done' ? 'done' : 'failed', hash }),
            })
            current = q.amountOut
          } else if (chain.dexV2?.length) {
            const inTok = symbolOn(leg.chainId, leg.tokenIn)
            const outTok = symbolOn(leg.chainId, leg.tokenOut)
            const q = await quoteBestV2(client, chain.id, leg.tokenIn, leg.tokenOut, current, inTok.decimals, outTok.decimals)
            if (!q) throw new Error(`No V2 pool offers this swap on ${chain.short} right now.`)
            await executeV2Swap({
              chain,
              account: address as Address,
              tokenIn: nativeIn ? null : (leg.tokenIn as Address),
              tokenOut: nativeOut ? null : (leg.tokenOut as Address),
              amountIn: current,
              amountOutMinimum: applySlippage(q.amountOut, slippageBps),
              quote: q,
              wallet: sender,
              publicClient: client,
              onStep: (_step, state, hash) =>
                updateStep(item.id, `leg${i}`, { status: state === 'active' ? 'active' : state === 'done' ? 'done' : 'failed', hash }),
            })
            current = q.amountOut
          } else {
            throw new Error(`No verified DEX on ${chain.short}.`)
          }
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
            onStep: (_step, state, hash) =>
              updateStep(item.id, `leg${i}`, { status: state === 'active' ? 'active' : state === 'done' ? 'done' : 'failed', hash }),
          })
          current = current > maxFee ? current - maxFee : 0n
        } else if (leg.kind === 'across') {
          const inTok = symbolOn(leg.from, leg.inToken)
          const sym = leg.isNative ? nativeSymbolOf(leg.from) : inTok.symbol
          const res = await executeAcrossBridge({
            fromChainId: leg.from,
            toChainId: leg.to,
            inputToken: leg.inToken,
            outputToken: leg.outToken,
            amount: current,
            isNative: leg.isNative,
            decimals: inTok.decimals,
            symbol: sym,
            depositor: address as Address,
            recipient: effectiveRecipient as Address,
            wallet: sender,
            client,
            onStep: (_step, state, hash) =>
              updateStep(item.id, `leg${i}`, { status: state === 'active' ? 'active' : state === 'done' ? 'done' : 'failed', hash }),
          })
          current = res.outputAmount
          updateStep(item.id, `arrive${i}`, { status: 'active', note: 'Across deposit confirmed. Waiting for relayer fill.' })
          startAcrossTracking(item.id, {
            onDone: (st) => notify(st === 'complete' ? 'Across relayer filled the transfer on destination.' : 'Across intent expired before fill.', st === 'complete' ? 'success' : 'error'),
          })
        } else if (leg.kind === 'arbitrum') {
          const cfg = orbitBridgeFor(leg.to)
          if (!cfg) throw new Error(`Missing Arbitrum Orbit bridge config for ${getChain(leg.to)?.short ?? leg.to}.`)
          const l2 = getPublicClient(wagmiConfig, { chainId: leg.to as never })
          if (!l2) throw new Error(`RPC client unavailable for ${getChain(leg.to)?.short ?? leg.to}.`)
          const before = await l2.getBalance({ address: effectiveRecipient as Address }).catch(() => 0n)
          updateActivity(item.id, { meta: { ...(item.meta ?? {}), orbitExpected: String(current), orbitBaseline: String(before) } })
          await executeOrbitDeposit({
            cfg,
            recipient: effectiveRecipient as Address,
            mint: current,
            wallet: sender,
            l1Client: client,
            l2Client: l2,
            onStep: (step, state, hash) =>
              updateStep(item.id, step === 'arrive' ? `arrive${i}` : `leg${i}`, {
                status: state === 'active' ? 'active' : state === 'done' ? 'done' : 'failed',
                hash,
              }),
          })
          updateStep(item.id, `arrive${i}`, { status: 'active', note: 'Retryable ticket submitted. Waiting for the sequencer to redeem it.' })
          startOrbitTracking(item.id, l2, { maxMinutes: 60 })
        } else {
          await executeOpDeposit({
            fromChain: getChain(leg.from)!,
            toChainId: leg.to,
            recipient: effectiveRecipient as Address,
            mint: current,
            wallet: sender,
            client,
            onStep: (_step, state, hash) =>
              updateStep(item.id, `leg${i}`, { status: state === 'active' ? 'active' : state === 'done' ? 'done' : 'failed', hash }),
          })
          const l2 = getPublicClient(wagmiConfig, { chainId: leg.to as never })
          if (l2) {
            updateStep(item.id, `arrive${i}`, { status: 'active' })
            startDepositTracking(item.id, { l1: client, l2 }, {
              onDone: (st) => notify(st === 'complete' ? 'Deposit included on the destination chain.' : 'The deposit was included but reverted.', st === 'complete' ? 'success' : 'error'),
            })
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
      const id = createdId ?? activeId
      if (d.kind === 'rejected') {
        if (id) cancelActivity(id)
        notify('Signature cancelled, the transfer was stopped.', 'info')
      } else {
        notify(`${d.title}: ${d.detail}`, 'error')
        if (id) finalizeFromSteps(id)
      }
    } finally {
      setBusy(null)
    }
  }

  /** Canonical withdrawal for a parent-settled Orbit chain: the bridge button starts it here. */
  async function runWithdraw() {
    if (!isCanonicalWithdraw || amountIn <= 0n || !address) return
    setBusy('start')
    const human = formatUnits(amountIn, 18)
    const item = addActivity({
      kind: 'bridge',
      provider: 'orbit',
      fromChainId: fromId,
      toChainId: toId,
      owner: address,
      tokenIn: { symbol: source?.symbol ?? 'ETH', decimals: 18 },
      amountIn: human,
      amountOut: human,
      status: 'pending',
      steps: [
        { key: 'withdraw', label: `Withdraw on ${fromShort}`, status: 'active', chainId: fromId },
        { key: 'confirm', label: `Wait for ${toShort} confirmation`, status: 'pending', chainId: toId },
        { key: 'claim', label: `Claim on ${toShort}`, status: 'pending', chainId: toId },
      ],
      meta: { routeType: 'orbit-withdraw', routeLabel: 'Canonical withdrawal', txCount: 2, etaMs: 2700000 },
    })
    try {
      const hash = await initiateWithdrawEth(fromId, amountIn)
      updateStep(item.id, 'withdraw', { status: 'done', hash })
      updateStep(item.id, 'confirm', { status: 'active' })
      rememberWithdrawal({ txHash: hash, fromId, toId, amount: human, createdAt: Date.now(), activityId: item.id })
      notify(`Withdrawal started — claim it from Activity once ${toShort} confirms.`, 'success')
      setAmount('')
    } catch (e) {
      const d = decodeTxError(e, fromId)
      updateStep(item.id, 'withdraw', { status: 'failed', note: d.detail })
      finalizeFromSteps(item.id)
      notify(`${d.title}: ${d.detail}`, 'error')
    } finally {
      setBusy(null)
    }
  }

  const hasRoute = Boolean(route) && Boolean(dest)
  /** Robinhood-like Orbit chains settle on their parent: value leaves by withdrawal, not a bridge. */
  const isCanonicalWithdraw = orbitBridgeFor(fromId)?.parentChainId === toId && Boolean(orbitBridgeFor(fromId)?.outbox)
  const nonEvmOutAmt = nonEvmCctpEligible && nonEvmCctpQuote.data
    ? (fast ? nonEvmCctpQuote.data.fastOut : nonEvmCctpQuote.data.standardOut)
    : null

  const validNonEvmRecipient =
    !toExtra?.endpoint || effectiveRecipient === ''
      ? null
      : toExtra.endpoint.recipientPattern.test(effectiveRecipient)

  return (
    <div className="flex min-h-0 flex-col gap-4 lg:h-[calc(100dvh-7rem)] lg:flex-none">
      <div className="grid w-full min-h-0 flex-1 gap-7 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:items-stretch">
        <Card className="flex h-full min-h-0 flex-col p-5">
          <div className="relative flex flex-1 flex-col gap-3">
            <div
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).closest('button')) return
                e.preventDefault()
                amountRef.current?.focus()
              }}
              className="flex min-h-[140px] flex-1 flex-col justify-center rounded-[16px] border border-line-strong bg-ink-850 p-5"
            >
              <div className="mb-2 flex items-center">
                <span className="col-head">You send</span>
              </div>
              <div className="flex items-center gap-3" onFocus={openChips} onBlur={scheduleChipsClose}>
                <input
                  ref={amountRef}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0.0"
                  inputMode="decimal"
                  onFocus={() => setAmountFocused(true)}
                  onBlur={() => setAmountFocused(false)}
                  className="input display text-[50px] leading-[58px] tracking-[-0.02em]"
                />
                <div className="relative flex shrink-0 flex-col items-center gap-1.5">
                  <button
                    onClick={() => setPick('source')}
                    className="flex h-16 shrink-0 items-center gap-2.5 rounded-full border border-line-strong bg-ink-700 pl-2 pr-4 transition-colors hover:border-accent/50 hover:bg-ink-600"
                  >
                    {source ? (
                      <TokenIcon
                        symbol={source.symbol}
                        size={38}
                        chainId={fromId > 0 ? fromId : undefined}
                        address={fromId > 0 ? source.address : undefined}
                        verified={source.verified}
                      />
                    ) : null}
                    <span className="display text-[16px] text-t1">{source?.symbol ?? 'select'}</span>
                    <ChevronDown size={15} className="text-t2" />
                  </button>
                  <span className="mono text-[11px] leading-none text-t2">
                    {!sourceWalletConnected
                      ? '-'
                      : (fromExtra ? nonEvmPortfolioQ.isLoading : sourceBalance.isLoading)
                        ? '…'
                        : balance == null
                          ? 'n/a'
                          : fmt(balance, source?.decimals ?? 18, 4)}
                  </span>
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={openChips}
                    style={{ display: chipsOpen ? 'flex' : 'none' }}
                    className="absolute right-0 top-full z-30 mt-3 items-center gap-1.5 rounded-lg border border-line bg-ink-850 px-2 py-1.5 shadow-lg"
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
                        className="mono rounded border border-line px-1.5 py-[2px] text-[10px] leading-none text-t3 transition-colors hover:border-line-strong hover:text-t1"
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
                      className="mono rounded border border-line px-1.5 py-[2px] text-[10px] leading-none text-t2 transition-colors hover:border-accent/50 hover:text-accent"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                const srcToken = source
                const dstToken = dest
                setFromId(toId)
                setToId(fromId)
                if (dstToken) setSourceId(keyOf(toId, dstToken.address))
                if (srcToken) setDestId(keyOf(fromId, srcToken.address))
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
                <div className="input display flex-1 truncate text-[50px] leading-[58px] tracking-[-0.02em] text-t1">
                  {isNonEvmBridge ? (
                    nonEvmOutAmt != null ? (
                      nonEvmOutAmt.toFixed(6)
                    ) : (
                      <span className="text-t3">0.0</span>
                    )
                  ) : estimate.data && dest ? (
                    fmt(estimate.data.amountOut, dest.decimals, 6)
                  ) : isCanonicalWithdraw && amountIn > 0n ? (
                    // the withdrawal returns the same asset 1:1 (gas is paid on the source chain)
                    fmt(amountIn, 18, 6)
                  ) : (
                    <span className="text-t3">0.0</span>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-center gap-1.5">
                  <button
                    onClick={() => setPick('dest')}
                    className="flex h-16 shrink-0 items-center gap-2.5 rounded-full border border-line-strong bg-ink-700 pl-2 pr-4 transition-colors hover:border-accent/50 hover:bg-ink-600"
                  >
                    {dest ? (
                      <TokenIcon
                        symbol={dest.symbol}
                        size={38}
                        chainId={toId > 0 ? toId : undefined}
                        address={toId > 0 ? dest.address : undefined}
                        verified={dest.verified}
                      />
                    ) : null}
                    <span className="display text-[16px] text-t1">{dest?.symbol ?? 'pick'}</span>
                    <ChevronDown size={15} className="text-t2" />
                  </button>
                  <div className="mt-1 flex h-6 items-center justify-center">
                    {!isNonEvmBridge && isCanonicalWithdraw && amountIn > 0n && (
                      <span className="drop-in flex items-center gap-1 text-[15px] font-semibold text-[#6adbb6]">
                        <Plus size={13} strokeWidth={2.5} />
                        {fmt(amountIn, 18, 4)}
                      </span>
                    )}
                    {!isNonEvmBridge && amountIn > 0n && estimate.data && dest && (
                      <span className="drop-in flex items-center gap-1 text-[15px] font-semibold text-[#6adbb6]">
                        <Plus size={13} strokeWidth={2.5} />
                        {fmt(estimate.data.amountOut, dest.decimals, 4)}
                      </span>
                    )}
                    {isNonEvmBridge && amountIn > 0n && nonEvmOutAmt != null && dest && (
                      <span className="drop-in flex items-center gap-1 text-[15px] font-semibold text-[#6adbb6]">
                        <Plus size={13} strokeWidth={2.5} />
                        {nonEvmOutAmt.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isNonEvmBridge ? (
            nonEvmBlockerReason ? (
              <div className="mt-3 rounded-lg border border-[#ff8f8f]/25 bg-[#ff8f8f]/8 px-3 py-2.5">
                <div className="text-[12px] font-medium text-[#ffb4b6]">
                  No route from {fromShort} to {toShort} for {source?.symbol ?? 'this asset'}.
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-t2">{nonEvmBlockerReason}</p>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-line-strong bg-ink-850 p-3">
                <RoutePath
                  fromId={fromId}
                  toId={toId}
                  source={source}
                  dest={dest}
                  overrideLabel="CCTP v2"
                />
              </div>
            )
          ) : !route && isCanonicalWithdraw ? (
            <div className="mt-3 rounded-xl border border-line-strong bg-ink-850 p-4">
              <RoutePath
                fromId={fromId}
                toId={toId}
                source={source}
                dest={dest}
                overrideLabel="Canonical withdrawal"
              />
              <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-t2">
                {fromShort} is an Orbit chain that settles on {toShort}, so this is a withdrawal rather than a
                fast bridge: the rollup confirms your message on {toShort} (≈ tens of minutes on this testnet)
                and the value is then claimable from Activity. Nothing is lost while it waits.
              </p>
            </div>
          ) : !route ? (
            <div className="mt-3 rounded-lg border border-[#ff8f8f]/25 bg-[#ff8f8f]/8 px-3 py-2.5">
              <div className="text-[12px] font-medium text-[#ffb4b6]">
                No route from {fromShort} to {toShort} for {source?.symbol ?? 'this asset'}.
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-t2">
                {source
                  ? (sourceNotes[source.address.toLowerCase()] ??
                    (orbitBridgeFor(toId) && !ORBIT_ETH_NATIVE.has(toId) && to
                      ? `${to.short} is an Arbitrum Orbit chain whose gas token is ${to.viem.nativeCurrency.symbol}, not ETH, so its inbox prices retryable tickets in that token and a plain ETH deposit does not exist there.`
                      : 'No verified provider covers this pair in this direction.'))
                  : 'Pick an asset to see whether it can move.'}
              </p>
              {reachableSources.length > 0 && (
                <p className="mt-1 text-[11px] leading-relaxed text-t3">
                  Assets that can leave {fromShort} for {toShort}:{' '}
                  {reachableSources.map((t) => t.symbol).join(', ')}.
                </p>
              )}
              {reachableSources.length === 0 && !isCanonicalWithdraw && (
                <p className="mt-1 text-[11px] leading-relaxed text-t3">
                  Nothing can leave {fromShort} for {toShort}. The reverse direction may still work.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-line-strong bg-ink-850 p-3">
              <RoutePath
                fromId={fromId}
                toId={toId}
                source={source}
                dest={dest}
                legs={route.legs}
              />
              {routes.length > 1 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-line pt-2.5">
                  {routes.map((r, idx) => {
                    const b = r.legs.find((l) => l.kind !== 'swap')
                    const tag =
                      b?.kind === 'across'
                        ? 'Across v3 (~15s)'
                        : b?.kind === 'cctp'
                          ? 'Circle CCTP v2'
                          : b?.kind === 'portal'
                            ? 'OP Portal'
                            : b?.kind === 'arbitrum'
                              ? 'Arbitrum Inbox'
                              : `Route ${idx + 1}`
                    const active = (routes[routeIdx] ? routeIdx : 0) === idx
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRouteIdx(idx)}
                        className={`rounded-md border px-2 py-1 text-[11px] font-medium transition ${
                          active ? 'border-accent/50 bg-accent/12 text-t1' : 'border-line text-t2 hover:border-line-strong'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="space-y-1">
              {insufficient && <div className="text-[11px] text-[#ffb4b6]">Amount exceeds your balance on {fromShort}.</div>}
              {!isNonEvmBridge && srcGas.data && !srcGas.data.ok && (
                <div className="text-[11px] text-[#e6c17a]">
                  No {srcGas.data.symbol} for gas on {fromShort}, get some from the Faucets page.
                </div>
              )}
            </div>
          </div>

          {!isCanonicalWithdraw && (
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

          {isCanonicalWithdraw ? null : hasAcrossLeg && !hasCctpLeg ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="panel border-accent/40 bg-accent/8 p-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-t1">Across Relayer</span>
                  <Badge tone="mint">~10–30s</Badge>
                </div>
                <div className="mt-0.5 text-[10px] leading-relaxed text-t3">Open-intent fill · destination delivery</div>
              </div>
              <div className="panel p-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-t1">Execution</span>
                  <Badge tone="default">Single tx</Badge>
                </div>
                <div className="mt-0.5 text-[10px] leading-relaxed text-t3">Auto-relayed · no second claim needed</div>
              </div>
            </div>
          ) : (
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
                <span className="text-[12px] text-t2">
                  {connectedToNonEvmAddr
                    ? `Recipient (${toShort}): ${connectedToNonEvmAddr.slice(0, 6)}…${connectedToNonEvmAddr.slice(-4)}`
                    : 'Sending to a different address?'}
                </span>
                <ChevronDown size={13} className="text-t3 transition-colors group-hover:text-accent" />
              </button>
            ) : (
              <div className="field p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="col-head">Recipient on {toShort}</span>
                    {validNonEvmRecipient === true && <Badge tone="mint">Valid format</Badge>}
                    {validNonEvmRecipient === false && <Badge tone="red">Invalid format</Badge>}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setRecipient(defaultRecipient)}
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
                  placeholder={toExtra?.endpoint?.recipientHint ?? 'Paste a recipient address'}
                  autoFocus
                  className="input mono text-[13px] text-t1"
                />
              </div>
            )}
          </div>

          <div className="mt-3">
            {isNonEvmBridge ? (
              !sourceWalletConnected ? (
                <ConnectButton full />
              ) : (
                <Button
                  full
                  variant="secondary"
                  className="h-[64px] w-full text-[15px]"
                  disabled
                >
                  {nonEvmCctpEligible
                    ? `Live Iris CCTP v2 quote ready · signing coming soon`
                    : 'No route for this pair'}
                </Button>
              )
            ) : !isConnected ? (
              <ConnectButton full />
            ) : (
              <Button
                full
                variant="primary"
                className="h-[64px] w-full text-[17px]"
                disabled={
                  isCanonicalWithdraw
                    ? !address || amountIn <= 0n || insufficient
                    : !hasRoute || amountIn <= 0n || insufficient || Boolean(estimate.data?.failed)
                }
                loading={busy === 'start'}
                onClick={isCanonicalWithdraw ? () => void runWithdraw() : run}
              >
                {route ? (
                  <span className="flex items-center gap-1.5">
                    {`Bridge ${source?.symbol ?? ''}`}
                    {source && dest && source.symbol !== dest.symbol && (
                      <span className="text-[13px] font-medium opacity-70">+ swap</span>
                    )}
                  </span>
                ) : isCanonicalWithdraw ? (
                  <span className="flex items-center gap-1.5">{`Bridge ${source?.symbol ?? ''}`}</span>
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
              {isNonEvmBridge ? (
                nonEvmCctpEligible && <Badge tone="mint">CCTP v2</Badge>
              ) : (
                route && <Badge tone={route.type === 'direct' ? 'mint' : 'blue'}>{route.type === 'direct' ? 'Direct' : 'Composite'}</Badge>
              )}
            </div>
            {isNonEvmBridge ? (
              nonEvmCctpEligible ? (
                <>
                  <p className="mb-2.5 truncate rounded-lg bg-ink-850 px-2.5 py-2 text-[11px] leading-5 text-t2">
                    {`${fromShort} (Domain ${srcDomain}) → ${toShort} (Domain ${dstDomain}) via Circle CCTP v2`}
                  </p>
                  <Row label="Source asset" value={source?.symbol ?? 'USDC'} />
                  <Row label="Destination asset" value={dest?.symbol ?? 'USDC'} />
                  <Row label="Fast / Std fee" value={fees.data ? `${(fees.data.fastBps / 100).toFixed(2)}% / ${(fees.data.standardBps / 100).toFixed(2)}%` : '—'} />
                  <Row label="You receive" value={nonEvmOutAmt != null ? `${nonEvmOutAmt.toFixed(6)} USDC` : '—'} />
                  <Row label="ETA" value={fast ? '~15s–2 min attest + mint' : '~13–19 min (hard finality)'} />
                </>
              ) : (
                <p className="text-[12px] leading-5 text-t3">
                  {nonEvmBlockerReason ?? `No verified route from ${fromShort} to ${toShort}.`}
                </p>
              )
            ) : route ? (
              <>
                <p
                  title={route.detail}
                  className="mb-2.5 truncate rounded-lg bg-ink-850 px-2.5 py-2 text-[11px] leading-5 text-t2"
                >
                  {route.detail}
                </p>
                <Row label="Source asset" value={source?.symbol ?? '-'} />
                <Row label="Destination asset" value={dest?.symbol ?? '-'} />
                <Row label="Wallet signatures" value={String(route.txCount)} />
                <Row label="You receive" value={estimate.data && dest ? `${fmt(estimate.data.amountOut, dest.decimals, 6)} ${dest.symbol}` : isCanonicalWithdraw && amountIn > 0n ? `${fmt(amountIn, 18, 6)} ${dest?.symbol ?? 'ETH'}` : '—'} />
                <Row
                  label="ETA"
                  value={
                    route.legs.some((l) => l.kind === 'arbitrum')
                      ? '≈1–10 min (retryable ticket)'
                      : route.legs.some((l) => l.kind === 'across')
                        ? '≈10–30s (Across relayer)'
                        : route.legs.some((l) => l.kind === 'portal')
                          ? '≈1–3 min per deposit'
                          : route.legs.some((l) => l.kind === 'cctp')
                            ? fast
                              ? '~15s–2 min attest + dest tx'
                              : '~13–19 min (hard finality)'
                            : route.legs.some((l) => l.kind === 'lifi')
                              ? '≈30s–5 min (LI.FI)'
                              : route.legs.some((l) => l.kind === 'relay')
                                ? '≈5–15s (Relay intent)'
                                : route.legs.some((l) => l.kind === 'wormhole')
                                  ? '≈15 min (Wormhole finality)'
                                  : 'a few seconds per swap'
                  }
                />
                {estimate.data?.failed && <p className="mt-2 text-[11px] text-[#ffb4b6]">{estimate.data.failed}</p>}
              </>
            ) : isCanonicalWithdraw ? (
              <div className="space-y-2">
                <p className="text-[12px] leading-5 text-t2">
                  {fromShort} settles on {toShort}, so the Bridge button starts a withdrawal instead of a
                  deposit — there is no separate bridge to configure.
                </p>
                <ol className="space-y-1 text-[11.5px] leading-5 text-t3">
                  <li>1 · Withdraw on {fromShort} — you sign</li>
                  <li>2 · The rollup confirms the message on {toShort}</li>
                  <li>3 · Claim on {toShort} — you sign again</li>
                </ol>
                <p className="mono text-[11px] text-t3">≈ tens of minutes on this testnet</p>
              </div>
            ) : (
              <p className="text-[12px] leading-5 text-t3">
                {`${source?.symbol ?? 'The selected asset'} has no verified route from ${fromShort} to ${toShort}.`}
              </p>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-2 text-[11px] leading-relaxed text-t2">
              <Info size={14} className="mt-0.5 shrink-0 text-accent" />
              <div className="space-y-1.5">
                <p>
                  <span className="font-semibold text-t1">Direct routes</span> move assets via Circle CCTP v2, Across Protocol v3
                  (fast L1↔L2 &amp; L2↔L2 intents), OP Stack portals, or Arbitrum Orbit Inboxes.
                </p>
                <p>
                  <span className="font-semibold text-t1">Bridge + swap</span> composites combine Uniswap v3 / V2 AMM swaps with verified
                  bridges. Every signature is real and signed by your wallet.
                </p>
                <p>
                  <span className="font-semibold text-t1">Canonical withdrawals</span> from an Orbit chain back to
                  its parent are handled as a withdrawal: one signature to start it, then a claim once the rollup
                  confirms — quick on this testnet, 7 days on mainnet Arbitrum.
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
        extraNetworks={EXTRA_BRIDGE_LIST.map((x) => x.network)}
        value={pick === 'from' ? (fromId > 0 ? fromId : undefined) : (toId > 0 ? toId : undefined)}
        extraValue={pick === 'from' ? fromExtra?.network.id : toExtra?.network.id}
        isExtraConnected={(n) => n.walletFamily === 'evm' || Boolean(nonEvmWallets[n.walletFamily]?.address)}
        onSelect={(id) => {
          if (pick === 'from') {
            setFromId(id)
            setSourceId(keyOf(id, NATIVE))
          } else {
            setToId(id)
            setDestId(keyOf(id, NATIVE))
          }
        }}
        onSelectExtra={(netId) => {
          const sid = EXTRA_SYNTH_BY_NETWORK_ID.get(netId)
          if (sid == null) return
          const def = EXTRA_BRIDGE_MAP.get(sid)
          const applyExtra = () => {
            const defaultTok = def?.tokens[0]?.address ?? NATIVE
            if (pick === 'from') {
              setFromId(sid)
              setSourceId(keyOf(sid, defaultTok))
            } else {
              setToId(sid)
              setDestId(keyOf(sid, defaultTok))
            }
          }
          if (!requireBridgeWallet(def?.network, applyExtra)) return false
          applyExtra()
        }}
        title={pick === 'from' ? 'Source network' : 'Destination network'}
        subtitle="Only testnets on the allowlist are listed."
      />

      <TokenPicker
        open={pick === 'source'}
        filterKey="bridge-source"
        title="Send asset"
        groups={allGroups}
        chains={allPickerChains}
        value={source ? { chainId: fromId, address: source.address } : null}
        onBeforeSelectChain={(c, net, tok) =>
          requireBridgeWallet(net, () => {
            const def = EXTRA_BRIDGE_MAP.get(c.id)
            const chosen = tok?.address ?? def?.tokens[0]?.address ?? NATIVE
            setFromId(c.id)
            setSourceId(keyOf(c.id, chosen))
          })
        }
        onClose={() => setPick(null)}
        onSelect={(c, t) => {
          setFromId(c.id)
          setSourceId(keyOf(c.id, t.address))
        }}
      />
      <TokenPicker
        open={pick === 'dest'}
        filterKey="bridge-dest"
        title="Receive asset"
        groups={allGroups}
        chains={allPickerChains}
        value={dest ? { chainId: toId, address: dest.address } : null}
        onBeforeSelectChain={(c, net, tok) =>
          requireBridgeWallet(net, () => {
            const def = EXTRA_BRIDGE_MAP.get(c.id)
            const chosen = tok?.address ?? def?.tokens[0]?.address ?? NATIVE
            setToId(c.id)
            setDestId(keyOf(c.id, chosen))
          })
        }
        onClose={() => setPick(null)}
        onSelect={(c, t) => {
          setToId(c.id)
          setDestId(keyOf(c.id, t.address))
        }}
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
          <span className="mono text-[11px] font-semibold text-t1">{pctDone}%</span>
          <Link to={`/activity/${item.id}`} className="text-[11px] text-t3 transition-colors hover:text-accent">
            Open
          </Link>
        </span>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          {from && (
            <span className="relative">
              <TokenIcon symbol={item.tokenIn.symbol} size={28} chainId={item.fromChainId} address={item.tokenIn.address} />
              <span className="absolute -bottom-1 -right-1 rounded-full ring-2 ring-ink-800">
                <ChainLogo chain={from} size={13} />
              </span>
            </span>
          )}
          <div className="relative h-px flex-1 bg-line-strong">
            <span
              className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-accent"
              style={{ animation: 'flow 2s linear infinite' }}
            />
          </div>
          {to && (
            <span className="relative">
              <TokenIcon
                symbol={(item.tokenOut ?? item.tokenIn).symbol}
                size={28}
                chainId={item.toChainId}
                address={(item.tokenOut ?? item.tokenIn).address}
              />
              <span className="absolute -bottom-1 -right-1 rounded-full ring-2 ring-ink-800">
                <ChainLogo chain={to} size={13} />
              </span>
            </span>
          )}
        </div>
        <div className="mt-2.5 flex items-baseline justify-between gap-2 text-[11px]">
          <span className="truncate text-t2">{current?.label ?? 'Working'}</span>
          <span className="figure shrink-0 text-t3">
            {item.amountIn} {item.tokenIn.symbol} → {to?.short}
          </span>
        </div>
      </div>
      <div className="border-t border-line px-4 py-2.5">
        <Timeline steps={item.steps} compact />
      </div>
    </Card>
  )
}
