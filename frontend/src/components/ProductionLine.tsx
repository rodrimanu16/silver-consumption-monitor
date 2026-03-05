import { useEffect } from 'react'
import {
  Package, Sparkles, Droplets, Layers, Flame,
  Wind, Box, Scissors, ChevronRight,
} from 'lucide-react'
import type { Snapshot } from '../App'

const STATIONS = [
  { id: 1, name: 'Glass Input',       Icon: Package,  desc: 'Loading & inspection' },
  { id: 2, name: 'Cleaning',          Icon: Sparkles, desc: 'Rinsing, polishing & washing' },
  { id: 3, name: 'Silver Coating',    Icon: Droplets, desc: 'Chemical treatment & Ag deposition', active: true },
  { id: 4, name: 'Paint',             Icon: Layers,   desc: 'Protective paint layer' },
  { id: 5, name: 'Curing',            Icon: Flame,    desc: 'Heat treatment & finalization' },
  { id: 6, name: 'Cooling',           Icon: Wind,     desc: 'Air cooling to ambient' },
  { id: 7, name: 'Unloading',         Icon: Box,      desc: 'Stacking & storage prep' },
  { id: 8, name: 'Cutting',           Icon: Scissors, desc: 'Custom dimension cutting' },
]

const PARAMS = [
  { key: 'line_speed',       label: 'Line Speed',     unit: 'm/min', min: 0.8, max: 1.4, decimals: 2 },
  { key: 'bath_temperature', label: 'Bath Temp',      unit: '°C',    min: 42,  max: 48,  decimals: 1 },
  { key: 'sensitizer_conc',  label: 'Sensitizer',     unit: 'g/L',   min: 0.18, max: 0.25, decimals: 3 },
  { key: 'activator_conc',   label: 'Activator',      unit: 'g/L',   min: 0.08, max: 0.14, decimals: 3 },
  { key: 'nozzle_pressure',  label: 'Nozzle Pressure',unit: 'bar',   min: 2.8, max: 3.8,  decimals: 2 },
  { key: 'silver_flow_rate', label: 'Silver Flow',    unit: 'L/min', min: 0.9, max: 1.3,  decimals: 3 },
]

function statusColor(status: string) {
  return status === 'optimal' ? 'var(--green)' : status === 'high' ? 'var(--red)' : 'var(--amber)'
}

function statusLabel(status: string) {
  return status === 'optimal' ? 'Optimal' : status === 'high' ? 'High Consumption' : 'Low Consumption'
}

