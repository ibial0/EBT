import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
// Self-hosted so the app never blocks on a font CDN: display, body, data.
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './index.css'
import { wagmiConfig } from './lib/wallet'
import { resumeTracking } from './lib/tracker'
import { resumeDepositTracking } from './lib/depositTrack'
import { resumeOrbitTracking } from './lib/orbitTrack'
import { resumeAcrossTracking } from './lib/acrossTrack'
import { getPublicClient } from 'wagmi/actions'
import { Toaster } from './components/ui'
import { ErrorBoundary } from './components/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 } },
})

function Root() {
  useEffect(() => {
    resumeTracking()
    resumeAcrossTracking()
    resumeDepositTracking((chainId) => getPublicClient(wagmiConfig, { chainId: chainId as never }))
    resumeOrbitTracking((chainId) => getPublicClient(wagmiConfig, { chainId: chainId as never }))
  }, [])
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
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
