import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import {
  Activity,
  ArrowLeftRight,
  Droplets,
  LayoutGrid,
  LogOut,
  Menu,
  PieChart,
  Plus,
  Repeat,
  Settings as SettingsIcon,
  Wallet,
  X,
} from 'lucide-react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button, Badge, notify, CopyButton, EbtMark } from './ui'
import { shortAddr } from '../lib/format'
import {
  WALLET_FAMILIES,
  disconnectNonEvmAccountById,
  openWalletModal,
  useAllNonEvmAccounts,
  type NonEvmFamily,
} from '../lib/walletsMulti'
import { NotificationBell } from './NotificationBell'
import { GlobalWalletModal, nonEvmLogoSrc } from './MultiWalletModal'
import pkg from '../../package.json'

const APP_VERSION = pkg.version

const NAV = [
  { to: '/', label: 'Overview', short: 'Overview', icon: LayoutGrid },
  { to: '/portfolio', label: 'Portfolio', short: 'Wallet', icon: PieChart },
  { to: '/bridge', label: 'Bridge', short: 'Bridge', icon: Repeat },
  { to: '/swap', label: 'Swap', short: 'Swap', icon: ArrowLeftRight },
  { to: '/faucets', label: 'Faucets', short: 'Faucets', icon: Droplets },
  { to: '/activity', label: 'Activity', short: 'Activity', icon: Activity },
  { to: '/settings', label: 'Settings', short: 'Settings', icon: SettingsIcon },
]

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ebt.sidebar') === 'collapsed'
    } catch {
      return false
    }
  })
  const location = useLocation()
  useEffect(() => setMobileOpen(false), [location.pathname])
  // the tab must name the screen you are on: "EBT | Portfolio", never a dash
  useEffect(() => {
    const label = NAV.find((n) => n.to === location.pathname)?.label
    const extra: Record<string, string> = { '/recover': 'Recover' }
    const title = label ?? extra[location.pathname]
    document.title = title ? `EBT | ${title}` : 'EBT'
  }, [location.pathname])
  useEffect(() => {
    try {
      localStorage.setItem('ebt.sidebar', collapsed ? 'collapsed' : 'expanded')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  return (
    <div className="min-h-dvh">
      {/* desktop sidebar */}
      <aside
        className={clsx(
          'fixed left-0 top-0 z-40 hidden h-dvh flex-col overflow-hidden border-r border-line-strong bg-ink-850 py-6 transition-[width,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex',
          collapsed ? 'w-[76px] px-2' : 'w-[256px] px-4',
        )}
      >
        <Brand compact={collapsed} onToggle={() => setCollapsed((v) => !v)} />

        <div className={collapsed ? 'mt-6' : 'mt-8'}>
          {!collapsed && <div className="col-head mb-2 px-2.5">Console</div>}
          <nav className="flex flex-col gap-1.5">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                title={collapsed ? n.label : undefined}
                aria-label={n.label}
                className={({ isActive }) =>
                  clsx('nav-item nav-item-lg', isActive && 'nav-item-active', collapsed && 'justify-center px-0')
                }
              >
                <n.icon size={collapsed ? 21 : 19} strokeWidth={1.9} className="shrink-0" />
                {!collapsed && n.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className={clsx('mt-auto pb-1', collapsed ? 'px-0' : 'px-0')}>
          {collapsed ? (
            <div className="flex justify-center" title="Testnet only">
              <EbtMark size={22} className="shrink-0" />
            </div>
          ) : (
            <div className="rounded-[10px] border border-line bg-ink-800 p-3">
              <div className="flex items-center gap-2.5">
                <EbtMark size={24} className="shrink-0" />
                <span className="text-[12px] font-semibold text-t1">Testnet only</span>
              </div>
              <p className="mt-2 text-[12px] leading-5 text-t2">
                Mainnet chains are rejected before a transaction is built. No custody, no backend.
              </p>
              <div className="mono mt-2 text-[11px] text-t3">build {APP_VERSION}</div>
            </div>
          )}
        </div>
      </aside>

      {/* mobile bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-line bg-ink-900 px-3 lg:hidden">
        <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-t2 transition-colors hover:bg-ink-700 hover:text-t1">
          <Menu size={18} />
        </button>
        <Brand compact />
        <div className="flex items-center gap-2">
          <NotificationBell />
          <ConnectButton compact />
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <div className="enter absolute left-0 top-0 h-full w-[80%] max-w-[300px] border-r border-line bg-ink-900 p-4">
            <div className="flex items-center justify-between">
              <Brand />
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-t2 hover:bg-ink-700">
                <X size={18} />
              </button>
            </div>
            <nav className="mt-6 flex flex-col gap-0.5">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => clsx('nav-item nav-item-lg', isActive && 'nav-item-active')}>
                  <n.icon size={18} strokeWidth={1.9} />
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      <main className={clsx('flex min-h-dvh flex-col', 'transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[256px]')}>
        <div className="sticky top-0 z-30 hidden h-14 items-center justify-end gap-3 border-b border-line-strong bg-ink-900 px-6 lg:flex">
          <NotificationBell />
          <ConnectButton />
        </div>
        <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 pb-6 pt-6 sm:px-8">
          <div key={location.pathname} className="enter flex flex-1 flex-col">
            <Outlet />
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-line bg-ink-900 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.filter((n) => ['/', '/portfolio', '/bridge', '/swap', '/activity'].includes(n.to)).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              clsx('flex flex-col items-center gap-1 py-2 text-[11px]', isActive ? 'text-t1' : 'text-t3')
            }
          >
            <n.icon size={18} strokeWidth={1.5} />
            <span className="max-w-full truncate px-0.5">{n.short}</span>
          </NavLink>
        ))}
      </nav>
      <GlobalWalletModal />
    </div>
  )
}

/** The EBT mark from the design file: diamond + Xi. Clicking it toggles the rail. */
function Brand({ compact, onToggle }: { compact?: boolean; onToggle?: () => void }) {
  const inner = (
    <>
      <EbtMark size={compact ? 38 : 44} className="shrink-0" />
      <div
        className={clsx(
          'min-w-0 overflow-hidden leading-tight transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          compact ? 'w-0 opacity-0' : 'w-auto opacity-100',
        )}
      >
        {/* positive tracking so the three letters never touch */}
        <div className="display whitespace-nowrap text-[22px] font-bold leading-7 tracking-[0.06em] text-t1">EBT</div>
        <div className="mt-1 whitespace-nowrap text-[12px] leading-4 text-t2">Easy Bridge Testnet</div>
      </div>
    </>
  )
  if (!onToggle)
    return <div className={clsx('flex items-center gap-3', !compact && 'px-1')}>{inner}</div>
  return (
    <button
      onClick={onToggle}
      className={clsx(
        'flex items-center gap-3 rounded-lg py-1 transition-colors hover:bg-ink-700',
        compact ? 'justify-center px-0' : 'px-1.5',
      )}
      title="Toggle sidebar"
      aria-label="Toggle sidebar"
    >
      {inner}
    </button>
  )
}

/* ───────────── unified multi-wallet connect ───────────── */

interface ConnectedEntry {
  key: string
  label: string
  sublabel: string
  address: string
  iconSrc?: string
  onDisconnect: () => void
}

function WalletAvatar({ iconSrc, label, size = 26 }: { iconSrc?: string; label: string; size?: number }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [iconSrc])

  if (!iconSrc || broken) {
    const abbr = label
      .replace(/[^A-Za-z0-9 ]/g, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0])
      .join('')
      .toUpperCase() || 'W'
    return (
      <span
        className="grid place-items-center rounded-full bg-ink-700 font-semibold text-t1"
        style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.36)) }}
      >
        {abbr}
      </span>
    )
  }
  return (
    <img
      src={iconSrc}
      alt={label}
      onError={() => setBroken(true)}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  )
}

