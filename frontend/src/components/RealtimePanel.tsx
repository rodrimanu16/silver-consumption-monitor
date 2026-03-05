import type { Snapshot } from '../App'

interface Props { snapshot: Snapshot | null }

function colorForDeviation(pct: number) {
  if (Math.abs(pct) <= 5) return 'green'
  if (pct > 5) return 'red'
  return 'amber'
}

export function RealtimePanel({ snapshot }: Props) {
  if (!snapshot) {
    return (
      <div className="card">
        <div className="card-title">Real-Time Consumption</div>
        <div style={{ color: 'var(--muted)', padding: '20px 0' }}>Loading…</div>
      </div>
    )
  }

  const { kpis } = snapshot
  const devColor = colorForDeviation(kpis.deviation_pct)

  return (
    <div className="card">
      <div className="card-title">Real-Time Silver Consumption</div>
      <div className="kpi-grid">
        <div className="kpi-item">
          <div className="kpi-label">Consumption</div>
          <div className={`kpi-value ${devColor}`}>{kpis.silver_consumption_gm2}</div>
          <div className="kpi-unit">g / m²</div>
          <div className="kpi-nominal">Nominal: {kpis.nominal_gm2} g/m²</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">Deviation</div>
          <div className={`kpi-value ${devColor}`}>
            {kpis.deviation_pct > 0 ? '+' : ''}{kpis.deviation_pct}
          </div>
          <div className="kpi-unit">% vs. nominal</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">Rate</div>
          <div className="kpi-value accent">{kpis.silver_per_min_g}</div>
          <div className="kpi-unit">g / min</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">Throughput</div>
          <div className="kpi-value">{kpis.throughput_m2_min}</div>
          <div className="kpi-unit">m² / min</div>
        </div>
        <div className="kpi-item">
          <div className="kpi-label">Shift Total</div>
          <div className="kpi-value">{(kpis.silver_consumed_today_g / 1000).toFixed(1)}</div>
          <div className="kpi-unit">kg today</div>
        </div>
      </div>
    </div>
  )
}
