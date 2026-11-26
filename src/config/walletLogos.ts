/**
 * Wallet brand marks.
 *
 * Every file in /public/logos/wallets was pulled from the wallet's own site
 * (apple-touch-icon / official icon) or its official GitHub avatar, and is served
 * locally so the picker never depends on a third-party host at runtime.
 *
 * The live extension icon always wins when it exists: it is the same mark the user
 * sees in their browser toolbar. These files are the fallback for wallets that are
 * not installed on this device. No monogram is invented when no real mark exists.
 */
export const WALLET_LOGO_FILES: Record<string, string> = {
  metamask: 'metamask.png',
  rabby: 'rabby.png',
  phantom: 'phantom.png',
  okx: 'okx.png',
  solflare: 'solflare.png',
  backpack: 'backpack.png',
  slush: 'slush.svg',
  suiet: 'suiet.png',
  petra: 'petra.png',
  pontem: 'pontem.png',
  argent: 'argent.png',
  braavos: 'braavos.png',
  keplr: 'keplr.png',
  leap: 'leap.png',
  freighter: 'freighter.png',
  xbull: 'xbull.png',
  pera: 'pera.png',
  lute: 'lute.png',
  meteor: 'meteor.png',
  near: 'near.png',
  talisman: 'talisman.png',
  subwallet: 'subwallet.png',
  polkadotjs: 'polkadotjs.png',
  crossmark: 'crossmark.png',
  gemwallet: 'gemwallet.png',
  coinbase: 'coinbase.png',
  trust: 'trust.png',
  algorand: 'algorand.png',
  nightly: 'nightly.png',
  brave: 'brave.png',
  rainbow: 'rainbow.png',
  zerion: 'zerion.png',
  enkrypt: 'enkrypt.png',
  frame: 'frame.png',
  coin98: 'coin98.png',
  glow: 'glow.png',
  walletconnect: 'walletconnect.png',
}

export function walletLogo(key: string): string | undefined {
  const file = WALLET_LOGO_FILES[key]
  return file ? `/logos/wallets/${file}` : undefined
}
