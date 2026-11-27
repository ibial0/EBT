import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, LifeBuoy, Search } from 'lucide-react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { getPublicClient, getWalletClient } from 'wagmi/actions'
import type { Address } from 'viem'
import { CCTP_CHAINS, CHAINS, explorerAddress, explorerTx, getChain } from '../config/chains'
import { Badge, Button, Card, ChainLogo, Row, Spinner, notify } from '../components/ui'
import { ChainChip, ChainSelect } from '../components/ChainSelect'
import { PageHeader } from '../components/Layout'
import { Timeline } from '../components/Timeline'
import { fetchAttestation } from '../lib/cctp'
import { decodeCctpMessage, usd6 } from '../lib/cctpMessage'
import { isMessageUsed, submitReceiveMessage } from '../lib/bridgeExec'
import { decodeTxError } from '../lib/errors'
import { addActivity, finalizeFromSteps, getActivity, updateStep } from '../lib/activity'
import { formatUnits } from 'viem'
import { wagmiConfig, ensureWalletChain } from '../lib/wallet'
import { walletSender } from '../lib/tx'

export default function Recover() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()

  const [srcId, setSrcId] = useState(84532)
  const [hash, setHash] = useState('')
  const [pick, setPick] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [state, setState] = useState<
    | { kind: 'idle' }
    | { kind: 'pending'; detail: string }
    | { kind: 'error'; detail: string }
    | {
        kind: 'ready'
        message: `0x${string}`
        attestation: `0x${string}`
        amount: bigint
        destChainId: number
        recipient: Address
        used: boolean
        feeExecuted: bigint
      }
  >({ kind: 'idle' })
  const [activityId, setActivityId] = useState<string | undefined>()

  const src = getChain(srcId)!
  const activity = activityId ? getActivity(activityId) : undefined

  async function lookup() {
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash.trim())) return notify('Paste a 32-byte transaction hash.', 'error')
    if (src.cctpDomain == null) return notify(`${src.short} is not a CCTP chain.`, 'error')
    setBusy('lookup')
    setState({ kind: 'idle' })
    try {
      const att = await fetchAttestation(src.cctpDomain, hash.trim())
      if (att.state === 'pending') return setState({ kind: 'pending', detail: att.detail })
      if (att.state === 'error') return setState({ kind: 'error', detail: att.detail })

      const decoded = decodeCctpMessage(att.message)
      if (!decoded) return setState({ kind: 'error', detail: 'Circle returned a message this build cannot decode.' })
      const dest = CHAINS.find((c) => c.cctpDomain === decoded.destinationDomain)
      if (!dest) return setState({ kind: 'error', detail: `Destination domain ${decoded.destinationDomain} is not on the allowlist.` })

      const destClient = getPublicClient(wagmiConfig, { chainId: dest.id as never })!
      const used = await isMessageUsed(destClient, att.message)

      setState({
        kind: 'ready',
        message: att.message,
        attestation: att.attestation,
        amount: decoded.amount,
        destChainId: dest.id,
        recipient: decoded.mintRecipient,
        used,
        feeExecuted: decoded.feeExecuted,
      })
    } catch (e) {
      setState({ kind: 'error', detail: decodeTxError(e, srcId).detail })
    } finally {
      setBusy(null)
    }
  }

  async function mint() {
    if (state.kind !== 'ready' || !address) return
    const dest = getChain(state.destChainId)!
    setBusy('mint')
    try {
      await ensureWalletChain(dest.id)
      const client = getPublicClient(wagmiConfig, { chainId: dest.id as never })!
      const wallet = await getWalletClient(wagmiConfig, { chainId: dest.id as never })

      const item = addActivity({
        kind: 'bridge',
        provider: 'cctp',
        fromChainId: srcId,
        toChainId: dest.id,
        owner: address,
        tokenIn: { symbol: 'USDC', decimals: 6 },
        tokenOut: { symbol: 'USDC', decimals: 6 },
        amountIn: formatUnits(state.amount, 6),
        status: 'pending',
        meta: { recovered: true, burnTx: hash.trim(), message: state.message, attestation: state.attestation },
        steps: [
          { key: 'burn', label: `Burn USDC on ${src.short}`, status: 'done', hash: hash.trim(), chainId: srcId },
          { key: 'attestation', label: 'Circle attestation', status: 'done' },
          { key: 'receive', label: `Mint on ${dest.short}`, status: 'active', chainId: dest.id },
        ],
      })
      setActivityId(item.id)

      const tx = await submitReceiveMessage({
        chain: dest,
        account: address as Address,
        message: state.message,
        attestation: state.attestation,
        wallet: walletSender(wallet),
        client,
      })
      updateStep(item.id, 'receive', { status: 'done', hash: tx })
      finalizeFromSteps(item.id)
      setState({ ...state, used: true })
      notify(`Recovered: ${usd6(state.amount)} USDC minted on ${dest.short}.`, 'success')
    } catch (e) {
      const d = decodeTxError(e, state.destChainId)
      if (activityId) {
        updateStep(activityId, 'receive', { status: 'failed', note: `${d.title}, ${d.detail}` })
        finalizeFromSteps(activityId)
      }
      notify(`${d.title}: ${d.detail}`, 'error')
    } finally {
      setBusy(null)
    }
  }

  const dest = state.kind === 'ready' ? getChain(state.destChainId) : null

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Recovery"
        title="Recover a transfer"
        subtitle="If a bridge stopped after the burn, the USDC is not lost, Circle's message stays valid. Paste the burn transaction hash and this page finishes the mint without burning anything again."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-4">
          <div className="panel p-3">
            <div className="mb-1 label">Burn happened on</div>
            <ChainChip chainId={srcId} onClick={() => setPick(true)} label="source" />
          </div>

          <div className="panel mt-3 p-3">
            <div className="mb-1 label">Burn transaction hash</div>
            <input
              value={hash}
              onChange={(e) => setHash(e.target.value.trim())}
              placeholder="0x…"
              className="input mono text-xs"
            />
          </div>

          <div className="mt-3 flex gap-2">
            <Button full loading={busy === 'lookup'} onClick={lookup}>
              <Search size={15} /> Look up message
            </Button>
          </div>

          {state.kind === 'pending' && (
            <div className="mt-3 rounded-[10px] border border-warn/25 bg-warn/8 p-3 text-[11px] leading-relaxed text-warn">
              <div className="mb-1 flex items-center gap-1.5 font-semibold">
                <Spinner size={12} /> Circle has not attested this burn yet
              </div>
              {state.detail}
            </div>
          )}

          {state.kind === 'error' && (
            <div className="mt-3 rounded-[10px] border border-neg/30 bg-neg/8 p-3 text-[11px] leading-relaxed text-neg">
              <div className="mb-1 flex items-center gap-1.5 font-semibold">
                <AlertTriangle size={12} /> {state.detail}
              </div>
              Check that the hash belongs to a CCTP burn on {src.short} and that the app's selected source chain matches.
            </div>
          )}

          {state.kind === 'ready' && dest && (
            <div className="mt-4 border-t border-line pt-3">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-accent" />
                <span className="text-sm font-semibold text-t1">Attestation is ready</span>
                <Badge tone={state.used ? 'mint' : 'amber'}>{state.used ? 'already minted' : 'not minted yet'}</Badge>
              </div>
              <Row label="Amount" value={`${usd6(state.amount)} USDC`} />
              <Row label="Destination" value={`${dest.name}`} />
              <Row label="Mint recipient" value={<span className="mono text-[11px]">{state.recipient}</span>} />
              <Row label="Fee executed" value={`${usd6(state.feeExecuted)} USDC`} />

              {state.used ? (
                <div className="mt-3 rounded-[10px] border border-accent/30 bg-accent/8 p-3 text-[11px] text-t1">
                  This message is already delivered. Nothing to recover -{' '}
                  <a className="underline" href={explorerAddress(dest.id, state.recipient)} target="_blank" rel="noopener noreferrer">
                    check the balance on {dest.short}
                  </a>
                  .
                </div>
              ) : (
                <Button full className="mt-3" loading={busy === 'mint'} disabled={!isConnected} onClick={mint}>
                  {isConnected ? (
                    <>
                      Mint {usd6(state.amount)} USDC on {dest.short} <ArrowRight size={14} />
                    </>
                  ) : (
                    'Connect a wallet to sign the mint'
                  )}
                </Button>
              )}
            </div>
          )}
        </Card>

        <div className="space-y-3">
          {activity && (
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-t1">Recovery progress</h3>
                <Badge tone={activity.status === 'complete' ? 'mint' : activity.status === 'failed' ? 'red' : 'amber'}>{activity.status}</Badge>
              </div>
              <Timeline steps={activity.steps} />
              <Link to={`/activity/${activity.id}`} className="mt-2 block text-center text-[11px] text-t2 hover:text-accent">
                open record →
              </Link>
            </Card>
          )}

          <Card className="p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-t1">
              <LifeBuoy size={14} className="text-accent" /> How recovery works
            </h3>
            <ol className="list-decimal space-y-1.5 pl-4 text-[11px] leading-relaxed text-t2">
              <li>The burn already moved your USDC out of your wallet, it is held by Circle's protocol, not lost.</li>
              <li>Circle signs an attestation for that message; it never expires on testnet.</li>
              <li>Minting is a second transaction you sign on the destination chain. It costs only destination gas.</li>
              <li>This page checks <span className="mono">usedNonces</span> first, so it can never mint twice.</li>
            </ol>
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold text-t1">Common reasons a mint fails</h3>
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-t2">
              <li>· No gas token on the destination (Arc needs USDC for gas, it is the native token there).</li>
              <li>· Wallet submitted a fee below the chain floor (Arc requires ≥20 gwei). The app now sets it explicitly.</li>
              <li>· The message was already delivered, harmless, the balance is already there.</li>
            </ul>
          </Card>
        </div>
      </div>

      <ChainSelect open={pick} onClose={() => setPick(false)} chains={CCTP_CHAINS} value={srcId} onSelect={setSrcId} title="Where was the burn?" />
      {hash && (
        <p className="text-[10px] text-t3">
          Looking for the hash? Activity → open the transfer → Transactions. Or copy it from{' '}
          {explorerTx(srcId, hash).replace(/\/tx\/.*/, '')}.
        </p>
      )}
    </div>
  )
}
