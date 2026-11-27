import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { Check, ExternalLink, Search, Wallet, X } from 'lucide-react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Modal, notify } from './ui'
import { NON_EVM_NETWORKS } from '../config/networks'
import { walletLogo } from '../config/walletLogos'
import { WALLET_CATALOG } from '../config/walletCatalog'
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
 * Wallet picker, one row per wallet brand.
 *
 * A wallet that lives on several ecosystems shows a single "Multichain" row; tapping it
 * opens the ecosystem picker (Ethereum / Solana / Sui …) and connects the chain you choose.
 * Single-ecosystem wallets connect straight from the list. A row never wears a chain logo —
 * the icon is the wallet's own mark, or a neutral monogram tile when no icon is exposed.
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

const ECOSYSTEM_LABEL: Record<WalletFamily, string> = {
  evm: 'Ethereum',
  solana: 'Solana',
  sui: 'Sui',
  aptos: 'Aptos',
  starknet: 'Starknet',
  cosmos: 'Cosmos',
  stellar: 'Stellar',
  algorand: 'Algorand',
  near: 'NEAR',
  polkadot: 'Polkadot',
  xrpl: 'XRP Ledger',
  canton: 'Canton',
}

const ECOSYSTEM_LOGO: Partial<Record<WalletFamily, string>> = {
  evm: 'tw_ethereum.png',
  solana: 'solana.svg',
  sui: 'sui.svg',
  aptos: 'aptos.svg',
  starknet: 'starknet.svg',
  stellar: 'stellar.png',
  algorand: 'algorand.png',
  near: 'near.png',
  polkadot: 'polkadot.png',
  xrpl: 'xrpl.png',
}

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
  [/near/, 'near'],
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

function initials(name: string): string {
  const parts = cleanBrandName(name)
    .replace(/wallet/gi, '')
    .split(/[\s/.]+/)
    .filter(Boolean)
  if (parts.length === 0) return 'W'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function BrandAvatar({ iconSrc, name, size = 44 }: { iconSrc?: string; name: string; size?: number }) {
  const [broken, setBroken] = useState(false)
  if (iconSrc && !broken) {
    // Wallet marks ship as square tiles; clipping them to a circle is what every wallet
    // picker does, so a square logo never shows four corners.
    return (
      <span
        className="shrink-0 overflow-hidden rounded-full border border-line-strong bg-ink-900"
        style={{ width: size, height: size }}
      >
        <img
          src={iconSrc}
          alt=""
          onError={() => setBroken(true)}
          className="h-full w-full rounded-full object-cover"
        />
      </span>
    )
  }
  const generic = /injected/i.test(name)
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full border border-line-strong bg-ink-700 font-semibold text-t1"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {generic ? <Wallet size={Math.round(size * 0.45)} className="text-t2" /> : initials(name)}
    </span>
  )
}

