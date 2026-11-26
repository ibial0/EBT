import { useSyncExternalStore } from 'react'

export type NonEvmFamily =
  | 'solana'
  | 'sui'
  | 'aptos'
  | 'starknet'
  | 'cosmos'
  | 'stellar'
  | 'algorand'
  | 'near'
  | 'polkadot'
  | 'xrpl'

export type WalletFamily = 'evm' | NonEvmFamily

export type ConnectionMode = 'extension'

export interface NonEvmAccount {
  /** Unique entry id: `${family}:${providerId}:${address}` */
  id: string
  family: NonEvmFamily
  providerId: string
  providerName: string
  address: string
  iconSrc?: string
  mode: ConnectionMode
  connectedAt: number
}

export interface WalletFamilyDescriptor {
  family: NonEvmFamily
  label: string
  chainsLabel: string
  recommendedExtensions: Array<{ name: string; url: string }>
}

export interface NonEvmWalletProvider {
  id: string
  family: NonEvmFamily
  name: string
  chainsLabel: string
  installUrl: string
  iconSrc?: string
  detected: boolean
  connect: () => Promise<{ address: string; iconSrc?: string; providerName?: string }>
}

/* ─────────────────────────── Wallet Standard & AIP-62 discovery ─────────────────────────── */

interface StandardWallet {
  name: string
  icon?: string
  chains?: readonly string[]
  features: Record<string, unknown>
}

const standardWallets = new Map<string, StandardWallet>()
const aptosStandardWallets = new Map<string, StandardWallet>()
let discoveryInit = false

const win = (): Record<string, unknown> =>
  typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {}

function initWalletDiscovery() {
  if (discoveryInit || typeof window === 'undefined') return
  discoveryInit = true

  const registerStandard = (...wallets: StandardWallet[]) => {
    let changed = false
    for (const w of wallets) {
      if (!w || !w.name) continue
      const key = `${w.name}:${(w.chains ?? []).join(',')}`
      if (!standardWallets.has(key)) {
        standardWallets.set(key, w)
        changed = true
      }
    }
    if (changed) emit()
  }

  const registerAptos = (w: StandardWallet) => {
    if (!w || !w.name) return
    if (!aptosStandardWallets.has(w.name)) {
      aptosStandardWallets.set(w.name, w)
      emit()
    }
  }

  try {
    // @wallet-standard/app browser registration protocol (Solana, Sui, etc.)
    const nav = window.navigator as unknown as { wallets?: Array<{ register?: (...args: StandardWallet[]) => void }> }
    if (Array.isArray(nav.wallets)) {
      nav.wallets.push({ register: registerStandard })
    }
    window.addEventListener('wallet-standard:register-wallet', ((ev: CustomEvent) => {
      if (typeof ev.detail === 'function') {
        ev.detail({ register: registerStandard })
      }
    }) as EventListener)
    window.dispatchEvent(
      new CustomEvent('wallet-standard:app-ready', {
        detail: { register: registerStandard },
      }),
    )

    // Aptos AIP-62 wallet standard
    window.addEventListener('aptos:register-wallet', ((ev: CustomEvent) => {
      const w = ev.detail as StandardWallet | undefined
      if (w?.name) registerAptos(w)
    }) as EventListener)
    window.dispatchEvent(new CustomEvent('aptos:app-ready', { detail: registerAptos }))
  } catch {
    /* ignore sandbox / SSR issues */
  }
}

initWalletDiscovery()

function findStandardWallet(familyPrefix: 'solana:' | 'sui:' | 'aptos:', nameHints: string[]): StandardWallet | undefined {
  initWalletDiscovery()
  const pool = familyPrefix === 'aptos:'
    ? [...aptosStandardWallets.values(), ...standardWallets.values()]
    : [...standardWallets.values()]

  const matchingFamily = pool.filter(
    (w) =>
      (w.chains ?? []).some((c) => c.startsWith(familyPrefix)) ||
      (familyPrefix === 'aptos:' && Boolean(w.features['aptos:connect'])),
  )

  for (const hint of nameHints) {
    const low = hint.toLowerCase()
    const hit = matchingFamily.find((w) => w.name.toLowerCase().includes(low))
    if (hit) return hit
  }
  return undefined
}

