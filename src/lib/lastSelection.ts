/**
 * Remembers the last bridge / swap selection for the lifetime of the tab.
 *
 * Deliberately a module-level object, not localStorage: navigating to Portfolio and back keeps
 * the pair, but a full page reload (or a new tab) starts from the defaults again, which is what
 * we want after a deploy or when the user explicitly reloads.
 */
export interface BridgeSelection {
  fromId: number
  toId: number
  sourceId: string
  destId: string
}

export interface SwapSelection {
  chainId: number
  inSymbol: string
  outSymbol: string
}

const mem: { bridge?: BridgeSelection; swap?: SwapSelection } = {}

export const lastSelection = {
  bridge: (): BridgeSelection | undefined => mem.bridge,
  setBridge: (v: BridgeSelection) => {
    mem.bridge = v
  },
  swap: (): SwapSelection | undefined => mem.swap,
  setSwap: (v: SwapSelection) => {
    mem.swap = v
  },
}
