import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
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
}

export const wagmiConfig = createConfig({
  chains: VIEM_CHAINS as unknown as readonly [Chain, ...Chain[]],
  connectors: [injected({ shimDisconnect: true })],
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
