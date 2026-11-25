import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Ban, Droplets, Info, Search, Star } from 'lucide-react'
import { CHAINS, type ChainCfg, type FaucetLink } from '../config/chains'
import { Badge, Button, Card, ChainLogo, CopyButton, Modal, TokenIcon } from '../components/ui'
import { PageHeader } from '../components/Layout'

const ACCESS_LABEL: Record<string, string> = {
  free: 'no account',
  account: 'account needed',
  pow: 'proof of work',
  tasks: 'tasks required',
}

const SAVED_KEY = 'ebt.savedFaucets'

/** favicon of the faucet's own site, so a source is recognisable before it is clicked */
function FaucetLogo({ url, fallback }: { url: string; fallback: React.ReactNode }) {
  const [bad, setBad] = useState(false)
  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return <>{fallback}</>
  }
  const src = `/logos/faucets/${host}.png`
  useEffect(() => setBad(false), [src])
  if (bad) return <>{fallback}</>
  return <img src={src} alt="" className="h-5 w-5 object-contain" onError={() => setBad(true)} />
}

/** the one-line requirement summary shown under a source name */
function metaLine(f: FaucetLink) {
  const bits: string[] = []
  if (f.access) bits.push(ACCESS_LABEL[f.access] ?? f.access)
  if (f.cooldown) bits.push(f.cooldown)
  bits.push(...(f.tokens ?? []))
  return bits.join(' · ')
}

