import { useState, useEffect } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'

interface HistoryPoint {
  timestamp: string
  silver_consumption_gm2: number
  line_speed: number
  bath_temperature: number
  mirror_type: string
}

const HOURS_OPTIONS = [6, 12, 24, 48]

export function HistoricalChart() {
  const [data, setData] = useState<HistoryPoint[]>([])
  const [hours, setHours] = useState(24)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/history?hours=${hours}`)
      .then(r => r.json())
      .then((d: HistoryPoint[]) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [hours])

  const formatted = data.map(d => ({
    ...d,
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }))

  const avg = data.length
    ? (data.reduce((s, d) => s + d.silver_consumption_gm2, 0) / data.length).toFixed(2)
    : null

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>Historical Silver Consumption</div>
        <div className="btn-group" style={{ display: 'flex', gap: 6 }}>
          {HOURS_OPTIONS.map(h => (
            <button key={h} className={hours === h ? 'active' : ''} onClick={() => setHours(h)}>
              {h}h
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', padding: '40px 0', textAlign: 'center' }}>Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="silverGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#4f8ef7" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3d" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: '#8b8fa8', fontSize: 11 }}
              interval={Math.floor(formatted.length / 8)}
              tickLine={false} axisLine={false}
            />
            <YAxis
              tick={{ fill: '#8b8fa8', fontSize: 11 }}
              tickLine={false} axisLine={false}
              domain={['auto', 'auto']}
              tickFormatter={v => `${v}`}
            />
            <Tooltip
              contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3d', borderRadius: 6, fontSize: 12 }}
              labelStyle={{ color: '#8b8fa8' }}
              itemStyle={{ color: '#c0c8d8' }}
              formatter={(v: number | undefined) => [`${v ?? ''} g/m²`, 'Silver']}
            />
            {avg && (
              <ReferenceLine
                y={parseFloat(avg)}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: `avg ${avg}`, fill: '#f59e0b', fontSize: 11, position: 'insideTopRight' }}
              />
            )}
            <Area
              type="monotone"
              dataKey="silver_consumption_gm2"
              stroke="#4f8ef7"
              strokeWidth={2}
              fill="url(#silverGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#4f8ef7' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
      {avg && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
          Average over period: <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{avg} g/m²</span>
          &nbsp;·&nbsp;{data.length} data points
        </div>
      )}
    </div>
  )
}
