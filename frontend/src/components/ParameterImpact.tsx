import { useState, useEffect } from 'react'
import { Info } from 'lucide-react'

interface ImpactItem {
  parameter: string
  label: string
  impact_pct: number
  direction: 'direct' | 'inverse'
  description: string
  optimal_range: string
}

export function ParameterImpact() {
  const [items, setItems] = useState<ImpactItem[]>([])

  useEffect(() => {
    fetch('/api/parameters')
      .then(r => r.json())
      .then(setItems)
      .catch(console.error)
  }, [])

  const maxImpact = Math.max(...items.map(i => Math.abs(i.impact_pct)), 1)

  return (
    <div className="card">
      <div className="card-title">
        <Info size={14} />
        Parameter Impact on Silver Consumption
      </div>
      <div className="impact-list">
        {items.map(item => (
          <div className="impact-item" key={item.parameter}>
            <div className="impact-header">
              <span className="impact-label">{item.label}</span>
              <span className="impact-meta">
                {item.direction === 'direct' ? '+' : ''}{item.impact_pct}% influence
              </span>
            </div>
            <div className="impact-bar-bg">
              <div
                className={`impact-bar-fill ${item.direction}`}
                style={{ width: `${(Math.abs(item.impact_pct) / maxImpact) * 100}%` }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span className="impact-desc">{item.description}</span>
              <span className="impact-range">{item.optimal_range}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, fontSize: 11, color: 'var(--muted)' }}>
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Blue</span> = direct,&nbsp;
        <span style={{ color: 'var(--amber)', fontWeight: 600 }}>amber</span> = inverse relationship.&nbsp;
        <span style={{ color: 'var(--green)' }}>Green</span> values = optimal range.
      </div>
    </div>
  )
}
