import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, Ban, Droplets, Info, Search, X } from 'lucide-react'
import { type FaucetLink } from '../config/chains'
import { ALL_NETWORKS, type NetworkEntry } from '../config/networks'
import { Badge, Card, NetworkLogo, TokenIcon } from '../components/ui'
import { PageHeader } from '../components/Layout'

const ACCESS_LABEL: Record<string, string> = {
  free: 'No account',
  account: 'Account needed',
  pow: 'Proof of work',
  tasks: 'Tasks required',
}

const SOURCE_LABEL: Record<NonNullable<FaucetLink['sourceType']>, string> = {
  official: 'Official',
  ecosystem: 'Ecosystem',
  'third-party': '3rd-party',
  discord: 'Discord',
}

const VERIFY_STYLE: Record<NonNullable<FaucetLink['verification']>, { label: string; cls: string }> = {
  verified: { label: 'verified', cls: 'border-pos/35 bg-pos/10 text-pos' },
  untested: { label: 'claim untested (gated)', cls: 'border-warn/35 bg-warn/10 text-warn' },
  maintenance: { label: 'maintenance', cls: 'border-warn/45 bg-warn/15 text-warn' },
  unavailable: { label: 'unavailable', cls: 'border-neg/40 bg-neg/10 text-neg' },
}

function resolveSourceType(f: FaucetLink): NonNullable<FaucetLink['sourceType']> {
  if (f.sourceType) return f.sourceType
  const low = `${f.label} ${f.url}`.toLowerCase()
  if (low.includes('discord')) return 'discord'
  if (low.includes('chain.link') || low.includes('chainlink') || low.includes('coinbase') || low.includes('metamask') || low.includes('okx')) return 'ecosystem'
  if (low.includes('alchemy') || low.includes('quicknode') || low.includes('google') || low.includes('chainstack') || low.includes('thirdweb') || low.includes('allthatnode') || low.includes('pk910') || low.includes('lambda256')) return 'third-party'
  return 'official'
}

function resolveVerification(f: FaucetLink): NonNullable<FaucetLink['verification']> {
  if (f.verification) return f.verification
  if (f.missing || f.inactive) return 'unavailable'
  const low = `${f.note ?? ''} ${f.label}`.toLowerCase()
  if (low.includes('maintenancemode: true') || low.includes('maintenance')) return 'maintenance'
  return 'verified'
}

/** Favicon of the faucet's own site */
function FaucetLogo({ url, size = 24 }: { url: string; size?: number }) {
  const [bad, setBad] = useState(false)
  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return <Droplets size={size - 4} className="text-accent" />
  }
  // Try multiple favicon sources for better coverage
  const src = `/logos/faucets/${host}.png`
  const googleFavicon = `https://www.google.com/s2/favicons?domain=${host}&sz=64`
  const [useFallback, setUseFallback] = useState(false)

  useEffect(() => { setBad(false); setUseFallback(false) }, [host])

  if (bad) return <Droplets size={size - 4} className="text-accent" />
  return (
    <img
      src={useFallback ? googleFavicon : src}
      alt=""
      style={{ width: size, height: size }}
      className="rounded object-contain"
      onError={() => {
        if (!useFallback) setUseFallback(true)
        else setBad(true)
      }}
    />
  )
}