export default function Faucets() {
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState<{ chain: ChainCfg; faucet: FaucetLink } | null>(null)
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY)
      const arr = raw ? (JSON.parse(raw) as unknown) : []
      return Array.isArray(arr) ? (arr as string[]) : []
    } catch {
      return []
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(saved))
    } catch {
      /* storage is optional */
    }
  }, [saved])

  const toggleSaved = (url: string) =>
    setSaved((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]))

  const needle = q.trim().toLowerCase()
  const chains = needle
    ? CHAINS.filter((c) =>
        `${c.name} ${c.short} ${c.faucets.map((f) => f.label).join(' ')}`.toLowerCase().includes(needle),
      )
    : CHAINS

  const withLinks = useMemo(() => CHAINS.filter((c) => c.faucets.some((f) => !f.missing)).length, [])
  const withoutLinks = useMemo(() => CHAINS.filter((c) => c.faucets.every((f) => f.missing)).length, [])
  const savedRows = useMemo(() => {
    const rows: { chain: ChainCfg; faucet: FaucetLink }[] = []
    for (const c of CHAINS) for (const f of c.faucets) if (saved.includes(f.url)) rows.push({ chain: c, faucet: f })
    return rows
  }, [saved])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Developer resources"
        title="Faucet directory"
        subtitle="Official faucets only, grouped by testnet. Every link below is the network's own or the stablecoin issuer's; cooldowns are set by the providers, not by EBT."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* main column */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="field flex h-[38px] w-full max-w-[420px] items-center gap-2 px-3">
              <Search size={15} className="text-t2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter testnets or providers…"
                className="input text-[14px]"
              />
            </div>
            <span className="mono text-[12px] uppercase tracking-[0.6px] text-t2">
              {withLinks} with links · {withoutLinks} without
            </span>
          </div>

          {chains.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <header className="flex items-center gap-3 px-5 py-4">
                <ChainLogo chain={c} size={30} />
                <div className="min-w-0 flex-1">
                  <h2 className="display truncate text-[18px] leading-7 text-t1">{c.name}</h2>
                  <div className="mono flex items-center gap-1 text-[12px] uppercase tracking-[0.6px] text-t2">
                    chain {c.id} <CopyButton value={String(c.id)} />
                  </div>
                </div>
                <span className="chip chip-accent">{c.viem.nativeCurrency.symbol}</span>
              </header>

              <div className="space-y-2 border-t border-line-strong px-3 py-3">
                {c.faucets.map((f) => {
                  const isSaved = saved.includes(f.url) && !f.missing
                  return (
                    <div
                      key={f.url + f.label}
                      className={`flex items-start gap-3 rounded-[10px] border px-3 py-2.5 ${
                        f.missing ? 'border-dashed border-warn/35 bg-warn/[0.04]' : 'border-line bg-ink-850'
                      }`}
                    >
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-ink-700">
                        {f.missing ? (
                          <Ban size={14} className="text-warn" />
                        ) : (
                          <FaucetLogo url={f.url} fallback={<Droplets size={14} className="text-accent" />} />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[14px] font-semibold leading-5 text-t1">{f.label}</span>
                          {isSaved && <Star size={11} className="shrink-0 fill-accent text-accent" />}
                        </div>
                        <div className="mono mt-0.5 text-[12px] uppercase tracking-[0.6px] text-t2">{metaLine(f)}</div>
                        {f.note && <p className="mt-1 text-[12px] leading-4 text-t2">{f.note}</p>}
                      </div>

                      {f.missing ? (
                        <span className="mt-1 shrink-0 rounded-md border border-warn/40 px-2 py-1 text-[10px] uppercase tracking-[0.6px] text-warn">
                          not available
                        </span>
                      ) : (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            onClick={() => toggleSaved(f.url)}
                            title={isSaved ? 'Remove from saved' : 'Save faucet'}
                            aria-label={isSaved ? 'Remove from saved' : 'Save faucet'}
                            className={`grid size-[30px] place-items-center rounded-md border transition-colors ${
                              isSaved
                                ? 'border-accent/40 text-accent'
                                : 'border-line-strong text-t2 hover:border-[#3f4a66] hover:text-t1'
                            }`}
                          >
                            <Star size={13} className={isSaved ? 'fill-accent' : ''} />
                          </button>
                          <button
                            onClick={() => setDetail({ chain: c, faucet: f })}
                            className="rounded-md border border-line-strong px-2.5 py-[6px] text-[12px] text-t1 transition-colors hover:border-[#3f4a66] hover:bg-ink-700"
                          >
                            Requirements
                          </button>
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-[6px] text-[12px] font-semibold text-[#111628] transition-colors hover:bg-accent-2"
                          >
                            Open <ArrowUpRight size={11} />
                          </a>
                        </div>
                      )}
                    </div>
                  )
                })}

                {c.faucets.length === 0 && (
                  <div className="rounded-[10px] border border-dashed border-line px-3 py-2.5">
                    <p className="text-[12px] leading-5 text-t2">No faucet link is published here that we could verify.</p>
                  </div>
                )}
              </div>

              <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-5 py-2.5 text-[12px] text-t2">
                <span className="mono lowercase">
                  rpc {new URL(c.viem.rpcUrls.default.http[0]).host}
                </span>
                <a
                  href={c.viem.blockExplorers?.default?.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mono uppercase tracking-[0.6px] text-accent transition-opacity hover:opacity-80"
                >
                  explorer ↗
                </a>
              </footer>
            </Card>
          ))}

          {chains.length === 0 && (
            <Card className="p-6 text-[14px] text-t2">No testnet matches “{q}”.</Card>
          )}
        </div>

        {/* right rail */}
        <aside className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="display text-[16px] leading-6 text-t1">Saved faucets</h2>
              <span className="chip">{savedRows.length}</span>
            </div>
            <div className="border-t border-line-strong">
              {savedRows.length === 0 && (
                <p className="px-4 py-4 text-[12px] leading-5 text-t2">
                  Nothing saved yet. Use the star on any source to pin it here — it is stored in this browser only.
                </p>
              )}
              {savedRows.map(({ chain, faucet }) => (
                <a
                  key={faucet.url}
                  href={faucet.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 border-b border-line px-4 py-2.5 last:border-0 hover:bg-ink-700"
                >
                  <FaucetLogo url={faucet.url} fallback={<Droplets size={13} className="text-accent" />} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-t1">{faucet.label}</span>
                    <span className="mono block truncate text-[11px] uppercase tracking-[0.6px] text-t2">{chain.short}</span>
                  </span>
                  <ArrowUpRight size={12} className="shrink-0 text-t2" />
                </a>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-2">
              <Info size={14} className="mt-0.5 shrink-0 text-accent" />
              <div>
                <h2 className="display text-[16px] leading-6 text-t1">Two tokens are needed for most flows</h2>
                <p className="mt-1 text-[12px] leading-5 text-t2">
                  Keep native gas for transactions and USDC for CCTP. Circle's faucet at{' '}
                  <a className="text-accent hover:underline" href="https://faucet.circle.com" target="_blank" rel="noreferrer">
                    faucet.circle.com
                  </a>{' '}
                  issues testnet USDC on every CCTP chain from one place.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="display text-[16px] leading-6 text-t1">Not listed on purpose</h2>
            <p className="mt-1 text-[12px] leading-5 text-t2">
              Plume Testnet and Cronos Testnet are CCTP chains but their public RPCs did not respond during
              verification on 2026-11-23, so they are excluded rather than shown with broken faucets. Song (Sonic)
              testnet ids differ between the provider's docs and viem's chain definition.
            </p>
            <p className="mt-2 text-[12px] leading-5 text-t2">
              Where no faucet could be verified, the row says so instead of sending you to a guessed URL.
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="display text-[16px] leading-6 text-t1">Link freshness</h2>
            <p className="mt-1 text-[12px] leading-5 text-t2">
              Each source carries the date it was last checked. A link that stops answering is removed, not
              silently kept.
            </p>
            <Button variant="secondary" className="mt-3 w-full" onClick={() => setQ('')}>
              Clear filter
            </Button>
          </Card>
        </aside>
      </div>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.faucet.label} · ${detail.chain.short}` : ''}
      >
        {detail && (
          <div className="space-y-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="blue">{detail.chain.name}</Badge>
              {detail.faucet.access && <Badge>{ACCESS_LABEL[detail.faucet.access] ?? detail.faucet.access}</Badge>}
              {detail.faucet.cooldown && <Badge tone="amber">cooldown {detail.faucet.cooldown}</Badge>}
            </div>
            <div>
              <div className="col-head mb-1">Dispenses</div>
              <div className="flex flex-wrap gap-1.5">
                {(detail.faucet.tokens ?? []).map((t) => (
                  <span key={t} className="chip">
                    <TokenIcon symbol={t} size={14} /> {t}
                  </span>
                ))}
                {!detail.faucet.tokens?.length && <span className="text-[12px] text-t2">Not verified</span>}
              </div>
            </div>
            <div>
              <div className="col-head mb-1">Verified requirements</div>
              {detail.faucet.note ? (
                <p className="text-[13px] leading-5 text-t1">{detail.faucet.note}</p>
              ) : (
                <p className="text-[13px] leading-5 text-warn">Requirements not verified for this provider.</p>
              )}
              {detail.faucet.access && (
                <p className="mt-1.5 text-[12px] leading-5 text-t2">
                  Access: {ACCESS_LABEL[detail.faucet.access] ?? detail.faucet.access}. Cooldown:{' '}
                  {detail.faucet.cooldown ?? 'not published'}.
                </p>
              )}
            </div>
            <div className="mono break-all rounded-lg border border-line-strong bg-ink-850 px-3 py-2 text-[12px] text-t2">
              {detail.faucet.url}
            </div>
            <div className="flex items-center justify-between text-[12px] text-t2">
              <span>Link checked {detail.faucet.checked ?? 'not recorded'}</span>
              <a href={detail.faucet.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                Open faucet <ArrowUpRight size={11} className="inline" />
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
