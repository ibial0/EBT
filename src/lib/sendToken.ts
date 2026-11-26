/**
 * Sending a token from the app itself.
 *
 * The signed bytes are exactly the amount the user typed — native value or an ERC-20
 * `transfer` — and the wallet is put on the token's chain first, so the chain-mismatch
 * failure can never reach the signing prompt. Nothing is estimated or fabricated: if the
 * wallet refuses, the caller gets the wallet's own error.
 */
import { encodeFunctionData, type Address } from 'viem'
import { getWalletClient } from 'wagmi/actions'
import { ensureWalletChain, wagmiConfig } from './wallet'

/** The shared ERC-20 ABI is read-only, so the transfer entry is declared here. */
const erc20TransferAbi = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const

export interface SendTokenParams {
  chainId: number
  token: { address: string | null; decimals: number; symbol: string }
  to: Address
  amount: bigint
}

export async function sendToken(params: SendTokenParams): Promise<`0x${string}`> {
  const { chainId, token, to, amount } = params
  if (amount <= 0n) throw new Error('Enter an amount greater than zero.')

  await ensureWalletChain(chainId)
  const wallet = await getWalletClient(wagmiConfig, { chainId: chainId as never })
  if (!wallet?.account) throw new Error('Connect a wallet first.')
  const account = wallet.account

  if (!token.address) {
    // Native gas token
    return wallet.sendTransaction({ to, value: amount, account, chain: null })
  }

  const data = encodeFunctionData({
    abi: erc20TransferAbi,
    functionName: 'transfer',
    args: [to, amount],
  })
  return wallet.sendTransaction({ to: token.address as Address, data, account, chain: null })
}

/** True when the string looks like a real 20-byte EVM address. */
export function isEvmAddress(value: string): value is Address {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim())
}
