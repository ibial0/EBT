import { createConfig, http } from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'
import { getAccount, switchChain } from 'wagmi/actions'
import type { Chain } from 'viem'
import { CHAINS, VIEM_CHAINS } from '../config/chains'

/**
 * Public testnet RPCs, every endpoint below was probed for eth_chainId on 2026-11-23.
 * No API keys, no backend proxy: these are the chains' own public endpoints.
 */
export const RPC: Record<number, string> = {
  11155111: 'https://ethereum-sepolia-rpc.publicnode.com',
  43113: 'https://api.avax-test.network/ext/bc/C/rpc',
  11155420: 'https://sepolia.optimism.io',
  421614: 'https://sepolia-rollup.arbitrum.io/rpc',
  84532: 'https://sepolia.base.org',
  80002: 'https://polygon-amoy.drpc.org',
  1301: 'https://sepolia.unichain.org',
  59141: 'https://rpc.sepolia.linea.build',
  812242: 'https://rpc.codex-stg.xyz',
  4801: 'https://worldchain-sepolia.g.alchemy.com/public',
  10143: 'https://testnet-rpc.monad.xyz',
  1328: 'https://evm-rpc-testnet.sei-apis.com',
  763373: 'https://rpc-gel-sepolia.inkonchain.com',
  5042002: 'https://rpc.testnet.arc.io',
  1439: 'https://k8s.testnet.json-rpc.injective.network',
  9746: 'https://testnet-rpc.plasma.to',
  1952: 'https://xlayertestrpc.okx.com',
  91342: 'https://sepolia-rpc.giwa.io',
  46630: 'https://rpc.testnet.chain.robinhood.com',
  // Expanded active EVM testnets (all verified live CORS 2026-11-26)
  26888: 'https://rpc.core.testnet.ab.org',
  11124: 'https://api.testnet.abs.xyz',
  99999: 'https://rpc.ab.testnet.adifoundation.ai/',
  81: 'https://evm.shibuya.astar.network',
  80069: 'https://bepolia.rpc.berachain.com',
  97: 'https://bsc-testnet-rpc.publicnode.com',
  808813: 'https://bob-sepolia.rpc.gobob.xyz/',
  11142220: 'https://forno.celo-sepolia.celo-testnet.org',
  1114: 'https://core-testnet.drpc.org',
  102031: 'https://rpc.cc3-testnet.creditcoin.network',
  338: 'https://cronos-testnet.drpc.org',
  240: 'https://cronos-zkevm-testnet.drpc.org',
  6281971: 'https://rpc.testnet.dogeos.com',
  560048: 'https://ethereum-hoodi-rpc.publicnode.com',
  10200: 'https://rpc.chiadochain.net',
  7771625: 'https://testnet-rpc.gravity.xyz',
  296: 'https://testnet.hashio.io/api',
  998: 'https://rpc.hyperliquid-testnet.xyz/evm',
  2019775: 'https://api.zan.top/public/jovay-testnet',
  1001: 'https://public-en-kairos.node.kaia.io',
  4202: 'https://lisk-sepolia.gateway.tenderly.co',
  5003: 'https://rpc.sepolia.mantle.xyz',
  6343: 'https://carrot.megaeth.com/rpc',
  1740: 'https://testnet.rpc.metall2.com',
  59902: 'https://sepolia.metisdevops.link',
  919: 'https://sepolia.mode.network',
  2910: 'https://rpc-hoodi.morphl2.io',
  10323: 'https://mars.rpc.movachain.com',
  12227332: 'https://neoxt4seed1.ngd.network',
  5611: 'https://opbnb-testnet-rpc.bnbchain.org',
  688689: 'https://atlantic.dplabs-internal.com',
  202601: 'https://saigon-testnet.roninchain.com/rpc',
  157: 'https://rpc.puppynet.shib.io',
  1946: 'https://rpc.minato.soneium.org',
  2391: 'https://rpc-public-spb.tac.build',
  42431: 'https://rpc.moderato.tempo.xyz',
  1112: 'https://api.test.wemix.com',
  51: 'https://erpc.apothem.network',
  300: 'https://sepolia.era.zksync.dev',
  999999999: 'https://sepolia.rpc.zora.energy',
}

/**
 * WalletConnect (QR / mobile pairing) is opt-in: it needs a project id from
 * cloud.reown.com. Drop it in `.env.local` as VITE_WALLETCONNECT_PROJECT_ID and the
 * "WalletConnect — QR Code" row appears in the picker; without it that row is simply
 * not shown, because a QR button that cannot pair would be a lie.
 */
export const WC_PROJECT_ID = String(
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_WALLETCONNECT_PROJECT_ID ?? '',
).trim()

export const wagmiConfig = createConfig({
  chains: VIEM_CHAINS as unknown as readonly [Chain, ...Chain[]],
  connectors: [
    injected({ shimDisconnect: true }),
    ...(WC_PROJECT_ID
      ? [walletConnect({ projectId: WC_PROJECT_ID, showQrModal: true })]
      : []),
  ],
  transports: Object.fromEntries(
    CHAINS.map((c) => [c.id, http(RPC[c.id] ?? c.viem.rpcUrls.default.http[0], { batch: true, retryCount: 2 })]),
  ),
  ssr: false,
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}

export const WALLETCONNECT_NOTE =
  'Injected EVM wallets only (MetaMask, Rabby, Coinbase Wallet browser extension…). WalletConnect needs a third-party Project ID, which we deliberately do not require.'


/**
 * Puts the wallet on `chainId` before a transaction is built.
 *
 * The bug this exists for: `useChainId()` reports the *config* chain, which stays on the
 * last allowlisted testnet even when the wallet itself sits on Ethereum mainnet. The old
 * check therefore passed, and wagmi threw "current chain of the connector (id: 1) does not
 * match the connection's chain" only once the user pressed Confirm. Here we read the
 * connector's own chain, ask the wallet to switch, and wait until it actually reports the
 * target chain — so the failure is a clear message before any signing prompt.
 */
export async function ensureWalletChain(chainId: number): Promise<void> {
  const account = getAccount(wagmiConfig)
  if (!account.isConnected) throw new Error('Connect a wallet first.')

  const target = CHAINS.find((c) => c.id === chainId)
  const label = target?.name ?? `chain ${chainId}`

  /**
   * The store only tracks chains that exist in `config.chains`. A wallet sitting on
   * mainnet therefore looks "stuck" on the last testnet, so ask the provider itself
   * which chain it is really on.
   */
  const providerChainId = async (): Promise<number | undefined> => {
    try {
      const provider = (await account.connector?.getProvider?.()) as
        | { request?: (a: { method: string }) => Promise<unknown> }
        | undefined
      const hex = await provider?.request?.({ method: 'eth_chainId' })
      if (typeof hex === 'string' && hex.startsWith('0x')) return Number.parseInt(hex, 16)
    } catch {
      /* provider may refuse while locked — fall through to the store value */
    }
    return getAccount(wagmiConfig).chainId
  }

  if ((await providerChainId()) === chainId) return

  try {
    await switchChain(wagmiConfig, { chainId: chainId as never })
  } catch (e) {
    const msg = (e as Error).message ?? ''
    if (/reject|denied|cancel/i.test(msg)) {
      throw new Error(`Switch the network in your wallet to ${label} to continue.`)
    }
    throw new Error(`Could not switch to ${label}: ${msg.slice(0, 120)}`)
  }

  // The wallet acknowledges the switch before its provider state settles; wait for it.
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    if ((await providerChainId()) === chainId) return
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error(
    `Your wallet is still on another network. Switch it to ${label} in the wallet, then retry.`,
  )
}
