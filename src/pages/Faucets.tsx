import { useEffect, useState } from 'react'
import { ArrowUpRight, Ban, Droplets, Info, Search } from 'lucide-react'
import { CHAINS, type ChainCfg, type FaucetLink } from '../config/chains'
import { Badge, Button, Card, ChainLogo, CopyButton, Modal, TokenIcon } from '../components/ui'
import { PageHeader } from '../components/Layout'

const ACCESS_LABEL: Record<string, string> = {
  free: 'No account',
  account: 'Account needed',
  pow: 'Proof of work',
  tasks: 'Tasks required',
}

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

export default function Faucets() {
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState<{ chain: ChainCfg; faucet: FaucetLink } | null>(null)
  const needle = q.trim().toLowerCase()
  const chains = needle ? CHAINS.filter((c) => `${c.name} ${c.short}`.toLowerCase().includes(needle)) : CHAINS

  return (
    <div className="space-y-5">
      <PageHeader
        title="Faucet directory"
        subtitle="Official faucets only, every link below is the network's own or the stablecoin issuer's. Cooldowns are set by the providers, not by EBT."
      />

      <Card className="p-4">
        <div className="flex items-start gap-2 text-[11px] leading-relaxed text-t2">
          <Info size={14} className="mt-0.5 shrink-0 text-accent" />
          <div>
            <span className="font-semibold text-t1">Two tokens are needed for most flows:</span> native gas (ETH/AVAX/MON/POL/SEI…)
            to pay for transactions, and USDC for CCTP. Circle's faucet at{' '}
            <a className="text-accent hover:underline" href="https://faucet.circle.com" target="_blank" rel="noreferrer">
              faucet.circle.com
            </a>{' '}
            issues testnet USDC on every CCTP chain from one place, which is usually the fastest path.
          </div>
        </div>
      </Card>

      <div className="flex h-10 w-full max-w-[420px] items-center gap-2 rounded-lg border border-line bg-ink-850 px-3">
        <Search size={15} className="text-t3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter testnets…" className="input text-sm" />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
        {chains.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-center gap-2.5">
              <ChainLogo chain={c} size={32} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{c.name}</div>
                <div className="mono flex items-center gap-1 text-[10px] text-t3">
                  chainId {c.id} <CopyButton value={String(c.id)} />
                </div>
              </div>
              <Badge className="shrink-0 self-center">{c.viem.nativeCurrency.symbol}</Badge>
            </div>

            <div className="mt-3 space-y-1.5">
              {c.faucets.map((f) => (
                <div
                  key={f.url + f.label}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
                    f.missing ? 'border-dashed border-[#e3c07b]/30 bg-[#e3c07b]/5' : 'border-line bg-ink-850'
                  }`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md bg-ink-700">
                    {f.missing ? (
                      <Ban size={13} className="text-[#e3c07b]" />
                    ) : (
                      <FaucetLogo url={f.url} fallback={<Droplets size={13} className="text-accent" />} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] text-t1">{f.label}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                      {f.access && <span className="chip !text-[9px]">{ACCESS_LABEL[f.access] ?? f.access}</span>}
                      {f.cooldown && <span className="mono text-[10px] text-t3">{f.cooldown}</span>}
                      {f.tokens?.map((t) => (
                        <span key={t} className="chip !px-1.5 !py-0 !text-[9px]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  {f.missing ? (
                    <span className="shrink-0 rounded-md border border-[#e3c07b]/30 px-2 py-1 text-[10px] uppercase tracking-wide text-[#e3c07b]">
                      not available
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => setDetail({ chain: c, faucet: f })}
                        className="shrink-0 rounded-md border border-line px-2 py-1 text-[11px] text-t2 transition-colors hover:border-line-strong hover:text-t1"
                      >
                        Requirements
                      </button>
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex shrink-0 items-center gap-1 rounded-md bg-ink-700 px-2.5 py-1 text-[11px] text-t1 transition-colors hover:bg-ink-600"
                      >
                        Open <ArrowUpRight size={11} />
                      </a>
                    </>
                  )}
                </div>
              ))}
              {c.faucets.length === 0 && (
                <div className="rounded-lg border border-dashed border-line bg-ink-850/50 px-3 py-2.5">
                  <p className="text-[12px] leading-relaxed text-t2">
                    No faucet link is published here that we could verify, so none is shown.
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-t3">
                    Get {c.viem.nativeCurrency.symbol} by bridging it from{' '}
                    {c.bridge === 'orbit' || c.bridge === 'none' ? 'a parent testnet' : 'its L1'}, or from the network's own
                    documentation. A guessed URL is worse than no link.
                  </p>
                </div>
              )}
              {c.faucets.some((f) => f.note) && (
                <div className="space-y-1 pt-0.5">
                  {c.faucets
                    .filter((f) => f.note)
                    .map((f) => (
                      <p key={f.url + 'note'} className="text-[10px] leading-relaxed text-t3">
                        <span className="text-t2">{f.label}:</span> {f.note}
                      </p>
                    ))}
                </div>
              )}
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[11px] text-t3">
              <span>
                RPC <span className="mono text-t2">{new URL(c.viem.rpcUrls.default.http[0]).host}</span>
              </span>
              <a href={c.viem.blockExplorers?.default?.url} target="_blank" rel="noreferrer" className="transition-colors hover:text-accent">
                Explorer ↗
              </a>
            </div>
          </Card>
        ))}
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
              <div className="label mb-1">Dispenses</div>
              <div className="flex flex-wrap gap-1.5">
                {(detail.faucet.tokens ?? []).map((t) => (
                  <span key={t} className="chip">
                    <TokenIcon symbol={t} size={14} /> {t}
                  </span>
                ))}
                {!detail.faucet.tokens?.length && <span className="text-[12px] text-t3">Not verified</span>}
              </div>
            </div>
            <div>
              <div className="label mb-1">Verified requirements</div>
              {detail.faucet.note ? (
                <p className="text-[12px] leading-5 text-t1">{detail.faucet.note}</p>
              ) : (
                <p className="text-[12px] leading-5 text-[#e3c07b]">Requirements not verified for this provider.</p>
              )}
              {detail.faucet.access && (
                <p className="mt-1.5 text-[11px] leading-5 text-t3">
                  Access: {ACCESS_LABEL[detail.faucet.access] ?? detail.faucet.access}. Cooldown:{' '}
                  {detail.faucet.cooldown ?? 'not published'}.
                </p>
              )}
            </div>
            <div className="mono break-all rounded-lg border border-line bg-ink-850 px-3 py-2 text-[11px] text-t2">
              {detail.faucet.url}
            </div>
            <div className="flex items-center justify-between text-[11px] text-t3">
              <span>Link checked {detail.faucet.checked ?? 'not recorded'}</span>
              <a href={detail.faucet.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                Open faucet <ArrowUpRight size={11} className="inline" />
              </a>
            </div>
          </div>
        )}
      </Modal>

      <Card className="p-4">
        <h3 className="mb-2 text-sm font-semibold text-white">Not listed on purpose</h3>
        <p className="text-[11px] leading-relaxed text-t2">
          Plume Testnet and Cronos Testnet are CCTP chains but their public RPCs did not respond during verification on 2026-11-23, so
          they are excluded from the registry rather than shown with broken faucets. Song (Sonic) testnet ids differ between the
          provider's docs and viem's chain definition, excluded until that is resolved.
        </p>
      </Card>
    </div>
  )
}