export function ConnectButton({ compact, full }: { compact?: boolean; full?: boolean }) {
  const { address, isConnected, connector } = useAccount()
  const { connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const nonEvmList = useAllNonEvmAccounts()

  const [menuOpen, setMenuOpen] = useState(false)

  const connectedWallets = useMemo<ConnectedEntry[]>(() => {
    const list: ConnectedEntry[] = []
    if (isConnected && address) {
      const name = connector?.name && connector.name !== 'Injected' ? connector.name : 'EVM Wallet'
      const fallbackIcon = nonEvmLogoSrc('solana') ? '/logos/chains/tw_ethereum.png' : undefined
      list.push({
        key: 'evm',
        label: name,
        sublabel: 'EVM',
        address,
        iconSrc: connector?.icon ?? fallbackIcon,
        onDisconnect: () => {
          disconnect()
          notify(`Disconnected ${name}`, 'info')
        },
      })
    }
    for (const acct of nonEvmList) {
      const desc = WALLET_FAMILIES[acct.family as NonEvmFamily]
      const brandMatch = connectors.find(
        (c) => c.icon && acct.providerName.toLowerCase().includes(c.name.toLowerCase().split(' ')[0]),
      )
      list.push({
        key: acct.id,
        label: acct.providerName,
        sublabel: desc?.label ?? acct.family,
        address: acct.address,
        iconSrc: acct.iconSrc ?? brandMatch?.icon ?? nonEvmLogoSrc(acct.family),
        onDisconnect: () => {
          disconnectNonEvmAccountById(acct.id)
          notify(`Disconnected ${acct.providerName}`, 'info')
        },
      })
    }
    return list
  }, [isConnected, address, connector, nonEvmList, connectors, disconnect])

  if (full) {
    return (
      <Button
        size="lg"
        variant="primary"
        full
        onClick={() => openWalletModal()}
        loading={isPending}
      >
        <Wallet size={15} /> Connect
      </Button>
    )
  }

  if (connectedWallets.length === 0) {
    return (
      <Button
        size={compact ? 'sm' : 'md'}
        variant="secondary"
        onClick={() => openWalletModal()}
        loading={isPending}
      >
        <Wallet size={15} /> Connect
      </Button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Connected wallets"
        title={connectedWallets.map((w) => `${w.label}: ${shortAddr(w.address, 4)}`).join(' · ')}
        className="flex h-9 items-center rounded-full border border-line bg-ink-800 px-1.5 transition-colors hover:border-line-strong hover:bg-ink-700"
      >
        <span className="flex items-center">
          <span className="relative z-10 grid size-7 place-items-center overflow-hidden rounded-full border border-line-strong bg-ink-900 ring-2 ring-ink-800">
            <EbtMark size={20} />
          </span>
          {connectedWallets.slice(0, 5).map((w, idx) => (
            <span
              key={w.key}
              style={{ zIndex: 11 + idx }}
              className="-ml-2 grid size-7 place-items-center overflow-hidden rounded-full border border-line-strong bg-ink-900 ring-2 ring-ink-800"
            >
              <WalletAvatar iconSrc={w.iconSrc} label={w.label} size={26} />
            </span>
          ))}
          {connectedWallets.length > 5 && (
            <span
              style={{ zIndex: 20 }}
              className="-ml-2 grid size-7 place-items-center rounded-full border border-line-strong bg-ink-700 text-[10px] font-semibold text-t1 ring-2 ring-ink-800"
            >
              +{connectedWallets.length - 5}
            </span>
          )}
        </span>
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setMenuOpen(false)} />
          <div className="enter absolute right-0 top-[calc(100%+8px)] z-[70] w-72 overflow-hidden rounded-[12px] border border-line-strong bg-ink-800 p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between px-2.5 py-2">
              <span className="label">Connected wallets</span>
              <span className="mono text-[11px] text-t3">{connectedWallets.length}</span>
            </div>
            <div className="hairline my-1" />

            <div className="max-h-64 space-y-1 overflow-y-auto py-0.5">
              {connectedWallets.map((w) => (
                <div
                  key={w.key}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-ink-700/60"
                >
                  <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full border border-line-strong bg-ink-900">
                    <WalletAvatar iconSrc={w.iconSrc} label={w.label} size={26} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-t1">{w.label}</div>
                    <div className="mono flex items-center gap-1 text-[11px] text-t2">
                      <span>{shortAddr(w.address, 5)}</span>
                      <CopyButton value={w.address} />
                    </div>
                  </div>
                  <button
                    onClick={w.onDisconnect}
                    title={`Disconnect ${w.label}`}
                    aria-label={`Disconnect ${w.label}`}
                    className="grid size-7 shrink-0 place-items-center rounded-md text-t3 transition-colors hover:bg-[#ff8f8f]/15 hover:text-[#ffb4b4]"
                  >
                    <LogOut size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="hairline my-1" />
            <button
              onClick={() => {
                setMenuOpen(false)
                openWalletModal()
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-accent transition-colors hover:bg-accent/10"
            >
              <Plus size={14} /> Connect another wallet
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  right,
}: {
  title: string
  subtitle?: string
  /** small mono label above the title, e.g. "Operations console" */
  eyebrow?: string
  right?: React.ReactNode
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="display text-[32px] leading-10 tracking-[-0.02em] text-t1">{title}</h1>
        {subtitle && <p className="mt-2 max-w-[68ch] text-[14px] leading-5 text-t2">{subtitle}</p>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  )
}

export { Badge }
