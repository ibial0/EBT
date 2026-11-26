/**
 * Page-side EIP-1193 shim for local testing. Injected with CDP
 * Page.addScriptToEvaluateOnNewDocument before the app loads; every call is forwarded to
 * the local signer on 127.0.0.1:8791. Not part of the app bundle.
 */
;(() => {
  const ENDPOINT = 'http://127.0.0.1:8791'
  const listeners = new Map()

  async function forward(method, params) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ method, params }),
    })
    const body = await res.json()
    if (body.error) {
      const err = new Error(body.error.message)
      err.code = body.error.code ?? 4001
      throw err
    }
    return body.result
  }

  const provider = {
    isTestWallet: true,
    isMetaMask: true,
    async request({ method, params }) {
      const result = await forward(method, params)
      if (method === 'wallet_switchEthereumChain') {
        const chainId = params?.[0]?.chainId
        listeners.get('chainChanged')?.forEach((fn) => fn(chainId))
      }
      return result
    },
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event).add(fn)
    },
    removeListener(event, fn) {
      listeners.get(event)?.delete(fn)
    },
  }

  // EIP-6963 announcement so wagmi lists it like a real extension
  const info = {
    uuid: '6f1c2a44-8f3c-4a11-9d6b-2c4f0a7f0001',
    name: 'Test Wallet',
    icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=',
    rdns: 'test.wallet',
  }
  window.addEventListener('eip6963:requestProvider', () =>
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: { info, provider } })),
  )

  provider.providers = [provider]
  window.ethereum = provider
})()
