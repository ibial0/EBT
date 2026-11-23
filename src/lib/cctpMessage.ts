/**
 * CCTP v2 message decoder.
 *
 * Header (bytes):
 *   0    version (u32)        4    sourceDomain (u32)
 *   8    destinationDomain    12   nonce (bytes32)
 *   44   sender                76   recipient
 *   108  destinationCaller     140  minFinalityThreshold (u32)
 *   144  finalityThresholdExecuted (u32)
 * Burn body starts at 148:
 *   148  version   152 burnToken   184 mintRecipient
 *   216  amount    248 messageSender   280 maxFee
 *   312  feeExecuted   344 expirationBlock   376 hookData…
 */
export interface DecodedCctpMessage {
  version: number
  sourceDomain: number
  destinationDomain: number
  nonce: `0x${string}`
  sender: `0x${string}`
  recipient: `0x${string}`
  minFinalityThreshold: number
  finalityThresholdExecuted: number
  burnToken: `0x${string}`
  mintRecipient: `0x${string}`
  amount: bigint
  maxFee: bigint
  feeExecuted: bigint
  expirationBlock: bigint
  hookData: `0x${string}`
}

const hex = (s: string) => (s.startsWith('0x') ? s.slice(2) : s)
const bytes = (h: string, start: number, end: number) => h.slice(start * 2, end * 2)
const u32 = (h: string, start: number) => Number(BigInt('0x' + (bytes(h, start, start + 4) || '0')))
const word = (h: string, start: number) => BigInt('0x' + (bytes(h, start, start + 32) || '0')) as bigint
const asAddr = (h: string, start: number) => ('0x' + bytes(h, start + 12, start + 32)) as `0x${string}`

export function decodeCctpMessage(message: string): DecodedCctpMessage | null {
  const h = hex(message)
  if (h.length < 376 * 2) return null
  return {
    version: u32(h, 0),
    sourceDomain: u32(h, 4),
    destinationDomain: u32(h, 8),
    nonce: ('0x' + bytes(h, 12, 44)) as `0x${string}`,
    sender: asAddr(h, 44),
    recipient: asAddr(h, 76),
    minFinalityThreshold: u32(h, 140),
    finalityThresholdExecuted: u32(h, 144),
    burnToken: asAddr(h, 152),
    mintRecipient: asAddr(h, 184),
    amount: word(h, 216),
    maxFee: word(h, 280),
    feeExecuted: word(h, 312),
    expirationBlock: word(h, 344),
    hookData: ('0x' + bytes(h, 376, h.length / 2)) as `0x${string}`,
  }
}

export const usd6 = (v: bigint) => (Number(v) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 6 })
