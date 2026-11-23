import { useState } from 'react'
import { ArrowUpRight, Droplets, Info, Search } from 'lucide-react'
import { CHAINS, type ChainCfg, type FaucetLink } from '../config/chains'
import { Badge, Button, Card, ChainLogo, CopyButton, Modal } from '../components/ui'
import { PageHeader } from '../components/Layout'

const ACCESS_LABEL: Record<string, string> = {
  free: 'No account',
  account: 'Account needed',
  pow: 'Proof of work',
  tasks: 'Tasks required',
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
                <button
                  key={f.url + f.label}
                  onClick={() => setDetail({ chain: c, faucet: f })}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-ink-850 px-2.5 py-2 text-left transition-colors hover:border-line-strong hover:bg-ink-700"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Droplets size={13} className="shrink-0 text-accent" />
                    <span className="truncate text-[13px] text-t1">{f.label}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {f.access && <span className="chip !text-[10px]">{ACCESS_LABEL[f.access] ?? f.access}</span>}
                    {f.cooldown && <span className="mono text-[10px] text-t3">{f.cooldown}</span>}
                    {f.tokens?.map((t) => (
                      <span key={t} className="chip !px-1.5 !py-0 !text-[9px]">
                        {t}
                      </span>
                    ))}
                    <ArrowUpRight size={12} className="text-t3" />
                  </span>
                </button>
              ))}
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
