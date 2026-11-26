import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { Check, ChevronDown, ExternalLink, Link2Off, Search, Wallet } from 'lucide-react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Modal, Button, CopyButton, notify } from './ui'
import { NON_EVM_NETWORKS } from '../config/networks'
import {
  WALLET_FAMILIES,
  closeWalletModal,
  connectWalletProvider,
  disconnectNonEvmAccountById,
  getNonEvmWalletProviders,
  setActiveNonEvmAccount,
  useAllNonEvmAccounts,
  useNonEvmWallets,
  useWalletModalState,
  type NonEvmFamily,
  type NonEvmWalletProvider,
  type WalletFamily,
} from '../lib/walletsMulti'
import { shortAddr } from '../lib/format'

/**
 * One row per wallet brand.
 *
 * OKX ships an EVM, Solana, Sui, Aptos and Starknet extension, but a user
 * connects "OKX" — not five separate OKX rows — so every provider of the same
 * brand collapses into a single entry whose subtitle lists the chains it
 * supports. A wallet row never wears a chain logo: the icon is the wallet's
 * own mark, or a neutral monogram tile when the extension exposes none.
 */

const FAMILY_ORDER: WalletFamily[] = [
  'evm',
  'solana',
  'sui',
  'aptos',
  'starknet',
  'cosmos',
  'stellar',
  'algorand',
  'near',
  'polkadot',
  'xrpl',
]

const BRAND_ALIASES: Array<[RegExp, string]> = [
  [/okx/, 'okx'],
  [/metamask/, 'metamask'],
  [/rabby/, 'rabby'],
  [/brave/, 'brave'],
  [/coinbase/, 'coinbase'],
  [/trust/, 'trust'],
  [/phantom/, 'phantom'],
  [/solflare/, 'solflare'],
  [/backpack/, 'backpack'],
  [/slush|sui wallet/, 'slush'],
  [/suiet/, 'suiet'],
  [/nightly/, 'nightly'],
  [/petra/, 'petra'],
  [/pontem/, 'pontem'],
  [/argent/, 'argent'],
  [/braavos/, 'braavos'],
  [/keplr/, 'keplr'],
  [/leap/, 'leap'],
  [/freighter/, 'freighter'],
  [/xbull/, 'xbull'],
  [/pera/, 'pera'],
  [/lute/, 'lute'],
  [/algorand/, 'algorand'],
  [/meteor/, 'meteor'],
  [/talisman/, 'talisman'],
  [/subwallet/, 'subwallet'],
  [/polkadot/, 'polkadotjs'],
  [/crossmark/, 'crossmark'],
  [/gem/, 'gemwallet'],
  [/martian/, 'martian'],
  [/coin98/, 'coin98'],
  [/slope/, 'slope'],
  [/glow/, 'glow'],
  [/solong/, 'solong'],
]

function brandKey(name: string): string {
  const n = name.toLowerCase()
  for (const [re, key] of BRAND_ALIASES) if (re.test(n)) return key
  return n.replace(/[^a-z0-9]/g, '')
}

function cleanBrandName(name: string): string {
  const cleaned = name
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (/^(browser )?wallet$/i.test(cleaned) || /^injected$/i.test(cleaned)) return 'Injected wallet'
  return cleaned
}

function familyLabel(f: WalletFamily): string {
  if (f === 'evm') return 'EVM'
  return WALLET_FAMILIES[f].label.split(' (')[0]
}

function initials(name: string): string {
  const parts = cleanBrandName(name)
    .replace(/wallet/gi, '')
    .split(/[\s/.]+/)
    .filter(Boolean)
  if (parts.length === 0) return 'W'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function BrandTile({ iconSrc, name, size = 32 }: { iconSrc?: string; name: string; size?: number }) {
  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt=""
        className="shrink-0 rounded-[9px] object-cover ring-1 ring-white/10"
        style={{ width: size, height: size }}
      />
    )
  }
  const generic = /injected/i.test(name)
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[9px] border border-line-strong bg-ink-700 text-[11px] font-semibold tracking-wide text-t1"
      style={{ width: size, height: size }}
    >
      {generic ? <Wallet size={Math.round(size * 0.5)} className="text-t2" /> : initials(name)}
    </span>
  )
}

export function nonEvmLogoSrc(family: NonEvmFamily): string | undefined {
  const net = NON_EVM_NETWORKS.find((n) => n.walletFamily === family)
  return net?.logoFile ? `/logos/chains/${net.logoFile}` : undefined
}