export function ProductionLine({ snapshot }: { snapshot: Snapshot | null }) {
  useEffect(() => {
    if (document.getElementById('pl-anim')) return
    const el = document.createElement('style')
    el.id = 'pl-anim'
    el.textContent = `
      @keyframes conveyorFlow {
        from { background-position: 0 0; }
        to   { background-position: 48px 0; }
      }
      @keyframes glassSlide {
        0%   { transform: translateX(-100px); opacity: 0; }
        6%   { opacity: 1; }
        94%  { opacity: 1; }
        100% { transform: translateX(2400px); opacity: 0; }
      }
      @keyframes stationGlow {
        0%, 100% { box-shadow: 0 0 12px rgba(79,142,247,0.15); }
        50%       { box-shadow: 0 0 24px rgba(79,142,247,0.35); }
      }
    `
    document.head.appendChild(el)
  }, [])

  const status = snapshot?.status ?? 'optimal'
  const col = statusColor(status)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Line header */}
      <div className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--silver)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            ASK Mirror Production Line
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 12 }}>
            4.5M m²/year · 2mm–8mm glass · 8 stations
          </span>
        </div>
        {snapshot && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              Mirror type: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{snapshot.mirror_type.replace(/_/g, ' ')}</span>
            </span>
            <span style={{ width: 1, height: 14, background: 'var(--border)' }} />
            <span className={`status-badge ${status}`}>
              <span className={`pulse ${status}`} />
              {statusLabel(status)}
            </span>
          </div>
        )}
      </div>

      {/* Production line flow */}
      <div className="card" style={{ padding: '20px 20px 16px' }}>
        <div className="card-title" style={{ marginBottom: 16 }}>Production Flow</div>

        {/* Stations */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
          {STATIONS.map((s, i) => {
            const isActive = !!s.active
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: isActive ? 2 : 1 }}>
                <div style={{
                  flex: 1,
                  background: isActive ? 'rgba(79,142,247,0.07)' : 'var(--bg)',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 8,
                  padding: isActive ? '18px 14px' : '14px 8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  position: 'relative',
                  animation: isActive ? 'stationGlow 3s ease-in-out infinite' : 'none',
                  transition: 'all 0.3s',
                }}>
                  {/* Station number */}
                  <div style={{
                    position: 'absolute', top: -9, left: 8,
                    width: 18, height: 18, borderRadius: '50%',
                    background: isActive ? 'var(--accent)' : 'var(--border)',
                    color: isActive ? '#fff' : 'var(--muted)',
                    fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {s.id}
                  </div>

                  <s.Icon size={isActive ? 20 : 14} color={isActive ? 'var(--accent)' : 'var(--muted)'} />

                  <span style={{
                    fontSize: isActive ? 11 : 9,
                    color: isActive ? 'var(--text)' : 'var(--muted)',
                    fontWeight: isActive ? 600 : 400,
                    textAlign: 'center',
                    lineHeight: 1.3,
                  }}>
                    {s.name}
                  </span>

                  {isActive && snapshot && (
                    <>
                      <div style={{ width: '100%', height: 1, background: 'var(--border)', margin: '4px 0' }} />
                      <div style={{ fontSize: 15, fontWeight: 700, color: col }}>
                        {snapshot.kpis.silver_consumption_gm2.toFixed(2)}
                        <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--muted)', marginLeft: 3 }}>g/m²</span>
                      </div>
                      <div style={{
                        fontSize: 10, fontWeight: 600,
                        color: col,
                        background: `color-mix(in srgb, ${col} 15%, transparent)`,
                        padding: '2px 7px', borderRadius: 10,
                      }}>
                        {snapshot.kpis.deviation_pct > 0 ? '+' : ''}{snapshot.kpis.deviation_pct.toFixed(1)}%
                      </div>
                    </>
                  )}
                </div>
                {i < STATIONS.length - 1 && (
                  <ChevronRight size={12} color="var(--border)" style={{ flexShrink: 0, margin: '0 2px' }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Conveyor belt */}
        <div style={{
          height: 18, borderRadius: 4, marginTop: 10,
          position: 'relative', overflow: 'hidden',
          background: 'repeating-linear-gradient(90deg, var(--border) 0px, var(--border) 22px, var(--surface) 22px, var(--surface) 44px, #131620 44px, #131620 48px)',
          backgroundSize: '48px 100%',
          animation: 'conveyorFlow 1.4s linear infinite',
        }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              position: 'absolute',
              top: 3, width: 56, height: 12,
              background: 'linear-gradient(90deg, transparent, rgba(192,200,216,0.25), rgba(192,200,216,0.45), rgba(192,200,216,0.25), transparent)',
              border: '1px solid rgba(192,200,216,0.15)',
              borderRadius: 2,
              animation: `glassSlide ${7 + i * 1.5}s linear ${i * 2.2}s infinite`,
            }} />
          ))}
        </div>
        <div style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center', marginTop: 5, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Glass flow direction →
        </div>
      </div>

      {/* Live parameters for station 3 */}
      <div className="card" style={{ padding: 20 }}>
        <div className="card-title" style={{ marginBottom: 18 }}>
          <Droplets size={14} color="var(--accent)" />
          Station 3 — Silver Coating · Live Process Parameters
          {snapshot && (
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              Nominal: <span style={{ color: 'var(--text)' }}>{snapshot.kpis.nominal_gm2.toFixed(1)} g/m²</span>
              &nbsp;·&nbsp;
              Throughput: <span style={{ color: 'var(--text)' }}>{snapshot.kpis.throughput_m2_min.toFixed(2)} m²/min</span>
            </span>
          )}
        </div>

        {snapshot ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {PARAMS.map(p => {
              const raw = snapshot.parameters[p.key as keyof typeof snapshot.parameters]
              const pct = Math.max(5, Math.min(100, ((raw - p.min) / (p.max - p.min)) * 100))
              return (
                <div key={p.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{p.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                      {raw.toFixed(p.decimals)}&nbsp;<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--muted)' }}>{p.unit}</span>
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, var(--accent), #7ab4fa)',
                      borderRadius: 3,
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                    <span style={{ fontSize: 9, color: 'var(--muted)' }}>{p.min} {p.unit}</span>
                    <span style={{ fontSize: 9, color: 'var(--muted)' }}>{p.max} {p.unit}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '24px 0' }}>
            Waiting for live data…
          </div>
        )}
      </div>

      {/* Station descriptions */}
      <div className="card" style={{ padding: 20 }}>
        <div className="card-title" style={{ marginBottom: 14 }}>Station Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {STATIONS.map(s => (
            <div key={s.id} style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '10px 12px',
              borderLeft: s.active ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 700 }}>{s.id}.</span>
                <s.Icon size={11} color={s.active ? 'var(--accent)' : 'var(--muted)'} />
                <span style={{ fontSize: 11, fontWeight: 600, color: s.active ? 'var(--text)' : 'var(--muted)' }}>{s.name}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.4 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