function EcoAvatar({ family, size = 28 }: { family: WalletFamily; size?: number }) {
  const file = ECOSYSTEM_LOGO[family]
  if (file) {
    return (
      <img
        src={`/logos/chains/${file}`}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full border border-line-strong bg-ink-700 text-[10px] font-semibold text-t2"
      style={{ width: size, height: size }}
    >
      {ECOSYSTEM_LABEL[family].slice(0, 2).toUpperCase()}
    </span>
  )
}

export function nonEvmLogoSrc(family: NonEvmFamily): string | undefined {
  const net = NON_EVM_NETWORKS.find((n) => n.walletFamily === family)
  return net?.logoFile ? `/logos/chains/${net.logoFile}` : undefined
}

interface ConnectTarget {
  family: WalletFamily
  run: () => Promise<void>
}

interface BrandGroup {
  key: string
  name: string
  families: WalletFamily[]
  iconSrc?: string
  installUrl?: string
  targets: ConnectTarget[]
  missing: NonEvmWalletProvider[]
  /** WalletConnect pairing (QR / mobile) rather than a browser extension. */
  qr?: boolean
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
  const allNonEvm = useAllNonEvmAccounts()
  const activeMap = useNonEvmWallets()

  const [q, setQ] = useState('')
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [ecoBrand, setEcoBrand] = useState<BrandGroup | null>(null)
  const [installPrompt, setInstallPrompt] = useState<{ name: string; url: string } | null>(null)

  useEffect(() => {
    if (!open) return
    setQ('')
    setEcoBrand(null)
    setBusyKey(null)
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

    const injected = connectors.filter((c) => c.id === 'injected' || c.type === 'injected')
    const named = injected.filter((c) => c.id !== 'injected')
    const evmList = named.length > 0 ? named : injected
    for (const c of evmList) {
      const entry = upsert(c.name)
      if (!entry.families.includes('evm')) entry.families.push('evm')
      if (!entry.iconSrc && c.icon) entry.iconSrc = c.icon
      entry.targets.push({
        family: 'evm',
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

    for (const p of getNonEvmWalletProviders()) {
      const entry = upsert(p.name)
      if (!entry.families.includes(p.family)) entry.families.push(p.family)
      if (!entry.iconSrc && p.iconSrc) entry.iconSrc = p.iconSrc
      if (!entry.installUrl) entry.installUrl = p.installUrl
      if (p.detected) {
        entry.targets.push({
          family: p.family,
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

    // WalletConnect (QR / mobile pairing) only exists when a project id is configured.
    const wc = connectors.find((c) => c.id === 'walletConnect')
    if (wc) {
      const entry = upsert('WalletConnect')
      entry.name = 'WalletConnect'
      entry.qr = true
      entry.iconSrc = walletLogo('walletconnect')
      if (!entry.families.includes('evm')) entry.families.push('evm')
      entry.targets.push({
        family: 'evm',
        run: () =>
          new Promise<void>((resolve, reject) => {
            connect(
              { connector: wc },
              {
                onSuccess: (data) => {
                  notify('WalletConnect paired', 'success')
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
          }),
      })
    }

    // Catalog entries fill the rows for wallets that are not installed on this device.
    // They add a name, chains and a download link — never a fake "connected" target.
    for (const c of WALLET_CATALOG) {
      const entry = upsert(c.name)
      for (const f of c.families) if (!entry.families.includes(f)) entry.families.push(f)
      if (!entry.installUrl) entry.installUrl = c.installUrl
      if (!entry.iconSrc && walletLogo(c.key)) entry.iconSrc = walletLogo(c.key)
    }

    return [...map.values()]
      .map((entry) => ({
        ...entry,
        families: [...entry.families].sort((a, b) => FAMILY_ORDER.indexOf(a) - FAMILY_ORDER.indexOf(b)),
      }))
      .sort((a, b) => {
        // Multichain wallets lead, then installed-only ones, then everything else.
        const rank = (x: BrandGroup) => (x.families.length > 1 ? 0 : x.targets.length > 0 ? 1 : 2)
        const r = rank(a) - rank(b)
        if (r) return r
        if (focusFamily) {
          const f = Number(b.families.includes(focusFamily)) - Number(a.families.includes(focusFamily))
          if (f) return f
        }
        return a.name.localeCompare(b.name)
      })
  }, [connectors, evm.isConnected, connect, disconnect, onConnected, onClose, focusFamily])

  const needle = q.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!needle) return brands
    return brands.filter((b) =>
      `${b.name} ${b.families.map((f) => ECOSYSTEM_LABEL[f]).join(' ')}`.toLowerCase().includes(needle),
    )
  }, [brands, needle])

  const connectedBrands = useMemo(() => {
    const set = new Set<string>()
    if (evm.isConnected && evm.connector?.name) set.add(brandKey(evm.connector.name))
    for (const a of allNonEvm) set.add(brandKey(a.providerName))
    return set
  }, [evm.isConnected, evm.connector?.name, allNonEvm])

  const runConnect = async (b: BrandGroup, target: ConnectTarget) => {
    setBusyKey(b.key)
    setInstallPrompt(null)
    try {
      await target.run()
    } catch (e) {
      const msg = (e as Error).message ?? 'Connection failed'
      if (/not detected/i.test(msg)) {
        setInstallPrompt({ name: b.name, url: b.missing[0]?.installUrl ?? b.installUrl ?? 'https://ethereum.org/en/wallets/' })
      }
    } finally {
      setBusyKey(null)
      setEcoBrand(null)
    }
  }

  const pickBrand = (b: BrandGroup) => {
    setInstallPrompt(null)
    if (b.targets.length === 0) {
      window.open(b.missing[0]?.installUrl ?? b.installUrl ?? 'https://ethereum.org/en/wallets/', '_blank', 'noopener,noreferrer')
      return
    }
    if (b.targets.length > 1) {
      setEcoBrand(b)
      return
    }
    void runConnect(b, b.targets[0])
  }

  const title = ecoBrand ? 'Select an ecosystem' : (promptTitle ?? 'Select a wallet')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="max-w-[460px]"
      onBack={ecoBrand ? () => setEcoBrand(null) : undefined}
    >
      {ecoBrand ? (
        <div key={ecoBrand.key} className="wallet-pane px-4 pb-5 pt-6">
          <div className="flex flex-col items-center text-center">
            <div className="eco-orb relative grid size-[104px] place-items-center rounded-full border border-line bg-ink-850">
              <span className="pointer-events-none absolute inset-0 rounded-full bg-accent/10 blur-xl" aria-hidden />
              <BrandAvatar iconSrc={ecoBrand.iconSrc ?? walletLogo(ecoBrand.key)} name={ecoBrand.name} size={64} />
            </div>
            <div className="mt-4 text-[15px] font-semibold text-t1">{ecoBrand.name}</div>
            <p className="mt-1.5 max-w-[300px] text-[12.5px] leading-[1.6] text-t2">
              {ecoBrand.name} supports multiple chain ecosystems. Select which one to connect to.
            </p>
          </div>

          <div className="mt-5 space-y-2">
            {ecoBrand.targets.map((t, i) => (
              <button
                key={t.family}
                type="button"
                disabled={busyKey === ecoBrand.key}
                onClick={() => void runConnect(ecoBrand, t)}
                style={{ animationDelay: `${40 + i * 40}ms` }}
                className="wallet-row flex w-full items-center gap-3 rounded-[14px] border border-line bg-ink-850 px-3.5 py-3 text-left transition-all duration-200 hover:border-line-strong hover:bg-ink-700 active:scale-[0.985]"
              >
                <EcoAvatar family={t.family} size={30} />
                <span className="flex-1 text-[13.5px] font-medium text-t1">{ECOSYSTEM_LABEL[t.family]}</span>
                {busyKey === ecoBrand.key && (
                  <span className="text-[11px] text-accent">Connecting…</span>
                )}
              </button>
            ))}
          </div>

          {installPrompt && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-[12px] border border-warn/40 bg-[#1c1810] px-3.5 py-2.5">
              <div className="text-[11.5px] leading-5 text-warn">
                <strong>{installPrompt.name}</strong> isn’t installed in this browser.
              </div>
              <a
                href={installPrompt.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-semibold on-accent hover:bg-accent-2"
              >
                Get it <ExternalLink size={11} />
              </a>
            </div>
          )}
        </div>
      ) : (
        <div key="list" className="wallet-pane px-4 pb-5 pt-4">
          {promptReason && (
            <div className="mb-3 rounded-[12px] border border-accent/35 bg-accent/10 px-3.5 py-2.5 text-[12px] leading-5 text-t1">
              {promptReason}
            </div>
          )}

          <div className="flex items-center gap-2 rounded-[12px] border border-line bg-ink-850 px-3 py-2">
            <Search size={15} className="text-t3" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search wallets"
              className="input text-[12.5px]"
            />
          </div>

          {allNonEvm.length > 0 && (
            <div className="mt-3 space-y-1.5 rounded-[12px] border border-pos/25 bg-ink-850 p-2">
              {allNonEvm.map((acct) => {
                const active = activeMap[acct.family]?.id === acct.id
                return (
                  <div key={acct.id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1">
                    <BrandAvatar iconSrc={acct.iconSrc ?? walletLogo(brandKey(acct.providerName))} name={acct.providerName} size={26} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium text-t1">{cleanBrandName(acct.providerName)}</div>
                      <div className="mono text-[10.5px] text-t3">{shortAddr(acct.address, 5)}</div>
                    </div>
                    {!active && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveNonEvmAccount(acct.id)
                          notify(`Switched to ${cleanBrandName(acct.providerName)}`, 'info')
                        }}
                        className="rounded-md px-2 py-1 text-[10.5px] text-t2 transition-colors hover:bg-ink-700 hover:text-t1"
                      >
                        Use
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Disconnect"
                      onClick={() => {
                        disconnectNonEvmAccountById(acct.id)
                        notify(`Disconnected ${cleanBrandName(acct.providerName)}`, 'info')
                      }}
                      className="rounded-md p-1 text-t3 transition-colors hover:bg-ink-700 hover:text-t1"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-3 space-y-2">
            {filtered.map((b, i) => {
              const connected = connectedBrands.has(b.key)
              const multichain = b.families.length > 1
              const installed = b.targets.length > 0
              const busy = busyKey === b.key
              return (
                <button
                  key={b.key}
                  type="button"
                  disabled={busy}
                  onClick={() => pickBrand(b)}
                  style={{ animationDelay: `${Math.min(i, 12) * 24}ms` }}
                  className="wallet-row flex w-full items-center gap-3.5 rounded-[14px] border border-line bg-ink-850 px-3 py-2.5 text-left transition-all duration-200 hover:border-line-strong hover:bg-ink-700 active:scale-[0.985] disabled:opacity-70"
                >
                  <BrandAvatar iconSrc={b.iconSrc ?? walletLogo(b.key)} name={b.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-semibold leading-tight text-t1">{b.name}</div>
                    {multichain && (
                      <div className="mt-0.5 truncate text-[11px] text-t3">
                        {b.families.map((f) => ECOSYSTEM_LABEL[f]).join(' · ')}
                      </div>
                    )}
                  </div>

                  {busy ? (
                    <span className="shrink-0 text-[11px] text-accent">Connecting…</span>
                  ) : b.qr ? (
                    <span className="shrink-0 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[10.5px] font-semibold text-accent">
                      QR Code
                    </span>
                  ) : connected ? (
                    <span className="shrink-0 rounded-full bg-pos/15 px-2.5 py-1 text-[10.5px] font-semibold text-pos">
                      Connected
                    </span>
                  ) : multichain ? (
                    <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-1 text-[10.5px] font-semibold text-accent">
                      Multichain
                    </span>
                  ) : installed ? (
                    <span className="shrink-0 rounded-full bg-ink-700 px-2.5 py-1 text-[10.5px] font-semibold text-t2">
                      Installed
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[10.5px] font-medium text-t3">
                      Install
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="py-8 text-center text-[12px] text-t3">No wallet matches “{q}”.</div>
          )}

          {installPrompt && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-[12px] border border-warn/40 bg-[#1c1810] px-3.5 py-2.5">
              <div className="text-[11.5px] leading-5 text-warn">
                <strong>{installPrompt.name}</strong> isn’t installed in this browser.
              </div>
              <a
                href={installPrompt.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-semibold on-accent hover:bg-accent-2"
              >
                Get it <ExternalLink size={11} />
              </a>
            </div>
          )}

          <div className="mt-3 flex items-center justify-center gap-1 text-[10.5px] text-t3">
            <Check size={11} className="text-pos" /> Testnet only — no real funds move
          </div>
        </div>
      )}
    </Modal>
  )
}
