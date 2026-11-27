/**
 * Transaction preparation shared by every write path.
 *
 * Some chains reject transactions that rely on a wallet's own gas estimate:
 * Arc's mempool enforces a 20 gwei maxFeePerGas floor, and some wallets submit
 * "Transaction failed" when their internal RPC is misconfigured for a chain we
 * added programmatically. Estimating gas ourselves and setting an explicit fee
 * where the chain demands one removes both failure modes.
 */
import type { PublicClient } from 'viem'
import type { Address, ChainCfg } from '../config/chains'
import { nativeSymbol } from '../config/chains'

export interface PreparedTx {
  to: Address
  data: `0x${string}`
  value?: bigint
  gas: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
}

export async function prepareTx(
  client: PublicClient,
  chain: ChainCfg,
  req: { to: Address; data: `0x${string}`; value?: bigint; account: Address },
): Promise<PreparedTx> {
  const gas = await client.estimateGas({
    account: req.account,
    to: req.to,
    data: req.data,
    value: req.value,
  })

  const prepared: PreparedTx = {
    to: req.to,
    data: req.data,
    value: req.value,
    gas: (gas * 125n) / 100n,
  }

  if (chain.minGasPriceGwei) {
    const floor = BigInt(Math.ceil(chain.minGasPriceGwei * 1.25)) * 10n ** 9n
    const gasPrice = await client.getGasPrice().catch(() => floor)
    const block = await client.getBlock().catch(() => null)
    const baseFee = (block?.baseFeePerGas ?? gasPrice) as bigint
    const tip = gasPrice > baseFee ? gasPrice - baseFee : 1n * 10n ** 9n
    prepared.maxPriorityFeePerGas = tip < 10n ** 9n ? 10n ** 9n : tip
    const candidate = gasPrice + (gasPrice * 20n) / 100n
    // A node that reports an absurd gasPrice must not turn into an absurd fee cap.
    const ceiling = 500n * 10n ** 9n
    const capped = candidate > ceiling ? ceiling : candidate
    prepared.maxFeePerGas = capped > floor ? capped : floor
  }

  return prepared
}

export interface GasReadiness {
  ok: boolean
  balance: bigint
  needed: bigint
  symbol: string
}

/** True when the account can plausibly pay for one transaction on this chain. */
export async function checkGas(client: PublicClient, chain: ChainCfg, account: Address): Promise<GasReadiness> {
  const [balance, gasPrice] = await Promise.all([
    client.getBalance({ address: account }),
    client.getGasPrice().catch(() => 0n),
  ])
  const floor = chain.minGasPriceGwei ? BigInt(Math.ceil(chain.minGasPriceGwei * 1.25)) * 10n ** 9n : gasPrice
  const price = floor > gasPrice ? floor : gasPrice
  const needed = 200_000n * price
  return { ok: balance >= needed, balance, needed, symbol: nativeSymbol(chain.id) }
}


export interface TxSenderLike {
  sendTransaction: (tx: PreparedTx) => Promise<`0x${string}`>
}

/** Adapts a wagmi/viem wallet client to the TxSender interface without `as never` casts. */
export function walletSender(wallet: unknown): TxSenderLike {
  const w = wallet as { sendTransaction: (t: unknown) => Promise<`0x${string}`> }
  return { sendTransaction: (tx) => w.sendTransaction(tx) }
}