async function connectViaStandard(w: StandardWallet): Promise<{ address: string; iconSrc?: string; providerName?: string }> {
  const stdConnect = w.features['standard:connect'] as
    | { connect: () => Promise<{ accounts?: ReadonlyArray<{ address: string }> }> }
    | undefined
  if (stdConnect?.connect) {
    const res = await stdConnect.connect()
    const addr = res?.accounts?.[0]?.address
    if (addr) return { address: addr, iconSrc: w.icon, providerName: w.name }
  }

  const aptConnect = w.features['aptos:connect'] as
    | { connect: () => Promise<{ status?: string; args?: { address?: string }; address?: string }> }
    | undefined
  if (aptConnect?.connect) {
    const res = await aptConnect.connect()
    const addr = res?.args?.address ?? res?.address
    if (addr) return { address: addr, iconSrc: w.icon, providerName: w.name }
  }

  throw new Error(`${w.name} did not return a connected account.`)
}

/* ─────────────────────────── Family descriptors ─────────────────────────── */

export const WALLET_FAMILIES: Record<NonEvmFamily, WalletFamilyDescriptor> = {
  solana: {
    family: 'solana',
    label: 'Solana',
    chainsLabel: 'Solana Devnet',
    recommendedExtensions: [
      { name: 'Phantom', url: 'https://phantom.app/' },
      { name: 'Solflare', url: 'https://solflare.com/' },
      { name: 'Backpack', url: 'https://backpack.app/' },
    ],
  },
  sui: {
    family: 'sui',
    label: 'Sui',
    chainsLabel: 'Sui Testnet',
    recommendedExtensions: [
      { name: 'Slush (Sui Wallet)', url: 'https://slush.app/' },
      { name: 'Suiet', url: 'https://suiet.app/' },
    ],
  },
  aptos: {
    family: 'aptos',
    label: 'Aptos',
    chainsLabel: 'Aptos Testnet',
    recommendedExtensions: [
      { name: 'Petra', url: 'https://petra.app/' },
      { name: 'Pontem', url: 'https://pontem.network/' },
    ],
  },
  starknet: {
    family: 'starknet',
    label: 'Starknet',
    chainsLabel: 'Starknet Sepolia',
    recommendedExtensions: [
      { name: 'Argent X', url: 'https://www.argent.xyz/argent-x/' },
      { name: 'Braavos', url: 'https://braavos.app/' },
    ],
  },
  cosmos: {
    family: 'cosmos',
    label: 'Cosmos (IBC / Noble)',
    chainsLabel: 'Noble Testnet',
    recommendedExtensions: [
      { name: 'Keplr', url: 'https://www.keplr.app/' },
      { name: 'Leap', url: 'https://www.leapwallet.io/' },
    ],
  },
  stellar: {
    family: 'stellar',
    label: 'Stellar',
    chainsLabel: 'Stellar Testnet',
    recommendedExtensions: [
      { name: 'Freighter', url: 'https://www.freighter.app/' },
      { name: 'xBull', url: 'https://xbull.app/' },
    ],
  },
  algorand: {
    family: 'algorand',
    label: 'Algorand',
    chainsLabel: 'Algorand Testnet',
    recommendedExtensions: [
      { name: 'Pera Wallet', url: 'https://perawallet.app/' },
      { name: 'Lute', url: 'https://lute.app/' },
    ],
  },
  near: {
    family: 'near',
    label: 'NEAR',
    chainsLabel: 'NEAR Testnet',
    recommendedExtensions: [
      { name: 'Meteor Wallet', url: 'https://meteorwallet.app/' },
      { name: 'Nightly', url: 'https://nightly.app/' },
    ],
  },
  polkadot: {
    family: 'polkadot',
    label: 'Polkadot',
    chainsLabel: 'Polkadot Westend',
    recommendedExtensions: [
      { name: 'Talisman', url: 'https://talisman.xyz/' },
      { name: 'SubWallet', url: 'https://subwallet.app/' },
      { name: 'Polkadot.js', url: 'https://polkadot.js.org/extension/' },
    ],
  },
  xrpl: {
    family: 'xrpl',
    label: 'XRP Ledger',
    chainsLabel: 'XRPL Testnet',
    recommendedExtensions: [
      { name: 'Crossmark', url: 'https://crossmark.io/' },
      { name: 'GemWallet', url: 'https://gemwallet.app/' },
    ],
  },
}

/* ─────────────────────────── Individual browser wallets ─────────────────────────── */

