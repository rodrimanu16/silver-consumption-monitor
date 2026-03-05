import { useState, useEffect, useCallback } from 'react'
import './index.css'
import { RealtimePanel } from './components/RealtimePanel'
import { HistoricalChart } from './components/HistoricalChart'
import { ParameterImpact } from './components/ParameterImpact'
import { AiAssistant } from './components/AiAssistant'
import { ProductionLine } from './components/ProductionLine'
import { OptimizationPanel } from './components/OptimizationPanel'
import { Activity, Factory, BrainCircuit } from 'lucide-react'

export interface Snapshot {
  timestamp: string
  mirror_type: string
  status: 'optimal' | 'high' | 'low'
  kpis: {
    silver_consumption_gm2: number
    nominal_gm2: number
    deviation_pct: number
    silver_per_min_g: number
    throughput_m2_min: number
    silver_consumed_today_g: number
  }
  parameters: {
    line_speed: number
    bath_temperature: number
    sensitizer_conc: number
    activator_conc: number
    nozzle_pressure: number
    silver_flow_rate: number
  }
}

type Tab = 'dashboard' | 'line' | 'optimization'

function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch('/api/realtime')
      const data: Snapshot = await res.json()
      setSnapshot(data)
      setLastUpdated(new Date())
    } catch (e) {
      console.error('Failed to fetch realtime data', e)
    }
  }, [])

  useEffect(() => {
    fetchSnapshot()
    const interval = setInterval(fetchSnapshot, 5000)
    return () => clearInterval(interval)
  }, [fetchSnapshot])

  const statusLabel = snapshot?.status ?? 'optimal'

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <Activity size={18} color="var(--silver)" />
          <h1>Silver Consumption Monitor</h1>
          <span className="header-subtitle">Mirror Production Line</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {lastUpdated && (
            <span className="timestamp">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          {snapshot && (
            <span className={`status-badge ${statusLabel}`}>
              <span className={`pulse ${statusLabel}`} />
              {statusLabel === 'optimal' ? 'Optimal' : statusLabel === 'high' ? 'High Consumption' : 'Low Consumption'}
            </span>
          )}
        </div>
      </header>

      {/* Tab bar */}
      <div style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        display: 'flex', gap: 0,
      }}>
        {([
          { id: 'dashboard',    label: 'Dashboard',       icon: <Activity size={13} /> },
          { id: 'line',         label: 'Production Line', icon: <Factory size={13} /> },
          { id: 'optimization', label: 'AI Optimization', icon: <BrainCircuit size={13} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 18px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? 'var(--text)' : 'var(--muted)',
              borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1,
              transition: 'all 0.15s',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <main className="main">
        {activeTab === 'dashboard' ? (
          <>
            <RealtimePanel snapshot={snapshot} />
            <HistoricalChart />
            <div className="bottom-grid">
              <ParameterImpact />
              <AiAssistant snapshot={snapshot} />
            </div>
          </>
        ) : activeTab === 'line' ? (
          <ProductionLine snapshot={snapshot} />
        ) : (
          <OptimizationPanel snapshot={snapshot} />
        )}
      </main>
    </div>
  )
}

export default App
