/**
 * Error decoding, turns raw wallet/RPC failures into something a human can act on.
 * The point: never show a bare "Transaction failed" when the cause is knowable.
 */
import { BaseError, UserRejectedRequestError } from 'viem'
import { getChain, nativeSymbol } from '../config/chains'

export class AlreadyMintedError extends Error {
  constructor() {
    super('This CCTP message was already used, the USDC has been minted. Check your balance on the destination.')
    this.name = 'AlreadyMintedError'
  }
}

export class NoGasError extends Error {
  constructor(chainId: number) {
    super(`No ${nativeSymbol(chainId)} on ${getChain(chainId)?.short ?? chainId} to pay for gas. Top up from the Faucets page first.`)
    this.name = 'NoGasError'
  }
}

export interface DecodedError {
  title: string
  detail: string
  hint?: string
  raw: string
  kind: 'rejected' | 'gas' | 'revert' | 'rpc' | 'wallet' | 'unknown'
}

export function decodeTxError(e: unknown, chainId?: number): DecodedError {
  const raw = e instanceof BaseError ? e.shortMessage || e.message : (e as Error)?.message ?? String(e)
  const full = e instanceof BaseError ? e.message : raw
  const lower = `${raw} ${full}`.toLowerCase()

  if (e instanceof UserRejectedRequestError || /user rejected|user denied|rejected the request/.test(lower)) {
    return { title: 'Signature rejected', detail: 'You cancelled the request in your wallet.', raw, kind: 'rejected' }
  }
  if (/does not match the connection'?s chain|current chain of the connector/.test(lower)) {
    return {
      title: 'Wrong network',
      detail: chainId
        ? `Your wallet is on a different network than ${getChain(chainId)?.name ?? 'this chain'}.`
        : 'Your wallet is on a different network than this app expects.',
      hint: 'Switch the network inside your wallet, then retry — this app only runs on testnets.',
      raw,
      kind: 'wallet',
    }
  }
  if (/insufficient funds|exceeds the balance|not enough funds|insufficient balance for gas/.test(lower)) {
    return {
      title: 'Not enough gas',
      detail: chainId
        ? `Your wallet has no ${nativeSymbol(chainId)} on ${getChain(chainId)?.short ?? chainId} for this transaction.`
        : 'Your wallet has no native gas token for this transaction.',
      hint: 'Gas is separate from the amount you are moving. Get testnet gas from the Faucets page.',
      raw,
      kind: 'gas',
    }
  }
  if (/nonce already used|already been used|message already received|nonceused/.test(lower)) {
    return {
      title: 'Already minted',
      detail: 'Circle already delivered this message, the USDC is on the destination.',
      hint: 'Refresh the balance; nothing else is needed.',
      raw,
      kind: 'revert',
    }
  }
  if (/invalid attestation length|invalid attestation|invalid message|invalid destination|invalid sender/.test(lower)) {
    return {
      title: 'Attestation rejected',
      detail: 'The attestation does not match the burn message.',
      hint: 'Use “Re-check attestation” to fetch it again from Circle.',
      raw,
      kind: 'revert',
    }
  }
  if (/max fee per gas less than block base fee|maxfeepergas|fee too low|underpriced/.test(lower)) {
    return {
      title: 'Gas price too low for this chain',
      detail: 'The network rejected the fee. Arc requires at least 20 gwei.',
      hint: 'Retry, the app now sets the fee explicitly for chains with a floor.',
      raw,
      kind: 'gas',
    }
  }
  if (/transaction failed/.test(lower)) {
    return {
      title: 'Wallet could not submit the transaction',
      detail:
        'The wallet returned a generic failure before the transaction reached the chain. Usually a stale gas estimate or an RPC mismatch inside the wallet.',
      hint: 'Retry. The app now estimates gas itself and sets the fee for chains with a minimum.',
      raw,
      kind: 'wallet',
    }
  }
  if (/rpc request failed|http request failed|fetch failed|timeout|429|rate limit/.test(lower)) {
    return {
      title: 'RPC unavailable',
      detail: 'The public RPC for this chain did not answer.',
      hint: 'Try again in a moment, or switch chains and back.',
      raw,
      kind: 'rpc',
    }
  }
  return { title: 'Transaction failed', detail: raw.slice(0, 240), raw, kind: 'unknown' }
}

/**
 * nonce occupies bytes 12..44 of a CCTP message
 * (after version u32 + sourceDomain u32 + destinationDomain u32).
 * Getting this offset wrong makes every message look "unused".
 */
export function messageNonce(message: `0x${string}`): `0x${string}` {
  return `0x${message.slice(2 + 12 * 2, 2 + 44 * 2)}`
}
