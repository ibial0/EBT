import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { syncOrbitConfirmations } from './lib/orbitWatch'
import { Layout } from './components/Layout'
import Overview from './pages/Overview'
import Portfolio from './pages/Portfolio'
import Recover from './pages/Recover'
import Bridge from './pages/Bridge'
import Swap from './pages/Swap'
import Faucets from './pages/Faucets'
import ActivityPage from './pages/ActivityPage'
import Settings from './pages/Settings'

export default function App() {
  // Advance pending Orbit withdrawals as soon as the rollup confirms them, on any page.
  useEffect(() => {
    void syncOrbitConfirmations()
    const t = window.setInterval(() => void syncOrbitConfirmations(), 15000)
    return () => window.clearInterval(t)
  }, [])

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/bridge" element={<Bridge />} />
        <Route path="/bridge/:id" element={<Bridge />} />
        <Route path="/swap" element={<Swap />} />
        <Route path="/cross-chain" element={<Navigate to="/bridge" replace />} />
        <Route path="/faucets" element={<Faucets />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/activity/:id" element={<ActivityPage />} />
        <Route path="/recover" element={<Recover />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Overview />} />
      </Route>
    </Routes>
  )
}
