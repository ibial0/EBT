/**
 * Test-wallet signer for local end-to-end checks.
 *
 * NOT shipped with the app: a Node process holds the throwaway testnet key and answers
 * EIP-1193 calls forwarded by the page shim. It signs only testnet transactions and only
 * for the address in .test-wallet.json, so nothing here can touch real funds.
 *
 * Run:  node scripts/test-wallet-server.mjs
 */
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { mnemonicToAccount } from 'viem/accounts'
import { createWalletClient, http } from 'viem'

const wallet = JSON.parse(readFileSync(new URL('../.test-wallet.json', import.meta.url), 'utf8'))
const account = mnemonicToAccount(wallet.mnemonic)

/** Public testnet RPCs, mirroring src/lib/wallet.ts (only what the shim needs). */
const RPC = {
  11155111: 'https://ethereum-sepolia-rpc.publicnode.com',
  84532: 'https://sepolia.base.org',
  421614: 'https://sepolia-rollup.arbitrum.io/rpc',
  11155420: 'https://sepolia.optimism.io',
  46630: 'https://rpc.testnet.chain.robinhood.com',
  1301: 'https://sepolia.unichain.org',
  43113: 'https://api.avax-test.network/ext/bc/C/rpc',
  80002: 'https://rpc-amoy.polygon.technology',
}

let chainId = 11155111
const listeners = new Set()

async function rpc(method, params) {
  const url = RPC[chainId]
  if (!url) throw new Error(`no test RPC configured for chain ${chainId}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params: params ?? [] }),
  })
  const body = await res.json()
  if (body.error) throw new Error(body.error.message ?? 'rpc error')
  return body.result
}

async function handle(method, params = []) {
  switch (method) {
    case 'eth_requestAccounts':
    case 'eth_accounts':
      return [account.address]
    case 'eth_chainId':
      return `0x${chainId.toString(16)}`
    case 'net_version':
      return String(chainId)
    case 'wallet_switchEthereumChain': {
      const next = Number.parseInt(params[0].chainId, 16)
      if (!RPC[next]) throw Object.assign(new Error('chain not configured in test wallet'), { code: 4902 })
      chainId = next
      listeners.forEach((fn) => fn({ method: 'chainChanged', params: [`0x${chainId.toString(16)}`] }))
      return null
    }
    case 'wallet_addEthereumChain':
      return null
    case 'eth_sendTransaction': {
      const tx = params[0]
      const url = RPC[chainId]
      if (!url) throw new Error(`no test RPC configured for chain ${chainId}`)
      const chain = {
        id: chainId,
        name: `chain-${chainId}`,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: [url] } },
      }
      const client = createWalletClient({ account, chain, transport: http(url) })
      const hash = await client.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value ? BigInt(tx.value) : 0n,
        gas: tx.gas ? BigInt(tx.gas) : undefined,
      })
      return hash
    }
    default:
      return rpc(method, params)
  }
}

const server = createServer(async (req, res) => {
  // Loopback only, and never for an arbitrary web origin: this server signs with a local key.
  const origin = req.headers.origin
  const allowed = origin == null || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
  if (!allowed) {
    res.statusCode = 403
    return res.end('origin not allowed')
  }
  res.setHeader('Access-Control-Allow-Origin', origin ?? 'http://127.0.0.1')
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') return res.end()
  if (req.method !== 'POST') return res.end('test wallet: post {method, params}')
  let raw = ''
  for await (const chunk of req) raw += chunk
  try {
    const { method, params } = JSON.parse(raw)
    const result = await handle(method, params)
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ result }))
  } catch (e) {
    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: { message: e.message, code: 4001 } }))
  }
})

const PORT = 8791
server.listen(PORT, '127.0.0.1', () => {
  console.log(`test wallet ${account.address} listening on http://127.0.0.1:${PORT} (chain ${chainId})`)
})
