import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import {
  Activity,
  ArrowLeftRight,
  ChevronDown,
  Droplets,
  LayoutGrid,
  LogOut,
  Menu,
  PieChart,
  Repeat,
  Settings as SettingsIcon,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react'
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { getChain } from '../config/chains'
import { Button, Badge, notify, CopyButton, ChainLogo, StatusDot, EbtMark } from './ui'
import { shortAddr } from '../lib/format'
import { WALLETCONNECT_NOTE } from '../lib/wallet'
import { NotificationBell } from './NotificationBell'
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
              <StatusDot tone="mint" />
            </div>
          ) : (
            <div className="rounded-[10px] border border-line bg-ink-800 p-3">
              <div className="flex items-center gap-2">
                <EbtMark size={15} className="text-accent" />
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
    </div>
  )
}

/** The EBT mark from the design file: diamond + Xi. Clicking it toggles the rail. */
function Brand({ compact, onToggle }: { compact?: boolean; onToggle?: () => void }) {
  const inner = (
    <>
      <EbtMark size={compact ? 38 : 44} className="text-accent shrink-0" />
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

/* ───────────── wallet ───────────── */

export function ConnectButton({ compact, full }: { compact?: boolean; full?: boolean }) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const [open, setOpen] = useState(false)
  const chain = getChain(chainId)

  const injected = useMemo(() => connectors.filter((c) => c.id === 'injected' || c.type === 'injected'), [connectors])

  if (!isConnected) {
    return (
      <>
        <Button
          size={full ? 'lg' : compact ? 'sm' : 'md'}
          variant={full || compact ? (full ? 'primary' : 'secondary') : 'secondary'}
          full={full}
          onClick={() => setOpen(true)}
          loading={isPending}
        >
          <Wallet size={15} /> Connect
        </Button>
        {open && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 sm:items-center sm:p-6">
            <div className="absolute inset-0" onClick={() => setOpen(false)} />
            <div className="enter relative z-10 w-full max-w-sm rounded-b-none border border-line bg-ink-800 p-5 sm:rounded-[14px]">
              <div className="mb-1 text-[14px] font-medium text-t1">Connect a wallet</div>
              <p className="mb-4 text-[12px] leading-5 text-t2">{WALLETCONNECT_NOTE}</p>
              <div className="space-y-2">
                {injected.length === 0 && (
                  <div className="rounded-lg border border-[#e6c17a]/30 bg-[#1a1710] p-3 text-[12px] leading-5 text-[#e6c17a]">
                    No browser wallet detected. Install MetaMask, Rabby or Coinbase Wallet, then reload.
                  </div>
                )}
                {injected.map((c) => (
                  <button
                    key={c.uid}
                    onClick={() =>
                      connect(
                        { connector: c },
                        {
                          onSuccess: () => {
                            setOpen(false)
                            notify('Wallet connected', 'success')
                          },
                          onError: (e) => notify(e.message, 'error'),
                        },
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-lg border border-line bg-ink-850 px-3 py-3 text-left transition-colors hover:border-line-strong hover:bg-ink-700"
                  >
                    {c.icon ? <img src={c.icon} alt="" className="h-7 w-7 rounded-md" /> : <Wallet size={22} />}
                    <span className="text-[14px] text-t1">{c.name === 'Injected' ? 'Browser wallet' : c.name}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setOpen(false)} className="mt-4 w-full py-2 text-[13px] text-t3 transition-colors hover:text-t1">
                Cancel
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-lg border border-line bg-ink-800 px-2.5 transition-colors hover:border-line-strong hover:bg-ink-700"
      >
        {chain ? <ChainLogo chain={chain} size={18} /> : <StatusDot tone="red" />}
        <span className="hidden text-[13px] text-t2 sm:inline">{chain?.short ?? `Chain ${chainId}`}</span>
        <span className="mono text-[12px] text-t1">{shortAddr(address, 3)}</span>
        <ChevronDown size={13} className="text-t3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="enter absolute right-0 top-[calc(100%+6px)] z-[70] w-64 overflow-hidden rounded-[10px] border border-line bg-ink-800 p-1.5">
            <div className="px-2.5 py-2">
              <div className="label">Connected</div>
              <div className="mono mt-0.5 flex items-center gap-1 text-t1">
                {shortAddr(address, 6)} <CopyButton value={address ?? ''} />
              </div>
            </div>
            <div className="hairline my-1" />
            <div className="label px-2.5 py-1.5">Switch network</div>
            <div className="max-h-56 overflow-y-auto">
              {['11155111', '84532', '1301', '421614', '11155420', '80002', '43113', '5042002', '91342'].map((id) => {
                const c = getChain(Number(id))
                if (!c) return null
                return (
                  <button
                    key={id}
                    onClick={() =>
                      switchChain(
                        { chainId: c.id },
                        { onError: (e) => notify(e.message, 'error'), onSuccess: () => setOpen(false) },
                      )
                    }
                    className={clsx(
                      'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-ink-700',
                      chainId === c.id ? 'text-accent' : 'text-t2',
                    )}
                  >
                    <ChainLogo chain={c} size={16} /> {c.name}
                  </button>
                )
              })}
            </div>
            <div className="hairline my-1" />
            <button
              onClick={() => {
                disconnect()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-[#ffb4b4] transition-colors hover:bg-[#ff8f8f]/10"
            >
              <LogOut size={14} /> Disconnect
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