interface ConnectTarget {
  family: WalletFamily
  label: string
  run: () => Promise<void>
}

interface BrandGroup {
  key: string
  name: string
  families: WalletFamily[]
  iconSrc?: string
  installUrl?: string
  /** Every way this brand can be connected right now. Empty = not installed. */
  targets: ConnectTarget[]
  /** Providers of this brand that are not installed, for the install hint. */
  missing: NonEvmWalletProvider[]
}

/** Single global instance rendered in Layout, controlled via openWalletModal(). */
export function GlobalWalletModal() {
  const state = useWalletModalState()
  return (
    <MultiWalletModal
      open={state.open}
      onClose={closeWalletModal}
      focusFamily={state.focusFamily}
      promptTitle={state.networkName ? `Connect ${state.networkName} wallet` : undefined}
      promptReason={state.reason}
      onConnected={state.onConnected}
    />
  )
}

export function MultiWalletModal({
  open,
  onClose,
  focusFamily,
  promptTitle,
  promptReason,
  onConnected,
}: {
  open: boolean
  onClose: () => void
  focusFamily?: WalletFamily | null
  promptTitle?: string
  promptReason?: string
  onConnected?: (family: WalletFamily, address: string) => void
}) {
  const evm = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()
  const activeMap = useNonEvmWallets()
  const allNonEvm = useAllNonEvmAccounts()

  const [q, setQ] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<{ name: string; url: string } | null>(null)

  useEffect(() => {
    if (!open) return
    setQ('')
    setExpanded(null)
    setShowAll(false)
    setInstallPrompt(null)
  }, [open])

  const brands = useMemo<BrandGroup[]>(() => {
    const map = new Map<string, BrandGroup>()
    const upsert = (name: string) => {
      const key = brandKey(name)
      let entry = map.get(key)
      if (!entry) {
        entry = { key, name: cleanBrandName(name), families: [], targets: [], missing: [] }
        map.set(key, entry)
      }
      return entry
    }

    // EVM browser wallets discovered through EIP-6963 / injected connectors.
    const injected = connectors.filter((c) => c.id === 'injected' || c.type === 'injected')
    const named = injected.filter((c) => c.id !== 'injected')
    const evmList = named.length > 0 ? named : injected
    for (const c of evmList) {
      const entry = upsert(c.name)
      if (!entry.families.includes('evm')) entry.families.push('evm')
      if (!entry.iconSrc && c.icon) entry.iconSrc = c.icon
      entry.targets.push({
        family: 'evm',
        label: 'EVM',
        run: () =>
          new Promise<void>((resolve, reject) => {
            const doConnect = () =>
              connect(
                { connector: c },
                {
                  onSuccess: (data) => {
                    notify(`${cleanBrandName(c.name)} connected`, 'success')
                    onConnected?.('evm', data.accounts[0] ?? '')
                    onClose()
                    resolve()
                  },
                  onError: (err) => {
                    notify(err.message, 'error')
                    reject(err)
                  },
                },
              )
            if (evm.isConnected) disconnect(undefined, { onSuccess: doConnect })
            else doConnect()
          }),
      })
    }

    // Non-EVM browser wallet extensions.
    for (const p of getNonEvmWalletProviders()) {
      const entry = upsert(p.name)
      if (!entry.families.includes(p.family)) entry.families.push(p.family)
      if (!entry.iconSrc && p.iconSrc) entry.iconSrc = p.iconSrc
      if (!entry.installUrl) entry.installUrl = p.installUrl
      if (p.detected) {
        entry.targets.push({
          family: p.family,
          label: familyLabel(p.family),
          run: async () => {
            const acct = await connectWalletProvider(p)
            notify(`${acct.providerName} connected: ${shortAddr(acct.address, 4)}`, 'success')
            onConnected?.(p.family, acct.address)
            onClose()
          },
        })
      } else {
        entry.missing.push(p)
      }
    }

    return [...map.values()]
      .map((entry) => ({
        ...entry,
        families: [...entry.families].sort((a, b) => FAMILY_ORDER.indexOf(a) - FAMILY_ORDER.indexOf(b)),
      }))
      .sort((a, b) => {
        const installed = Number(b.targets.length > 0) - Number(a.targets.length > 0)
        if (installed) return installed
        if (focusFamily) {
          const focus = Number(b.families.includes(focusFamily)) - Number(a.families.includes(focusFamily))
          if (focus) return focus
        }
        return a.name.localeCompare(b.name)
      })
  }, [connectors, evm.isConnected, connect, disconnect, onConnected, onClose, focusFamily])

  const needle = q.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!needle) return brands
    return brands.filter((b) =>
      `${b.name} ${b.families.map(familyLabel).join(' ')}`.toLowerCase().includes(needle),
    )
  }, [brands, needle])

  const installed = filtered.filter((b) => b.targets.length > 0)
  const available = filtered.filter((b) => b.targets.length === 0)

  const connectedBrands = useMemo(() => {
    const set = new Set<string>()
    if (evm.isConnected && evm.connector?.name) set.add(brandKey(evm.connector.name))
    for (const a of allNonEvm) set.add(brandKey(a.providerName))
    return set
  }, [evm.isConnected, evm.connector?.name, allNonEvm])

  const connectBrand = async (b: BrandGroup, family?: WalletFamily) => {
    setInstallPrompt(null)

    if (!family && b.targets.length > 1) {
      // The brand is live on several chains — ask which chain, in place.
      setExpanded((cur) => (cur === b.key ? null : b.key))
      return
    }

    const target = family ? b.targets.find((t) => t.family === family) : b.targets[0]
    if (!target) {
      // Not installed: send the user straight to the wallet's own install page.
      const url = b.missing[0]?.installUrl ?? b.installUrl ?? 'https://ethereum.org/en/wallets/'
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }

    setBusyId(b.key)
    try {
      await target.run()
    } catch (e) {
      const msg = (e as Error).message ?? 'Connection failed'
      if (/not detected/i.test(msg)) {
        setInstallPrompt({ name: b.name, url: b.installUrl ?? 'https://ethereum.org/en/wallets/' })
      }
    } finally {
      setBusyId(null)
      setExpanded(null)
    }
  }

  const renderRow = (b: BrandGroup, compact: boolean) => {
    const isBusy = busyId === b.key
    const isConnected = connectedBrands.has(b.key)
    const isOpen = expanded === b.key
    const canConnect = b.targets.length > 0

    return (
      <div key={b.key} className="overflow-hidden rounded-[10px] border border-line bg-ink-850">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void connectBrand(b)}
          className={clsx(
            'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors',
            isConnected ? 'bg-ink-700/50' : 'hover:bg-ink-700',
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <BrandTile iconSrc={b.iconSrc} name={b.name} size={compact ? 28 : 32} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[13px] font-medium text-t1">{b.name}</span>
                {isConnected && <Check size={12} className="shrink-0 text-pos" />}
              </div>
              <div className="truncate text-[11px] text-t3">{b.families.map(familyLabel).join(' · ')}</div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isConnected ? (
              <span className="text-[11px] font-medium text-pos">Connected</span>
            ) : isBusy ? (
              <span className="text-[11px] text-accent">Connecting…</span>
            ) : canConnect ? (
              <span className="rounded-md border border-line-strong bg-ink-800 px-2.5 py-1 text-[11px] text-t1">
                Connect
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-[11px] text-t3">
                Install <ExternalLink size={10} />
              </span>
            )}
            {canConnect && b.targets.length > 1 && (
              <ChevronDown size={13} className={clsx('shrink-0 text-t3 transition-transform', isOpen && 'rotate-180')} />
            )}
          </div>
        </button>

        {isOpen && b.targets.length > 1 && (
          <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2">
            <span className="mr-1 self-center text-[11px] text-t3">Connect on</span>
            {b.targets.map((t) => (
              <button
                key={t.family}
                type="button"
                disabled={isBusy}
                onClick={() => void connectBrand(b, t.family)}
                className="rounded-md border border-line-strong bg-ink-800 px-2.5 py-1 text-[11px] text-t1 transition-colors hover:border-accent/50 hover:text-accent"
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={promptTitle ?? 'Connect a wallet'} width="max-w-lg">
      <div className="space-y-3 p-4">
        {promptReason && (
          <div className="rounded-[10px] border border-accent/35 bg-accent/10 px-3.5 py-2.5 text-[12px] leading-5 text-t1">
            {promptReason}
          </div>
        )}

        <div className="flex items-center gap-2 rounded-[10px] border border-line bg-ink-850 px-3 py-2">
          <Search size={14} className="text-t3" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search wallets"
            className="input text-xs"
          />
        </div>

        {((evm.isConnected && evm.address) || allNonEvm.length > 0) && (
          <div className="space-y-1.5 rounded-[10px] border border-pos/25 bg-ink-850 p-2.5">
            <div className="flex items-center justify-between px-1 text-[11px] font-medium text-t2">
              <span>Connected</span>
              <span className="mono text-t3">{(evm.isConnected ? 1 : 0) + allNonEvm.length}</span>
            </div>

            {evm.isConnected && evm.address && (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-ink-900/70 px-2.5 py-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <BrandTile iconSrc={evm.connector?.icon} name={evm.connector?.name ?? 'EVM'} size={24} />
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium text-t1">
                      {cleanBrandName(evm.connector?.name ?? 'EVM wallet')}
                    </div>
                    <div className="mono flex items-center gap-1 text-[11px] text-t3">
                      {shortAddr(evm.address, 5)} <CopyButton value={evm.address} />
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="quiet"
                  onClick={() => {
                    disconnect()
                    notify('Disconnected EVM wallet', 'info')
                  }}
                >
                  <Link2Off size={12} />
                </Button>
              </div>
            )}

            {allNonEvm.map((acct) => {
              const isActive = activeMap[acct.family]?.id === acct.id
              return (
                <div
                  key={acct.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-ink-900/70 px-2.5 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <BrandTile iconSrc={acct.iconSrc} name={acct.providerName} size={24} />
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-medium text-t1">
                        {cleanBrandName(acct.providerName)}
                      </div>
                      <div className="mono flex items-center gap-1 text-[11px] text-t3">
                        {shortAddr(acct.address, 5)} <CopyButton value={acct.address} />
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!isActive && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setActiveNonEvmAccount(acct.id)
                          notify(`Switched to ${cleanBrandName(acct.providerName)}`, 'info')
                        }}
                      >
                        Use
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="quiet"
                      onClick={() => {
                        disconnectNonEvmAccountById(acct.id)
                        notify(`Disconnected ${cleanBrandName(acct.providerName)}`, 'info')
                      }}
                    >
                      <Link2Off size={12} />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {installPrompt && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-warn/40 bg-[#1c1810] px-3.5 py-2.5">
            <div className="min-w-0 flex-1 text-[12px] leading-5 text-[#e6c17a]">
              <strong>{installPrompt.name}</strong> isn’t installed in this browser. Add the extension, unlock it,
              then reload to connect.
            </div>
            <a
              href={installPrompt.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-[#111628] hover:bg-accent-2"
            >
              Get {installPrompt.name} <ExternalLink size={12} />
            </a>
          </div>
        )}

        <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-0.5">
          {installed.length > 0 && (
            <div className="space-y-1.5">
              <div className="px-1 text-[11px] font-medium uppercase tracking-wide text-t3">Installed</div>
              {installed.map((b) => renderRow(b, false))}
            </div>
          )}

          {available.length > 0 && (
            <div className="space-y-1.5">
              {installed.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="flex w-full items-center justify-between px-1 py-1 text-[11px] font-medium uppercase tracking-wide text-t3 transition-colors hover:text-t2"
                >
                  <span>More wallets ({available.length})</span>
                  <ChevronDown size={13} className={clsx('transition-transform', showAll && 'rotate-180')} />
                </button>
              ) : (
                <div className="px-1 text-[11px] font-medium uppercase tracking-wide text-t3">All wallets</div>
              )}
              {(showAll || installed.length === 0) && available.map((b) => renderRow(b, true))}
            </div>
          )}

          {installed.length === 0 && available.length === 0 && (
            <div className="py-6 text-center text-[12px] text-t3">
              {needle ? `No wallet matches “${q}”.` : 'No browser wallet detected. Install one to continue.'}
            </div>
          )}
        </div>

        {installed.length === 0 && !needle && (
          <div className="flex items-start gap-2 rounded-[10px] border border-line bg-ink-850 px-3 py-2.5 text-[11px] leading-5 text-t3">
            <Wallet size={13} className="mt-0.5 shrink-0 text-t2" />
            No installed wallet was found. Choose a wallet above to install its extension — this app never asks for a
            seed phrase or private key.
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-t3">
          {focusFamily ? `${familyLabel(focusFamily)} wallets shown first · testnet only` : 'Testnet only — no real funds move'}
        </div>
      </div>
    </Modal>
  )
}
