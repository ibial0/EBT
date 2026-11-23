import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { wagmiConfig } from './lib/wallet'
import { resumeTracking } from './lib/tracker'
import { resumeDepositTracking } from './lib/depositTrack'
import { getPublicClient } from 'wagmi/actions'
import { Toaster } from './components/ui'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 } },
})

function Root() {
  useEffect(() => {
    resumeTracking()
    resumeDepositTracking((chainId) => getPublicClient(wagmiConfig, { chainId: chainId as never }))
  }, [])
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </WagmiProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