export function getNonEvmWalletProviders(): NonEvmWalletProvider[] {
  initWalletDiscovery()
  const w = win()
  const okx = w.okxwallet as Record<string, unknown> | undefined
  const ph = w.phantom as Record<string, unknown> | undefined
  const nightly = w.nightly as Record<string, unknown> | undefined

  const providers: NonEvmWalletProvider[] = []
  const seenStdKeys = new Set<string>()

  // ── Solana ──
  const stdPhantomSol = findStandardWallet('solana:', ['phantom'])
  const legacyPhantomSol = (ph?.solana ?? ((w.solana as { isPhantom?: boolean } | undefined)?.isPhantom ? w.solana : undefined)) as
    | { connect: () => Promise<{ publicKey?: { toString: () => string } }> }
    | undefined
  if (stdPhantomSol) seenStdKeys.add(`solana:${stdPhantomSol.name.toLowerCase()}`)
  providers.push({
    id: 'solana-phantom',
    family: 'solana',
    name: 'Phantom',
    chainsLabel: 'Solana Devnet',
    installUrl: 'https://phantom.app/download',
    iconSrc: stdPhantomSol?.icon,
    detected: Boolean(stdPhantomSol || legacyPhantomSol),
    connect: async () => {
      if (legacyPhantomSol?.connect) {
        const res = await legacyPhantomSol.connect()
        const addr = res?.publicKey?.toString()
        if (!addr) throw new Error('Phantom did not return a Solana address.')
        return { address: addr, iconSrc: stdPhantomSol?.icon, providerName: 'Phantom' }
      }
      if (stdPhantomSol) return connectViaStandard(stdPhantomSol)
      throw new Error('Phantom extension not detected.')
    },
  })

  const stdSolflare = findStandardWallet('solana:', ['solflare'])
  const legacySolflare = w.solflare as { connect?: () => Promise<boolean>; publicKey?: { toString: () => string } } | undefined
  if (stdSolflare) seenStdKeys.add(`solana:${stdSolflare.name.toLowerCase()}`)
  providers.push({
    id: 'solana-solflare',
    family: 'solana',
    name: 'Solflare',
    chainsLabel: 'Solana Devnet',
    installUrl: 'https://solflare.com/download',
    iconSrc: stdSolflare?.icon,
    detected: Boolean(stdSolflare || legacySolflare?.connect),
    connect: async () => {
      if (legacySolflare?.connect) {
        await legacySolflare.connect()
        const addr = legacySolflare.publicKey?.toString()
        if (!addr) throw new Error('Solflare did not return a Solana address.')
        return { address: addr, iconSrc: stdSolflare?.icon, providerName: 'Solflare' }
      }
      if (stdSolflare) return connectViaStandard(stdSolflare)
      throw new Error('Solflare extension not detected.')
    },
  })

  const stdBackpack = findStandardWallet('solana:', ['backpack'])
  const legacyBackpack = (w.backpack as { solana?: { connect: () => Promise<{ publicKey?: { toString: () => string } }> } } | undefined)?.solana
  if (stdBackpack) seenStdKeys.add(`solana:${stdBackpack.name.toLowerCase()}`)
  providers.push({
    id: 'solana-backpack',
    family: 'solana',
    name: 'Backpack',
    chainsLabel: 'Solana Devnet',
    installUrl: 'https://backpack.app/downloads',
    iconSrc: stdBackpack?.icon,
    detected: Boolean(stdBackpack || legacyBackpack),
    connect: async () => {
      if (stdBackpack) return connectViaStandard(stdBackpack)
      if (legacyBackpack?.connect) {
        const res = await legacyBackpack.connect()
        const addr = res?.publicKey?.toString()
        if (!addr) throw new Error('Backpack did not return a Solana address.')
        return { address: addr, providerName: 'Backpack' }
      }
      throw new Error('Backpack extension not detected.')
    },
  })

  const stdOkxSol = findStandardWallet('solana:', ['okx'])
  const legacyOkxSol = okx?.solana as { connect: () => Promise<{ publicKey?: { toString: () => string } }> } | undefined
  if (stdOkxSol) seenStdKeys.add(`solana:${stdOkxSol.name.toLowerCase()}`)
  providers.push({
    id: 'solana-okx',
    family: 'solana',
    name: 'OKX Wallet',
    chainsLabel: 'Solana Devnet',
    installUrl: 'https://www.okx.com/web3',
    iconSrc: stdOkxSol?.icon,
    detected: Boolean(stdOkxSol || legacyOkxSol),
    connect: async () => {
      if (legacyOkxSol?.connect) {
        const res = await legacyOkxSol.connect()
        const addr = res?.publicKey?.toString()
        if (!addr) throw new Error('OKX Wallet did not return a Solana address.')
        return { address: addr, iconSrc: stdOkxSol?.icon, providerName: 'OKX Wallet (Solana)' }
      }
      if (stdOkxSol) return connectViaStandard(stdOkxSol)
      throw new Error('OKX Wallet extension not detected.')
    },
  })

  // ── Sui (Wallet Standard: Slush / Sui Wallet, Suiet, OKX Sui, Nightly) ──
  const stdSlush = findStandardWallet('sui:', ['slush', 'sui wallet'])
  const legacySui = w.suiWallet as { requestPermissions?: () => Promise<unknown>; getAccounts?: () => Promise<string[]> } | undefined
  if (stdSlush) seenStdKeys.add(`sui:${stdSlush.name.toLowerCase()}`)
  providers.push({
    id: 'sui-slush',
    family: 'sui',
    name: stdSlush?.name ?? 'Slush (Sui Wallet)',
    chainsLabel: 'Sui Testnet',
    installUrl: 'https://slush.app/',
    iconSrc: stdSlush?.icon,
    detected: Boolean(stdSlush || legacySui),
    connect: async () => {
      if (stdSlush) return connectViaStandard(stdSlush)
      if (legacySui?.requestPermissions && legacySui?.getAccounts) {
        await legacySui.requestPermissions()
        const accts = await legacySui.getAccounts()
        if (accts?.[0]) return { address: accts[0], providerName: 'Sui Wallet' }
      }
      throw new Error('Sui Wallet / Slush extension not detected.')
    },
  })

  const stdSuiet = findStandardWallet('sui:', ['suiet'])
  const legacySuiet = w.suiet as { requestPermissions?: () => Promise<unknown>; getAccounts?: () => Promise<string[]> } | undefined
  if (stdSuiet) seenStdKeys.add(`sui:${stdSuiet.name.toLowerCase()}`)
  providers.push({
    id: 'sui-suiet',
    family: 'sui',
    name: 'Suiet',
    chainsLabel: 'Sui Testnet',
    installUrl: 'https://suiet.app/',
    iconSrc: stdSuiet?.icon,
    detected: Boolean(stdSuiet || legacySuiet),
    connect: async () => {
      if (stdSuiet) return connectViaStandard(stdSuiet)
      if (legacySuiet?.requestPermissions && legacySuiet?.getAccounts) {
        await legacySuiet.requestPermissions()
        const accts = await legacySuiet.getAccounts()
        if (accts?.[0]) return { address: accts[0], providerName: 'Suiet' }
      }
      throw new Error('Suiet extension not detected.')
    },
  })

  const stdOkxSui = findStandardWallet('sui:', ['okx'])
  if (stdOkxSui) seenStdKeys.add(`sui:${stdOkxSui.name.toLowerCase()}`)
  providers.push({
    id: 'sui-okx',
    family: 'sui',
    name: 'OKX Wallet',
    chainsLabel: 'Sui Testnet',
    installUrl: 'https://www.okx.com/web3',
    iconSrc: stdOkxSui?.icon,
    detected: Boolean(stdOkxSui || okx?.sui),
    connect: async () => {
      if (stdOkxSui) return connectViaStandard(stdOkxSui)
      const oSui = okx?.sui as { connect?: () => Promise<{ address?: string }>; getAccount?: () => Promise<{ address?: string }> } | undefined
      if (oSui?.connect) {
        const res = await oSui.connect()
        if (res?.address) return { address: res.address, providerName: 'OKX Wallet (Sui)' }
      }
      throw new Error('OKX Wallet (Sui) not detected.')
    },
  })

  const stdNightlySui = findStandardWallet('sui:', ['nightly'])
  if (stdNightlySui) seenStdKeys.add(`sui:${stdNightlySui.name.toLowerCase()}`)
  providers.push({
    id: 'sui-nightly',
    family: 'sui',
    name: 'Nightly',
    chainsLabel: 'Sui Testnet',
    installUrl: 'https://nightly.app/',
    iconSrc: stdNightlySui?.icon,
    detected: Boolean(stdNightlySui || nightly?.sui),
    connect: async () => {
      if (stdNightlySui) return connectViaStandard(stdNightlySui)
      throw new Error('Nightly extension not detected.')
    },
  })

  // ── Aptos (AIP-62 + window globals) ──
  const stdPetra = findStandardWallet('aptos:', ['petra'])
  const legacyPetra = w.aptos as { connect: () => Promise<{ address: string }> } | undefined
  if (stdPetra) seenStdKeys.add(`aptos:${stdPetra.name.toLowerCase()}`)
  providers.push({
    id: 'aptos-petra',
    family: 'aptos',
    name: 'Petra',
    chainsLabel: 'Aptos Testnet',
    installUrl: 'https://petra.app/',
    iconSrc: stdPetra?.icon,
    detected: Boolean(stdPetra || legacyPetra),
    connect: async () => {
      if (stdPetra) return connectViaStandard(stdPetra)
      if (legacyPetra?.connect) {
        const res = await legacyPetra.connect()
        if (res?.address) return { address: res.address, providerName: 'Petra' }
      }
      throw new Error('Petra extension not detected.')
    },
  })

  const stdPontem = findStandardWallet('aptos:', ['pontem'])
  const legacyPontem = w.pontem as { connect: () => Promise<{ address: string }> } | undefined
  if (stdPontem) seenStdKeys.add(`aptos:${stdPontem.name.toLowerCase()}`)
  providers.push({
    id: 'aptos-pontem',
    family: 'aptos',
    name: 'Pontem',
    chainsLabel: 'Aptos Testnet',
    installUrl: 'https://pontem.network/',
    iconSrc: stdPontem?.icon,
    detected: Boolean(stdPontem || legacyPontem),
    connect: async () => {
      if (stdPontem) return connectViaStandard(stdPontem)
      if (legacyPontem?.connect) {
        const res = await legacyPontem.connect()
        if (res?.address) return { address: res.address, providerName: 'Pontem' }
      }
      throw new Error('Pontem extension not detected.')
    },
  })

  const stdOkxAptos = findStandardWallet('aptos:', ['okx'])
  const legacyOkxAptos = okx?.aptos as { connect: () => Promise<{ address: string }> } | undefined
  if (stdOkxAptos) seenStdKeys.add(`aptos:${stdOkxAptos.name.toLowerCase()}`)
  providers.push({
    id: 'aptos-okx',
    family: 'aptos',
    name: 'OKX Wallet',
    chainsLabel: 'Aptos Testnet',
    installUrl: 'https://www.okx.com/web3',
    iconSrc: stdOkxAptos?.icon,
    detected: Boolean(stdOkxAptos || legacyOkxAptos),
    connect: async () => {
      if (stdOkxAptos) return connectViaStandard(stdOkxAptos)
      if (legacyOkxAptos?.connect) {
        const res = await legacyOkxAptos.connect()
        if (res?.address) return { address: res.address, providerName: 'OKX Wallet (Aptos)' }
      }
      throw new Error('OKX Wallet (Aptos) not detected.')
    },
  })

  // ── Starknet ──
  const snArgent = w.starknet_argentX as { enable: () => Promise<string[]>; selectedAddress?: string; icon?: string } | undefined
  providers.push({
    id: 'starknet-argentx',
    family: 'starknet',
    name: 'Argent X',
    chainsLabel: 'Starknet Sepolia',
    installUrl: 'https://www.argent.xyz/argent-x/',
    iconSrc: snArgent?.icon,
    detected: Boolean(snArgent),
    connect: async () => {
      if (!snArgent?.enable) throw new Error('Argent X extension not detected.')
      const accts = await snArgent.enable()
      const addr = accts?.[0] ?? snArgent.selectedAddress
      if (!addr) throw new Error('Argent X returned no address.')
      return { address: addr, iconSrc: snArgent.icon, providerName: 'Argent X' }
    },
  })

  const snBraavos = w.starknet_braavos as { enable: () => Promise<string[]>; selectedAddress?: string; icon?: string } | undefined
  providers.push({
    id: 'starknet-braavos',
    family: 'starknet',
    name: 'Braavos',
    chainsLabel: 'Starknet Sepolia',
    installUrl: 'https://braavos.app/',
    iconSrc: snBraavos?.icon,
    detected: Boolean(snBraavos),
    connect: async () => {
      if (!snBraavos?.enable) throw new Error('Braavos extension not detected.')
      const accts = await snBraavos.enable()
      const addr = accts?.[0] ?? snBraavos.selectedAddress
      if (!addr) throw new Error('Braavos returned no address.')
      return { address: addr, iconSrc: snBraavos.icon, providerName: 'Braavos' }
    },
  })

  const snOkx = w.starknet_okxwallet as { enable: () => Promise<string[]>; selectedAddress?: string; icon?: string } | undefined
  providers.push({
    id: 'starknet-okx',
    family: 'starknet',
    name: 'OKX Wallet',
    chainsLabel: 'Starknet Sepolia',
    installUrl: 'https://www.okx.com/web3',
    iconSrc: snOkx?.icon,
    detected: Boolean(snOkx),
    connect: async () => {
      if (!snOkx?.enable) throw new Error('OKX Wallet (Starknet) not detected.')
      const accts = await snOkx.enable()
      const addr = accts?.[0] ?? snOkx.selectedAddress
      if (!addr) throw new Error('OKX Wallet returned no Starknet address.')
      return { address: addr, iconSrc: snOkx.icon, providerName: 'OKX Wallet (Starknet)' }
    },
  })

  // ── Cosmos / Noble ──
  const keplr = w.keplr as { enable: (id: string) => Promise<void>; getKey: (id: string) => Promise<{ bech32Address: string }> } | undefined
  providers.push({
    id: 'cosmos-keplr',
    family: 'cosmos',
    name: 'Keplr',
    chainsLabel: 'Noble Testnet',
    installUrl: 'https://www.keplr.app/download',
    detected: Boolean(keplr),
    connect: async () => {
      if (!keplr?.enable) throw new Error('Keplr extension not detected.')
      await keplr.enable('grand-1')
      const key = await keplr.getKey('grand-1')
      if (!key?.bech32Address) throw new Error('Keplr returned no Noble address.')
      return { address: key.bech32Address, providerName: 'Keplr' }
    },
  })

  const leap = w.leap as { enable: (id: string) => Promise<void>; getKey: (id: string) => Promise<{ bech32Address: string }> } | undefined
  providers.push({
    id: 'cosmos-leap',
    family: 'cosmos',
    name: 'Leap',
    chainsLabel: 'Noble Testnet',
    installUrl: 'https://www.leapwallet.io/download',
    detected: Boolean(leap),
    connect: async () => {
      if (!leap?.enable) throw new Error('Leap extension not detected.')
      await leap.enable('grand-1')
      const key = await leap.getKey('grand-1')
      if (!key?.bech32Address) throw new Error('Leap returned no Noble address.')
      return { address: key.bech32Address, providerName: 'Leap' }
    },
  })

  // ── Stellar ──
  const freighter = w.freighterApi as { getPublicKey?: () => Promise<string>; getAddress?: () => Promise<{ address: string }>; requestAccess?: () => Promise<{ address?: string }> } | undefined
  providers.push({
    id: 'stellar-freighter',
    family: 'stellar',
    name: 'Freighter',
    chainsLabel: 'Stellar Testnet',
    installUrl: 'https://www.freighter.app/',
    detected: Boolean(freighter),
    connect: async () => {
      if (!freighter) throw new Error('Freighter extension not detected.')
      if (freighter.requestAccess) {
        const res = await freighter.requestAccess()
        if (res?.address) return { address: res.address, providerName: 'Freighter' }
      }
      if (freighter.getAddress) {
        const res = await freighter.getAddress()
        if (res?.address) return { address: res.address, providerName: 'Freighter' }
      }
      if (freighter.getPublicKey) {
        const pk = await freighter.getPublicKey()
        if (pk) return { address: pk, providerName: 'Freighter' }
      }
      throw new Error('Freighter did not return a public key.')
    },
  })

  // ── Algorand ── (ARC-0001 provider; Pera Connect and Lute both expose window.algorand,
  // so the row stays brand-neutral instead of claiming one of them)
  const algorandExt = w.algorand as { enable?: () => Promise<{ accounts?: string[] }> } | undefined
  providers.push({
    id: 'algorand-wallet',
    family: 'algorand',
    name: 'Algorand Wallet',
    chainsLabel: 'Algorand Testnet',
    installUrl: 'https://perawallet.app/',
    detected: Boolean(algorandExt?.enable),
    connect: async () => {
      if (!algorandExt?.enable) throw new Error('Algorand wallet extension not detected.')
      const res = await algorandExt.enable()
      const addr = res?.accounts?.[0]
      if (!addr) throw new Error('Algorand wallet returned no address.')
      return { address: addr, providerName: 'Algorand Wallet' }
    },
  })

  // ── NEAR ──
  const nearExt = w.near as { requestSignIn?: () => Promise<unknown>; getAccountId?: () => string; accountId?: string } | undefined
  const meteorExt = w.meteor as { requestSignIn?: () => Promise<{ accountId?: string }> } | undefined
  if (meteorExt || !nearExt) {
    providers.push({
      id: 'near-meteor',
      family: 'near',
      name: 'Meteor Wallet',
      chainsLabel: 'NEAR Testnet',
      installUrl: 'https://meteorwallet.app/',
      detected: Boolean(meteorExt),
      connect: async () => {
        if (meteorExt?.requestSignIn) {
          const res = await meteorExt.requestSignIn()
          if (res?.accountId) return { address: res.accountId, providerName: 'Meteor Wallet' }
        }
        throw new Error('Meteor extension not detected.')
      },
    })
  }
  if (nearExt) {
    providers.push({
      id: 'near-wallet',
      family: 'near',
      name: 'NEAR Wallet',
      chainsLabel: 'NEAR Testnet',
      installUrl: 'https://near.org/',
      detected: true,
      connect: async () => {
        if (nearExt.requestSignIn) await nearExt.requestSignIn()
        const id = nearExt.getAccountId?.() ?? nearExt.accountId
        if (id) return { address: id, providerName: 'NEAR Wallet' }
        throw new Error('NEAR wallet returned no account id.')
      },
    })
  }

  // ── Polkadot / Substrate (window.injectedWeb3) ──
  const injectedWeb3 = (w.injectedWeb3 as Record<string, { enable: (app: string) => Promise<{ accounts: { get: () => Promise<Array<{ address: string }>> } }> }> | undefined) ?? {}
  for (const [key, label, url] of [
    ['talisman', 'Talisman', 'https://talisman.xyz/'],
    ['subwallet-js', 'SubWallet', 'https://subwallet.app/'],
    ['polkadot-js', 'Polkadot.js', 'https://polkadot.js.org/extension/'],
  ] as const) {
    const extObj = injectedWeb3[key]
    providers.push({
      id: `polkadot-${key}`,
      family: 'polkadot',
      name: label,
      chainsLabel: 'Polkadot Westend',
      installUrl: url,
      detected: Boolean(extObj),
      connect: async () => {
        if (!extObj?.enable) throw new Error(`${label} extension not detected.`)
        const api = await extObj.enable('EBT Testnet Console')
        const accts = await api.accounts.get()
        if (!accts?.[0]?.address) throw new Error(`${label} returned no approved account.`)
        return { address: accts[0].address, providerName: label }
      },
    })
  }

  // ── XRPL ──
  const crossmark = (w.crossmark ?? (w.xrpl as Record<string, unknown> | undefined)?.crossmark) as
    | { methods?: { signInAndWait: () => Promise<{ response?: { data?: { address?: string } } }> } }
    | undefined
  providers.push({
    id: 'xrpl-crossmark',
    family: 'xrpl',
    name: 'Crossmark',
    chainsLabel: 'XRPL Testnet',
    installUrl: 'https://crossmark.io/',
    detected: Boolean(crossmark),
    connect: async () => {
      if (!crossmark?.methods?.signInAndWait) throw new Error('Crossmark extension not detected.')
      const res = await crossmark.methods.signInAndWait()
      const addr = res?.response?.data?.address
      if (!addr) throw new Error('Crossmark returned no XRPL address.')
      return { address: addr, providerName: 'Crossmark' }
    },
  })

  // Append any extra dynamically discovered Wallet Standard wallets (e.g., Backpack Sui, Martian, Coin98, etc.)
  for (const std of standardWallets.values()) {
    const chains = std.chains ?? []
    let fam: NonEvmFamily | null = null
    if (chains.some((c) => c.startsWith('solana:'))) fam = 'solana'
    else if (chains.some((c) => c.startsWith('sui:'))) fam = 'sui'
    else if (chains.some((c) => c.startsWith('aptos:')) || std.features['aptos:connect']) fam = 'aptos'
    if (!fam) continue
    if (seenStdKeys.has(`${fam}:${std.name.toLowerCase()}`)) continue
    seenStdKeys.add(`${fam}:${std.name.toLowerCase()}`)
    providers.push({
      id: `${fam}-std-${std.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      family: fam,
      name: std.name,
      chainsLabel: WALLET_FAMILIES[fam].chainsLabel,
      installUrl: WALLET_FAMILIES[fam].recommendedExtensions[0]?.url ?? 'https://solana.com',
      iconSrc: std.icon,
      detected: true,
      connect: () => connectViaStandard(std),
    })
  }

  return providers
}

/* ─────────────────────────── Multi-account persistent store ─────────────────────────── */

interface StoreState {
  accounts: NonEvmAccount[]
  activeByFamily: Partial<Record<NonEvmFamily, string>> // value = NonEvmAccount.id
}

const STORAGE_KEY_V2 = 'ebt.multiWallets.v2'
const STORAGE_KEY_V1 = 'ebt.multiWallets.v1'
const listeners = new Set<() => void>()

function loadInitialStore(): StoreState {
  if (typeof localStorage === 'undefined') return { accounts: [], activeByFamily: {} }
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY_V2)
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as StoreState
      if (parsed && Array.isArray(parsed.accounts)) {
        return { accounts: parsed.accounts, activeByFamily: parsed.activeByFamily ?? {} }
      }
    }
    const rawV1 = localStorage.getItem(STORAGE_KEY_V1)
    if (rawV1) {
      const parsedV1 = JSON.parse(rawV1) as Partial<Record<NonEvmFamily, { family: NonEvmFamily; address: string; providerName: string; mode?: string; connectedAt?: number }>>
      const accounts: NonEvmAccount[] = []
      const activeByFamily: Partial<Record<NonEvmFamily, string>> = {}
      for (const acct of Object.values(parsedV1)) {
        if (!acct?.address || acct.mode === 'readonly') continue
        const pid = acct.providerName.toLowerCase().replace(/[^a-z0-9]/g, '-')
        const id = `${acct.family}:${pid}:${acct.address}`
        accounts.push({
          id,
          family: acct.family,
          providerId: pid,
          providerName: acct.providerName,
          address: acct.address,
          mode: 'extension',
          connectedAt: acct.connectedAt ?? Date.now(),
        })
        activeByFamily[acct.family] = id
      }
      return { accounts, activeByFamily }
    }
  } catch {
    /* ignore */
  }
  return { accounts: [], activeByFamily: {} }
}

let store: StoreState = loadInitialStore()
let activeMapSnapshot: Partial<Record<NonEvmFamily, NonEvmAccount>> = computeActiveMap(store)

function computeActiveMap(s: StoreState): Partial<Record<NonEvmFamily, NonEvmAccount>> {
  const out: Partial<Record<NonEvmFamily, NonEvmAccount>> = {}
  for (const a of s.accounts) {
    const activeId = s.activeByFamily[a.family]
    if (!out[a.family] || a.id === activeId) {
      out[a.family] = a
    }
  }
  return out
}

function emit() {
  activeMapSnapshot = computeActiveMap(store)
  listeners.forEach((l) => l())
}

function persistAndEmit(next: StoreState) {
  store = next
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(store))
    }
  } catch {
    /* ignore */
  }
  emit()
}

export async function connectWalletProvider(provider: NonEvmWalletProvider): Promise<NonEvmAccount> {
  const res = await provider.connect()
  const providerName = res.providerName ?? provider.name
  const id = `${provider.family}:${provider.id}:${res.address}`
  const existing = store.accounts.filter((a) => a.id !== id)
  const acct: NonEvmAccount = {
    id,
    family: provider.family,
    providerId: provider.id,
    providerName,
    address: res.address,
    iconSrc: res.iconSrc ?? provider.iconSrc,
    mode: 'extension',
    connectedAt: Date.now(),
  }
  persistAndEmit({
    accounts: [...existing, acct],
    activeByFamily: { ...store.activeByFamily, [provider.family]: id },
  })
  return acct
}

export async function connectNonEvmExtension(family: NonEvmFamily): Promise<NonEvmAccount> {
  const candidates = getNonEvmWalletProviders().filter((p) => p.family === family)
  const detected = candidates.find((p) => p.detected) ?? candidates[0]
  if (!detected) throw new Error(`No ${WALLET_FAMILIES[family].label} extension detected.`)
  return connectWalletProvider(detected)
}

export function setActiveNonEvmAccount(id: string) {
  const target = store.accounts.find((a) => a.id === id)
  if (!target) return
  persistAndEmit({
    accounts: store.accounts,
    activeByFamily: { ...store.activeByFamily, [target.family]: id },
  })
}

export function disconnectNonEvmAccountById(id: string) {
  const remaining = store.accounts.filter((a) => a.id !== id)
  const nextActive: Partial<Record<NonEvmFamily, string>> = { ...store.activeByFamily }
  for (const [fam, aid] of Object.entries(nextActive) as Array<[NonEvmFamily, string]>) {
    if (aid === id) {
      const replacement = remaining.find((a) => a.family === fam)
      if (replacement) nextActive[fam] = replacement.id
      else delete nextActive[fam]
    }
  }
  persistAndEmit({ accounts: remaining, activeByFamily: nextActive })
}

export function disconnectNonEvmAccount(family: NonEvmFamily) {
  const active = activeMapSnapshot[family]
  if (active) disconnectNonEvmAccountById(active.id)
}

export function getNonEvmAccount(family: NonEvmFamily): NonEvmAccount | undefined {
  return activeMapSnapshot[family]
}

export function getAllNonEvmAccountsMap(): Partial<Record<NonEvmFamily, NonEvmAccount>> {
  return activeMapSnapshot
}

export function useNonEvmWallets(): Partial<Record<NonEvmFamily, NonEvmAccount>> {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => activeMapSnapshot,
    () => activeMapSnapshot,
  )
}

export function useAllNonEvmAccounts(): NonEvmAccount[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => store.accounts,
    () => store.accounts,
  )
}

/* ─────────────────────────── Global Wallet Modal controller ─────────────────────────── */

export interface WalletModalRequest {
  open: boolean
  focusFamily?: WalletFamily | null
  networkName?: string
  reason?: string
  onConnected?: (family: WalletFamily, address: string) => void
}

let modalState: WalletModalRequest = { open: false }
const modalListeners = new Set<() => void>()

export function openWalletModal(opts: Omit<WalletModalRequest, 'open'> = {}) {
  modalState = { open: true, ...opts }
  modalListeners.forEach((l) => l())
}

export function closeWalletModal() {
  modalState = { open: false }
  modalListeners.forEach((l) => l())
}

export function useWalletModalState(): WalletModalRequest {
  return useSyncExternalStore(
    (cb) => {
      modalListeners.add(cb)
      return () => modalListeners.delete(cb)
    },
    () => modalState,
    () => modalState,
  )
}
