import { useState, useEffect, useCallback } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Brain, TrendingDown, ArrowUp, ArrowDown, Zap, CheckCircle2, Clock } from 'lucide-react'
import type { Snapshot } from '../App'

interface Recommendation {
  parameter: string
  label: string
  current: number
  target: number
  unit: string
  direction: 'increase' | 'decrease'
  expected_impact_pct: number
  priority: 'high' | 'medium'
  action: string
}

interface OptimizeResult {
  current_gm2: number
  optimal_gm2: number
  nominal_gm2: number
  savings_pct: number
  confidence: number
  model_name: string
  model_detail: string
  last_trained: string
  training_samples: number
  recommendations: Recommendation[]
  forecast: { minute: number; projected_gm2: number }[]
}

interface HistoryPoint {
  timestamp: string
  silver_consumption_gm2: number
  mirror_type: string
}

const NOMINAL_BY_TYPE: Record<string, number> = {
  standard_4mm: 8.5,
  premium_6mm: 11.2,
  ultra_8mm: 14.8,
}

function fmt(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface ChartPoint {
  time: string
  actual: number
  optimal: number
  nominal: number
  forecast?: number
}

export function OptimizationPanel({ snapshot }: { snapshot: Snapshot | null }) {
  const [result, setResult] = useState<OptimizeResult | null>(null)
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [lastRun, setLastRun] = useState<Date | null>(null)

  // Fetch optimization result whenever snapshot changes
  const runOptimize = useCallback(async (snap: Snapshot) => {
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: snap }),
      })
      const data: OptimizeResult = await res.json()
      setResult(data)
      setLastRun(new Date())
    } catch (e) {
      console.error('optimize failed', e)
    }
  }, [])

  // Fetch history for chart
  const buildChart = useCallback(async (snap: Snapshot, opt: OptimizeResult) => {
    try {
      const res = await fetch('/api/history?hours=2')
      const history: HistoryPoint[] = await res.json()

      const nominal = NOMINAL_BY_TYPE[snap.mirror_type] ?? opt.nominal_gm2
      const optimal = opt.optimal_gm2

      const points: ChartPoint[] = history.map(h => ({
        time: fmt(h.timestamp),
        actual: h.silver_consumption_gm2,
        optimal: +((NOMINAL_BY_TYPE[h.mirror_type] ?? nominal) * 1.022).toFixed(3),
        nominal: NOMINAL_BY_TYPE[h.mirror_type] ?? nominal,
      }))

      // Append forecast as future points (dotted extension)
      const lastTs = history.length > 0 ? new Date(history[history.length - 1].timestamp) : new Date()
      opt.forecast.forEach(f => {
        const ts = new Date(lastTs.getTime() + f.minute * 60_000)
        points.push({
          time: fmt(ts.toISOString()),
          actual: f.minute === 0 ? snap.kpis.silver_consumption_gm2 : undefined as unknown as number,
          optimal,
          nominal,
          forecast: f.projected_gm2,
        })
      })

      setChartData(points)
    } catch (e) {
      console.error('chart data failed', e)
    }
  }, [])

  useEffect(() => {
    if (!snapshot) return
    setLoading(true)
    runOptimize(snapshot).finally(() => setLoading(false))
  }, [snapshot, runOptimize])

  useEffect(() => {
    if (snapshot && result) buildChart(snapshot, result)
  }, [snapshot, result, buildChart])

  if (!snapshot) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
        Waiting for live data…
      </div>
    )
  }

  const status = snapshot.status
  const statusCol = status === 'optimal' ? 'var(--green)' : status === 'high' ? 'var(--red)' : 'var(--amber)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Model header */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #1e3a5f, #2d5a8e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid #3a6a9f',
          }}>
            <Brain size={22} color="var(--accent)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              {result?.model_name ?? 'SilverOptNet v2.3'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              {result?.model_detail} · Trained on {result?.training_samples?.toLocaleString()} samples · Last trained {result?.last_trained}
            </div>
          </div>

          {/* Confidence */}
          {result && (
            <div style={{ textAlign: 'center', padding: '8px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>
                {Math.round(result.confidence * 100)}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confidence</div>
            </div>
          )}

          {/* Savings */}
          {result && result.savings_pct > 0 && (
            <div style={{ textAlign: 'center', padding: '8px 16px', background: '#14291400', border: '1px solid #22c55e44', borderRadius: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <TrendingDown size={18} />
                {result.savings_pct}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Savings potential</div>
            </div>
          )}

          {/* Model run time */}
          {lastRun && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
              <Clock size={11} />
              {loading ? 'Running…' : `Updated ${lastRun.toLocaleTimeString()}`}
            </div>
          )}
        </div>

        {/* Current vs Optimal summary */}
        {result && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 20 }}>
            {[
              { label: 'Current Consumption', value: result.current_gm2.toFixed(2), unit: 'g/m²', color: statusCol },
              { label: 'Model Optimal', value: result.optimal_gm2.toFixed(2), unit: 'g/m²', color: 'var(--green)' },
              { label: 'Nominal Target', value: result.nominal_gm2.toFixed(1), unit: 'g/m²', color: 'var(--muted)' },
            ].map(item => (
              <div key={item.label} style={{
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px',
              }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: item.color, lineHeight: 1 }}>
                  {item.value}
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginLeft: 4 }}>{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chart: Live vs Optimal */}
      <div className="card" style={{ padding: 20 }}>
        <div className="card-title" style={{ marginBottom: 4 }}>
          <Zap size={14} color="var(--accent)" />
          Live Consumption vs Model Optimal
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 400, color: 'var(--muted)', textTransform: 'none', letterSpacing: 0 }}>
            Last 2h · Dotted = forecast if recommendations applied
          </span>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: 'var(--muted)' }}
                interval={Math.floor(chartData.length / 6)}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--muted)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${v}`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                labelStyle={{ color: 'var(--muted)' }}
                formatter={(v: number | undefined, name: string | undefined) => [
                  v != null ? `${(v as number).toFixed(2)} g/m²` : '—',
                  name === 'actual' ? 'Live' : name === 'optimal' ? 'Model Optimal' : name === 'forecast' ? 'Forecast' : 'Nominal',
                ] as [string, string]}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: 'var(--muted)', paddingTop: 8 }}
                formatter={(value) => value === 'actual' ? 'Live consumption' : value === 'optimal' ? 'Model optimal' : value === 'forecast' ? 'Forecast (recommendations applied)' : 'Nominal'}
              />

              {/* Savings gap: area between actual and optimal */}
              <Area
                type="monotone"
                dataKey="actual"
                stroke="transparent"
                fill="#ef444420"
                fillOpacity={1}
                legendType="none"
                connectNulls={false}
              />

              {/* Nominal reference */}
              <Line
                type="monotone"
                dataKey="nominal"
                stroke="var(--border)"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
                legendType="line"
              />

              {/* Optimal line */}
              <Line
                type="monotone"
                dataKey="optimal"
                stroke="var(--green)"
                strokeWidth={2}
                dot={false}
                connectNulls
              />

              {/* Actual consumption */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="var(--accent)"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
              />

              {/* Forecast */}
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="var(--green)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Loading chart data…
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="card" style={{ padding: 20 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={14} color="var(--accent)" />
          Parameter Recommendations
          {result && result.recommendations.length === 0 && (
            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--green)', fontWeight: 400, textTransform: 'none' }}>
              All parameters within optimal range
            </span>
          )}
        </div>

        {result ? (
          result.recommendations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {result.recommendations.map((rec) => (
                <div key={rec.parameter} style={{
                  background: 'var(--bg)',
                  border: `1px solid ${rec.priority === 'high' ? '#ef444430' : 'var(--border)'}`,
                  borderLeft: `3px solid ${rec.priority === 'high' ? 'var(--red)' : 'var(--accent)'}`,
                  borderRadius: 8, padding: '14px 16px',
                  display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, alignItems: 'center',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      {rec.direction === 'increase'
                        ? <ArrowUp size={14} color="var(--green)" />
                        : <ArrowDown size={14} color="var(--amber)" />
                      }
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{rec.label}</span>
                      <span style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 600,
                        background: rec.priority === 'high' ? '#ef444418' : '#4f8ef718',
                        color: rec.priority === 'high' ? 'var(--red)' : 'var(--accent)',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>
                        {rec.priority}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{rec.action}</div>
                  </div>

                  {/* Current → Target */}
                  <div style={{ textAlign: 'center', padding: '8px 12px', background: 'var(--surface)', borderRadius: 6, whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>Current → Target</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                      <span style={{ color: 'var(--muted)' }}>{rec.current}</span>
                      <span style={{ margin: '0 6px', color: 'var(--border)' }}>→</span>
                      <span style={{ color: rec.direction === 'increase' ? 'var(--green)' : 'var(--amber)' }}>{rec.target}</span>
                      <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--muted)', marginLeft: 4 }}>{rec.unit}</span>
                    </div>
                  </div>

                  {/* Impact */}
                  <div style={{ textAlign: 'center', padding: '8px 12px', background: '#22c55e0f', border: '1px solid #22c55e30', borderRadius: 6, minWidth: 80 }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>Expected saving</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--green)' }}>
                      −{Math.abs(rec.expected_impact_pct)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--green)', fontSize: 14 }}>
              <CheckCircle2 size={32} style={{ display: 'block', margin: '0 auto 8px' }} />
              Process is running at near-optimal conditions.
            </div>
          )
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 20 }}>
            Analysing parameters…
          </div>
        )}
      </div>
    </div>
  )
}
