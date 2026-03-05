import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Database } from 'lucide-react'
import type { Snapshot } from '../App'

interface GenieResponse {
  conversation_id?: string
  text?: string
  sql?: string
  columns?: string[]
  data?: string[][]
  error?: string
}

interface Message {
  role: 'user' | 'assistant'
  genie?: GenieResponse
}

const SUGGESTIONS = [
  'What is the average consumption per mirror type this week?',
  'When was consumption more than 20% above nominal?',
  'How does line speed affect silver consumption?',
  'Which hour of day has the highest consumption?',
]

function GenieResult({ genie }: { genie: GenieResponse }) {
  const [showSql, setShowSql] = useState(false)

  if (genie.error) {
    return <span style={{ color: 'var(--red)', fontSize: 12 }}>{genie.error}</span>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {genie.text && (
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55 }}>{genie.text}</div>
      )}

      {/* Data table */}
      {genie.columns && genie.data && genie.data.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {genie.columns.map(c => (
                  <th key={c} style={{
                    textAlign: 'left', padding: '4px 8px',
                    background: 'var(--bg)', color: 'var(--muted)',
                    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                  }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {genie.data.slice(0, 8).map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{
                      padding: '3px 8px', color: 'var(--text)',
                      borderBottom: '1px solid #1e2130',
                    }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {genie.data.length > 8 && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              Showing 8 of {genie.data.length} rows
            </div>
          )}
        </div>
      )}

      {/* SQL toggle */}
      {genie.sql && (
        <div>
          <button
            onClick={() => setShowSql(s => !s)}
            style={{
              background: 'none', border: 'none', color: 'var(--muted)',
              fontSize: 11, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Database size={10} />
            {showSql ? 'Hide SQL' : 'View SQL'}
          </button>
          {showSql && (
            <pre style={{
              marginTop: 6, padding: '8px 10px', background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 4,
              fontSize: 10, color: 'var(--accent)', overflowX: 'auto',
              whiteSpace: 'pre-wrap', lineHeight: 1.5,
            }}>{genie.sql}</pre>
          )}
        </div>
      )}
    </div>
  )
}

export function AiAssistant({ snapshot: _snapshot }: { snapshot: Snapshot | null }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text: string) {
    const question = text.trim()
    if (!question || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', genie: { text: question } }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, conversation_id: conversationId }),
      })
      const data: GenieResponse = await res.json()
      if (data.conversation_id) setConversationId(data.conversation_id)
      setMessages(prev => [...prev, { role: 'assistant', genie: data }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', genie: { error: 'Failed to reach Genie. Check backend configuration.' } }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 460 }}>
      <div className="card-title">
        <Database size={14} />
        Genie Data Assistant
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
          Databricks Genie · tko.silver_monitor
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginBottom: 8 }}>
              Ask data questions about historical production
            </div>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                style={{
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '7px 12px', color: 'var(--muted)',
                  cursor: 'pointer', fontSize: 12, textAlign: 'left', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--accent)'; (e.target as HTMLElement).style.color = 'var(--text)'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--muted)'; }}
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                background: msg.role === 'user' ? 'var(--border)' : '#1e3a5f',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {msg.role === 'user' ? <User size={13} color="var(--muted)" /> : <Bot size={13} color="var(--accent)" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {msg.role === 'user'
                  ? <span style={{ fontSize: 13, color: 'var(--muted)' }}>{msg.genie?.text}</span>
                  : msg.genie
                    ? <GenieResult genie={msg.genie} />
                    : loading && i === messages.length - 1
                      ? <span style={{ color: 'var(--muted)', fontSize: 12 }}>Querying Genie…</span>
                      : null}
              </div>
            </div>
          ))
        )}
        {loading && messages.length > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={13} color="var(--accent)" />
            </div>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Genie is thinking…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send(input)}
          placeholder="Ask a data question about production history…"
          disabled={loading}
          style={{
            flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '7px 12px', color: 'var(--text)',
            fontSize: 13, outline: 'none',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          style={{
            background: 'var(--accent)', border: 'none', borderRadius: 6,
            width: 34, height: 34, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: loading || !input.trim() ? 0.4 : 1, transition: 'opacity 0.15s', flexShrink: 0,
          }}
        >
          <Send size={15} color="white" />
        </button>
      </div>
    </div>
  )
}
