/**
 * Swap execution — Uniswap v3 SwapRouter02.
 * Calldata is encoded explicitly and sent with eth_sendTransaction from the user's wallet,
 * so the exact bytes that get signed are the bytes this file builds (and the simulation
 * script exercises). Native ETH is wrapped/unwrapped through the router.
 */
import { encodeFunctionData } from 'viem'
import type { PublicClient } from 'viem'
import type { Address, ChainCfg } from '../config/chains'
import { WETH } from '../config/tokens'
import { ADDRESS_THIS, erc20Abi, swapRouterV1Abi, swapRouter02Abi } from './uniswap'
import { assertSwapRoute } from './guard'
import { prepareTx, type PreparedTx } from './tx'

export interface SwapLeg {
  /** null = the chain's native gas token */
  address: Address | null
  symbol: string
  decimals: number
}

export interface TxSender {
  sendTransaction: (tx: PreparedTx) => Promise<`0x${string}`>
}

export interface TxReader {
  readContract: (args: {
    address: Address
    abi: typeof erc20Abi
    functionName: 'allowance'
    args: readonly [Address, Address]
  }) => Promise<unknown>
  waitForTransactionReceipt: (a: { hash: `0x${string}` }) => Promise<{ status: string }>
}

export interface SwapExecutionParams {
  chain: ChainCfg
  account: Address
  tokenIn: SwapLeg
  tokenOut: SwapLeg
  amountIn: bigint
  amountOutMinimum: bigint
  fee: number
  wallet: TxSender
  publicClient: PublicClient
  onStep?: (step: 'approve' | 'swap', state: 'active' | 'done' | 'failed', hash?: string) => void
}

export interface SwapExecutionResult {
  swapHash: `0x${string}`
  approveHash?: `0x${string}`
}

/** Builds the exact calldata for a swap without sending anything (used by tests). */
export function buildSwapCalldata(params: {
  chain: ChainCfg
  account: Address
  tokenIn: SwapLeg
  tokenOut: SwapLeg
  amountIn: bigint
  amountOutMinimum: bigint
  fee: number
}): { to: Address; data: `0x${string}`; value: bigint } {
  const chain = assertSwapRoute(params.chain.id)
  const router = chain.uniswap!.router02
  const nativeIn = params.tokenIn.address === null
  const nativeOut = params.tokenOut.address === null
  const weth = WETH[chain.id]
  if ((nativeIn || nativeOut) && !weth) throw new Error(`${chain.name} has no wrapped-native token, so native swaps are not possible there.`)

  const wrappedIn = (params.tokenIn.address ?? weth) as Address
  const wrappedOut = (params.tokenOut.address ?? weth) as Address

  const recipient = nativeOut ? ADDRESS_THIS : params.account
  const isV1 = chain.uniswap!.kind === 'v1'
  if (isV1 && (nativeIn || nativeOut)) {
    throw new Error(`${chain.name} swap router has no native-token path. Use the ERC-20 USDC interface there.`)
  }

  const swapCall = isV1
    ? encodeFunctionData({
        abi: swapRouterV1Abi,
        functionName: 'exactInputSingle',
        args: [
          {
            tokenIn: wrappedIn,
            tokenOut: wrappedOut,
            fee: params.fee,
            recipient,
            deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
            amountIn: params.amountIn,
            amountOutMinimum: params.amountOutMinimum,
            sqrtPriceLimitX96: 0n,
          },
        ],
      })
    : encodeFunctionData({
        abi: swapRouter02Abi,
        functionName: 'exactInputSingle',
        args: [
          {
            tokenIn: wrappedIn,
            tokenOut: wrappedOut,
            fee: params.fee,
            recipient,
            amountIn: params.amountIn,
            amountOutMinimum: params.amountOutMinimum,
            sqrtPriceLimitX96: 0n,
          },
        ],
      })

  if (isV1) return { to: router, data: swapCall, value: 0n }

  const calls: `0x${string}`[] = []
  calls.push(swapCall)
  if (nativeOut)
    calls.push(
      encodeFunctionData({
        abi: swapRouter02Abi,
        functionName: 'unwrapWETH9',
        args: [params.amountOutMinimum, params.account],
      }),
    )

  // Native input: SwapRouter02.pay() wraps msg.value itself when tokenIn is WETH9, so the
  // swap must be sent directly with `value` — wrapping first inside multicall breaks it
  // (multicall delegatecalls, so msg.sender stays the user and the wrapped WETH is unreachable).
  if (!nativeOut) return { to: router, data: swapCall, value: nativeIn ? params.amountIn : 0n }
  return {
    to: router,
    data: encodeFunctionData({ abi: swapRouter02Abi, functionName: 'multicall', args: [calls] }),
    value: nativeIn ? params.amountIn : 0n,
  }
}

export function buildApproveCalldata(spender: Address, amount: bigint) {
  return encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [spender, amount] })
}

export async function executeSwap(p: SwapExecutionParams): Promise<SwapExecutionResult> {
  const chain = assertSwapRoute(p.chain.id)
  const router = chain.uniswap!.router02
  const nativeIn = p.tokenIn.address === null
  let approveHash: `0x${string}` | undefined

  if (!nativeIn) {
    const token = p.tokenIn.address as Address
    const allowance = (await p.publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [p.account, router],
    })) as bigint

    if (allowance < p.amountIn) {
      p.onStep?.('approve', 'active')
      try {
        const approveTx = await prepareTx(p.publicClient, chain, {
          to: token,
          data: buildApproveCalldata(router, p.amountIn), // exact amount, never unlimited
          account: p.account,
        })
        approveHash = await p.wallet.sendTransaction(approveTx)
        const rc = await p.publicClient.waitForTransactionReceipt({ hash: approveHash })
        if (rc.status !== 'success') throw new Error('Approval transaction reverted.')
        p.onStep?.('approve', 'done', approveHash)
      } catch (e) {
        p.onStep?.('approve', 'failed')
        throw e
      }
    } else {
      p.onStep?.('approve', 'done')
    }
  } else {
    p.onStep?.('approve', 'done')
  }

  const tx = buildSwapCalldata({
    chain,
    account: p.account,
    tokenIn: p.tokenIn,
    tokenOut: p.tokenOut,
    amountIn: p.amountIn,
    amountOutMinimum: p.amountOutMinimum,
    fee: p.fee,
  })

  p.onStep?.('swap', 'active')
  let swapHash: `0x${string}`
  try {
    const prepared = await prepareTx(p.publicClient, chain, { ...tx, account: p.account })
    swapHash = await p.wallet.sendTransaction(prepared)
  } catch (e) {
    p.onStep?.('swap', 'failed')
    throw e
  }
  const rc = await p.publicClient.waitForTransactionReceipt({ hash: swapHash })
  if (rc.status !== 'success') {
    p.onStep?.('swap', 'failed', swapHash)
    throw new Error('Swap transaction reverted on-chain.')
  }
  p.onStep?.('swap', 'done', swapHash)
  return { swapHash, approveHash }
}