/** Requirements popup card shown inline below the faucet row */
function RequirementsPopup({
  network,
  faucet,
  onClose,
}: {
  network: NetworkEntry
  faucet: FaucetLink
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="animate-in fade-in slide-in-from-top-2 mt-2 rounded-xl border border-line-strong bg-ink-800 p-4 shadow-xl duration-150"
    >
      {/* header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <FaucetLogo url={faucet.url} size={22} />
          <span className="text-[14px] font-semibold text-t1">{faucet.label}</span>
        </div>
        <button
          onClick={onClose}
          className="grid size-6 place-items-center rounded-md text-t3 hover:bg-ink-700 hover:text-t1"
        >
          <X size={13} />
        </button>
      </div>

      <div className="space-y-2.5">
        {/* tokens */}
        {faucet.tokens && faucet.tokens.length > 0 && (
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.6px] text-t3">
              Dispenses
            </div>
            <div className="flex flex-wrap gap-1.5">
              {faucet.tokens.map((t) => (
                <span key={t} className="chip flex items-center gap-1">
                  <TokenIcon symbol={t} size={13} />
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* access + cooldown + source + verification */}
        <div className="flex flex-wrap gap-1.5">
          <span className="chip text-[11px]">{SOURCE_LABEL[resolveSourceType(faucet)]}</span>
          {(() => {
            const v = resolveVerification(faucet)
            const vs = VERIFY_STYLE[v]
            return (
              <span className={`rounded border px-2 py-0.5 text-[11px] font-medium ${vs.cls}`}>
                {vs.label}
              </span>
            )
          })()}
          {faucet.access && (
            <span className="chip chip-accent text-[11px]">
              {ACCESS_LABEL[faucet.access] ?? faucet.access}
            </span>
          )}
          {faucet.cooldown && (
            <span className="chip text-[11px]">⏱ Cooldown: {faucet.cooldown}</span>
          )}
          {faucet.amount && (
            <span className="chip text-[11px]">💧 {faucet.amount}</span>
          )}
        </div>

        {/* checked date */}
        {faucet.checked && (
          <div className="flex flex-wrap gap-1.5">
            <span className="chip text-[11px]">Checked: {faucet.checked}</span>
          </div>
        )}
        {(faucet.requirements?.length || faucet.note) && (
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.6px] text-t3">
              Requirements
            </div>
            {faucet.requirements && faucet.requirements.length > 0 && (
              <ul className="mb-1.5 list-disc space-y-0.5 pl-4 text-[12px] text-t1">
                {faucet.requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
            {faucet.note && <p className="text-[13px] leading-5 text-t2">{faucet.note}</p>}
          </div>
        )}

        {!faucet.note && !faucet.requirements?.length && (
          <p className="text-[12px] leading-5 text-warn">Requirements not verified for this provider.</p>
        )}

        {/* URL + open */}
        <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
          <span className="mono truncate text-[11px] text-t3">{faucet.url}</span>
          <a
            href={faucet.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-[12px] font-semibold text-[#111628] hover:bg-accent-2"
          >
            Open <ArrowUpRight size={11} />
          </a>
        </div>
      </div>
    </div>
  )
}

/** Single faucet row */
function FaucetRow({
  network,
  faucet,
}: {
  network: NetworkEntry
  faucet: FaucetLink
}) {
  const [showReq, setShowReq] = useState(false)

  if (faucet.missing) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-warn/35 bg-warn/[0.04] px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-warn/30 bg-ink-700">
          <Ban size={15} className="text-warn" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-warn/80">{faucet.label}</div>
          {faucet.note && (
            <div className="mt-0.5 text-[12px] leading-4 text-t3">{faucet.note}</div>
          )}
        </div>
        <span className="shrink-0 rounded-md border border-warn/40 px-2 py-1 text-[10px] uppercase tracking-[0.6px] text-warn">
          not available
        </span>
      </div>
    )
  }

  if (faucet.inactive) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-neg/30 bg-neg/[0.04] px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-neg/30 bg-ink-700">
          <FaucetLogo url={faucet.url} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-t2 line-through decoration-neg/60">
            {faucet.label}
          </div>
          {faucet.note && (
            <div className="mt-0.5 text-[12px] leading-4 text-t3">{faucet.note}</div>
          )}
        </div>
        <span className="shrink-0 rounded-md border border-neg/40 bg-neg/10 px-2 py-1 text-[10px] uppercase tracking-[0.6px] text-neg">
          inactive
        </span>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 rounded-xl border border-line bg-ink-850 px-4 py-3 transition-colors hover:border-line-strong hover:bg-ink-800">
        {/* logo */}
        <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-ink-700">
          <FaucetLogo url={faucet.url} size={22} />
        </span>

        {/* info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[15px] font-semibold text-t1">{faucet.label}</span>
            <span className="rounded border border-line-strong bg-ink-800 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.5px] text-t2">
              {SOURCE_LABEL[resolveSourceType(faucet)]}
            </span>
            {(() => {
              const v = resolveVerification(faucet)
              if (v === 'verified') return null
              const vs = VERIFY_STYLE[v]
              return (
                <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.5px] ${vs.cls}`}>
                  {v === 'untested' ? 'gated' : vs.label}
                </span>
              )
            })()}
          </div>
          <div className="mono mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-t2">
            {faucet.access && (
              <span className={faucet.access === 'free' ? 'text-pos' : 'text-t2'}>
                {ACCESS_LABEL[faucet.access] ?? faucet.access}
              </span>
            )}
            {faucet.amount && <span className="text-t1">{faucet.amount}</span>}
            {faucet.cooldown && <span>/{faucet.cooldown}</span>}
            {faucet.tokens && faucet.tokens.length > 0 && (
              <span className="text-t3">{faucet.tokens.join(', ')}</span>
            )}
          </div>
        </div>

        {/* actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => setShowReq((v) => !v)}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-[6px] text-[12px] transition-colors ${
              showReq
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-line-strong text-t2 hover:border-[#3f4a66] hover:bg-ink-700 hover:text-t1'
            }`}
          >
            <Info size={11} />
            Requirements
          </button>
          <a
            href={faucet.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-[6px] text-[12px] font-semibold text-[#111628] transition-colors hover:bg-accent-2"
          >
            Open <ArrowUpRight size={11} />
          </a>
        </div>
      </div>

      {/* inline requirements popup */}
      {showReq && (
        <RequirementsPopup network={network} faucet={faucet} onClose={() => setShowReq(false)} />
      )}
    </div>
  )
}

export default function Faucets() {
  const [q, setQ] = useState('')

  const needle = q.trim().toLowerCase()

  // Sort networks: active faucets first (by count), then non-deprecated missing, then deprecated
  const sortedNetworks = useMemo(() => {
    const withActive = ALL_NETWORKS.filter((n) => n.status !== 'deprecated' && n.faucets.some((f) => !f.missing && !f.inactive))
    const onlyMissing = ALL_NETWORKS.filter((n) => n.status !== 'deprecated' && n.faucets.every((f) => f.missing || f.inactive))
    const deprecated = ALL_NETWORKS.filter((n) => n.status === 'deprecated')

    withActive.sort(
      (a, b) =>
        b.faucets.filter((f) => !f.missing && !f.inactive).length -
        a.faucets.filter((f) => !f.missing && !f.inactive).length,
    )

    return [...withActive, ...onlyMissing, ...deprecated]
  }, [])

  const networks = useMemo(() => {
    return sortedNetworks.filter((n) => {
      if (!needle) return true
      return `${n.name} ${n.short} ${n.family} ${n.nativeId} ${n.aliases.join(' ')} ${n.faucets.map((f) => f.label).join(' ')}`
        .toLowerCase()
        .includes(needle)
    })
  }, [sortedNetworks, needle])

  const totalSources = useMemo(
    () => ALL_NETWORKS.reduce((n, net) => n + net.faucets.filter((f) => !f.missing && !f.inactive).length, 0),
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Developer resources"
        title="Faucet directory"
        subtitle="Testnet token sources across supported networks — verified from official docs, Chainlink Faucet, and Circle Faucet."
      />

      {/* search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="field flex h-[40px] w-full max-w-[460px] items-center gap-2 px-3">
          <Search size={15} className="shrink-0 text-t2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search network, alias, family, or faucet…"
            className="input text-[14px]"
          />
          {q && (
            <button onClick={() => setQ('')} className="shrink-0 text-t3 hover:text-t1">
              <X size={13} />
            </button>
          )}
        </div>
        <span className="mono text-[12px] uppercase tracking-[0.6px] text-t2">
          {totalSources} active sources · {networks.length} shown
        </span>
      </div>

      {/* network cards */}
      <div className="space-y-4">
        {networks.map((n) => {
          const activeFaucets = n.faucets.filter((f) => !f.missing && !f.inactive)
          const inactiveFaucets = n.faucets.filter((f) => f.inactive && !f.missing)
          const missingFaucets = n.faucets.filter((f) => f.missing)
          const allUnavailable = activeFaucets.length === 0
          let rpcHost = ''
          try {
            rpcHost = n.rpcUrl ? new URL(n.rpcUrl).host : ''
          } catch {
            rpcHost = n.rpcUrl
          }

          return (
            <Card key={n.id} className={`overflow-hidden ${allUnavailable || n.status === 'deprecated' ? 'opacity-70' : ''}`}>
              <header className="flex items-center gap-3 px-5 py-4">
                <NetworkLogo network={n} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="display truncate text-[18px] leading-7 text-t1">{n.name}</h2>
                    {n.aliases.length > 0 && (
                      <span className="text-[11px] text-t3">(alias: {n.aliases.join(', ')})</span>
                    )}
                    {n.status === 'deprecated' && <Badge tone="red">deprecated</Badge>}
                  </div>
                  <div className="mono flex flex-wrap items-center gap-2 text-[12px] text-t2">
                    <span className="uppercase tracking-[0.6px]">
                      {n.family === 'evm' ? `chain ${n.nativeId}` : n.nativeId.slice(0, 20)}
                    </span>
                    {activeFaucets.length > 0 && (
                      <span className="text-pos">
                        {activeFaucets.length} source{activeFaucets.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {allUnavailable && (
                      <span className="rounded border border-warn/40 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.6px] text-warn">
                        no sources
                      </span>
                    )}
                  </div>
                </div>
                <span className="chip chip-accent">{n.nativeCurrency.symbol}</span>
              </header>

              {n.statusNote && (
                <div className="border-t border-line bg-neg/[0.04] px-5 py-2 text-[12px] text-t2">
                  {n.statusNote}
                </div>
              )}

              <div className="space-y-2 border-t border-line-strong px-4 py-3">
                {/* active faucets */}
                {activeFaucets.map((f) => (
                  <FaucetRow key={f.url + f.label} network={n} faucet={f} />
                ))}

                {/* inactive faucets */}
                {inactiveFaucets.map((f) => (
                  <FaucetRow key={f.url + f.label + 'inactive'} network={n} faucet={f} />
                ))}

                {/* missing (no faucet exists) */}
                {missingFaucets.map((f) => (
                  <FaucetRow key={f.label + 'missing'} network={n} faucet={f} />
                ))}

                {n.faucets.length === 0 && (
                  <div className="rounded-xl border border-dashed border-line px-4 py-3">
                    <p className="text-[13px] leading-5 text-t2">
                      No faucet link could be verified for this network.
                    </p>
                  </div>
                )}
              </div>

              <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-5 py-2.5 text-[12px] text-t2">
                {rpcHost && <span className="mono lowercase">rpc {rpcHost}</span>}
                {n.explorerUrl && (
                  <a
                    href={n.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mono uppercase tracking-[0.6px] text-accent transition-opacity hover:opacity-80"
                  >
                    explorer ↗
                  </a>
                )}
              </footer>
            </Card>
          )
        })}

        {networks.length === 0 && (
          <Card className="p-6 text-[14px] text-t2">No result for "{q}".</Card>
        )}
      </div>
    </div>
  )
}
