/**
 * Receiver-address rules per wallet family.
 *
 * The app validates the destination against the family that will actually be used: a Solana
 * field must not say "not a valid EVM address", and a pasted EVM address must be rejected on
 * Sui instead of silently passing. Kept dependency-free so scripts can test it in Node.
 */

export type AddressFamily = 'evm' | 'solana' | 'sui' | 'aptos' | 'starknet' | 'stellar'

const FAMILY_LABEL: Record<string, string> = {
  evm: 'EVM',
  solana: 'Solana',
  sui: 'Sui',
  aptos: 'Aptos',
  starknet: 'Starknet',
  stellar: 'Stellar',
}

/** True when the string looks like a real 20-byte EVM address. */
export function isEvmAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim())
}

export function validateReceiver(value: string, family: string | undefined): { ok: boolean; message: string } {
  const v = value.trim()
  const ok = (() => {
    switch (family) {
      case 'evm':
        return /^0x[0-9a-fA-F]{40}$/.test(v)
      case 'solana':
        // ed25519 public keys in base58, no 0/O/I/l
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v)
      case 'sui':
        // 32-byte address written as 64 hex characters
        return /^0x[0-9a-fA-F]{64}$/.test(v)
      case 'aptos':
      case 'starknet':
        // felts may be written short; 1-64 hex characters after 0x
        return /^0x[0-9a-fA-F]{1,64}$/.test(v)
      case 'stellar':
        return /^G[A-Z2-7]{55}$/.test(v)
      default:
        return false
    }
  })()
  const label = FAMILY_LABEL[family ?? ''] ?? 'EVM'
  return { ok, message: `That is not a valid ${label} address.` }
}

/** Sending is implemented for EVM accounts only; other families are receive-only for now. */
export function canSendFrom(family: string | undefined): boolean {
  return family === 'evm'
}
