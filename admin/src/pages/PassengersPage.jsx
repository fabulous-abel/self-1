import { useEffect, useRef, useState } from 'react'
import { Search, X, RefreshCw, Users2, WifiOff } from 'lucide-react'
import { listQueues, adminRemovePassenger, ensureAdminToken } from '../services/backendApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateVal) {
  if (!dateVal) return '—'
  const diff = Date.now() - new Date(dateVal).getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.round(m / 60)}h ago`
}

const STATUS_TONE = {
  waiting:  { bg: '#f0fdf4', text: '#15803d', label: 'Waiting' },
  notified: { bg: '#fff7ed', text: '#c2410c', label: 'Your turn !' },
  missed:   { bg: '#fef2f2', text: '#b91c1c', label: 'Missed' },
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PassengersPage() {
  const [allPassengers, setAllPassengers] = useState([])
  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState(false)
  const [search, setSearch] = useState('')
  const [removing, setRemoving] = useState(null)
  const socketRef = useRef(null)

  // Build a flat list of passengers across all queues
  const fetchAll = async () => {
    try {
      const queues = await listQueues()
      setOnline(true)

      // Fetch detail for each queue in parallel to get entries
      const details = await Promise.allSettled(
        queues.map(q =>
          fetch(`http://localhost:5000/api/queues/${q.id}`)
            .then(r => r.json())
            .then(d => ({ queue: q, entries: d.queue?.entries ?? [] }))
        )
      )

      const flat = []
      for (const res of details) {
        if (res.status !== 'fulfilled') continue
        const { queue, entries } = res.value
        for (const entry of entries) {
          flat.push({ ...entry, queueId: queue.id, queueName: queue.name })
        }
      }

      flat.sort((a, b) => a.position - b.position || a.queueName.localeCompare(b.queueName))
      setAllPassengers(flat)
    } catch {
      setOnline(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    ensureAdminToken()
    fetchAll()
    const interval = setInterval(fetchAll, 8000)

    try {
      // eslint-disable-next-line no-undef
      const { io } = window.__adminSocketIo ?? (typeof io !== 'undefined' ? { io } : {})
      if (io) {
        const socket = io('http://localhost:5000', { transports: ['websocket'] })
        socketRef.current = socket
        socket.on('queue:updated', fetchAll)
      }
    } catch { /* optional */ }

    return () => {
      clearInterval(interval)
      socketRef.current?.disconnect()
    }
  }, [])

  const handleRemove = async (queueId, passengerId, name) => {
    if (!window.confirm(`Remove ${name} from queue?`)) return
    setRemoving(passengerId)
    try {
      await adminRemovePassenger(queueId, passengerId)
      await fetchAll()
    } catch (err) {
      alert('Remove failed: ' + (err?.response?.data?.message ?? err.message))
    } finally {
      setRemoving(null)
    }
  }

  const filtered = allPassengers.filter(p => {
    const q = search.toLowerCase()
    return (
      !q ||
      (p.passengerName ?? '').toLowerCase().includes(q) ||
      (p.queueName ?? '').toLowerCase().includes(q) ||
      (p.status ?? '').toLowerCase().includes(q)
    )
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.title}>Passengers</h1>
          <p style={s.sub}>All passengers currently waiting across every queue. Updates every 8 seconds.</p>
        </div>
        <div style={s.headerRight}>
          <div style={statPill(online)}>
            {online ? <Users2 size={14} /> : <WifiOff size={14} />}
            {online ? `${allPassengers.length} live` : 'Offline'}
          </div>
          <button style={s.refreshBtn} onClick={fetchAll}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={s.searchWrap}>
        <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
        <input
          style={s.searchInput}
          placeholder="Search by name, queue, or status…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button style={s.clearBtn} onClick={() => setSearch('')}><X size={14} /></button>
        )}
      </div>

      {/* Stats */}
      {!loading && online && (
        <div style={s.statsRow}>
          <MiniStat label="Total waiting" value={allPassengers.length} />
          <MiniStat
            label="Your turn"
            value={allPassengers.filter(p => p.status === 'notified').length}
            color="#c2410c"
          />
          <MiniStat label="Showing" value={filtered.length} />
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p style={s.loadingText}>Loading passengers…</p>
      ) : !online ? (
        <div style={s.offlineBox}>
          <WifiOff size={24} style={{ marginBottom: 8, color: '#94a3b8' }} />
          <p style={{ margin: 0, fontWeight: 700 }}>Backend unreachable</p>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>
            Start the server with <code>npm run dev</code> in the Backend folder.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={s.emptyBox}>
          {search ? `No passengers matched "${search}"` : 'No passengers in any queue right now.'}
        </div>
      ) : (
        <div style={s.tableCard}>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['#', 'Name', 'Queue', 'Pickup', 'Destination', 'Status', 'Joined', 'Action'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const tone = STATUS_TONE[p.status] ?? STATUS_TONE.waiting
                  return (
                    <tr key={`${p.queueId}-${p.passengerId}`} style={s.row}>
                      <td style={s.tdNum}>{p.position}</td>
                      <td style={s.tdStrong}>{p.passengerName ?? '—'}</td>
                      <td style={s.tdQueue}>{p.queueName}</td>
                      <td style={s.td}>{p.pickupLabel ?? '—'}</td>
                      <td style={s.td}>{p.destinationLabel ?? '—'}</td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: tone.bg, color: tone.text }}>
                          {tone.label}
                        </span>
                      </td>
                      <td style={s.td}>{relativeTime(p.joinedAt)}</td>
                      <td style={s.tdAction}>
                        <button
                          style={s.removeBtn}
                          disabled={removing === p.passengerId}
                          onClick={() => handleRemove(p.queueId, p.passengerId, p.passengerName)}
                        >
                          {removing === p.passengerId ? '…' : <><X size={13} /> Remove</>}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MiniStat({ label, value, color = '#1d4ed8' }) {
  return (
    <div style={s.miniStat}>
      <span style={{ ...s.miniVal, color }}>{value}</span>
      <span style={s.miniLabel}>{label}</span>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const statPill = (online) => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700,
  background: online ? '#eff6ff' : '#fef2f2',
  color: online ? '#1d4ed8' : '#b91c1c',
  border: `1px solid ${online ? '#bfdbfe' : '#fecaca'}`,
})

const s = {
  headerRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0 },
  sub: { fontSize: 14, color: '#64748b', marginTop: 6, marginBottom: 0 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  refreshBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 10, background: 'white', borderRadius: 14, padding: '11px 16px', border: '1px solid #e2e8f0', marginBottom: 18, boxShadow: '0 2px 8px rgba(15,23,42,0.04)' },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#0f172a', background: 'transparent' },
  clearBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, borderRadius: 4, display: 'flex' },
  statsRow: { display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap' },
  miniStat: { display: 'flex', alignItems: 'center', gap: 8, background: 'white', borderRadius: 12, padding: '10px 16px', boxShadow: '0 2px 8px rgba(15,23,42,0.05)', border: '1px solid #e2e8f0' },
  miniVal: { fontSize: 18, fontWeight: 800 },
  miniLabel: { fontSize: 12, color: '#64748b', fontWeight: 600 },
  loadingText: { color: '#64748b', textAlign: 'center', paddingTop: 40 },
  offlineBox: { background: 'white', borderRadius: 20, padding: '40px 24px', textAlign: 'center', boxShadow: '0 4px 16px rgba(15,23,42,0.06)', color: '#0f172a' },
  emptyBox: { background: 'white', borderRadius: 16, padding: '28px 24px', textAlign: 'center', color: '#64748b', fontSize: 15, border: '1px solid #e2e8f0' },
  tableCard: { background: 'white', borderRadius: 20, boxShadow: '0 4px 20px rgba(15,23,42,0.06)', overflow: 'hidden' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 860 },
  th: { padding: '13px 18px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  row: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' },
  td: { padding: '14px 18px', fontSize: 13, color: '#475569', verticalAlign: 'middle' },
  tdNum: { padding: '14px 18px', fontSize: 15, fontWeight: 800, color: '#0f172a', width: 40 },
  tdStrong: { padding: '14px 18px', fontSize: 14, fontWeight: 700, color: '#0f172a' },
  tdQueue: { padding: '14px 18px', fontSize: 13, fontWeight: 600, color: '#1d4ed8' },
  tdAction: { padding: '14px 18px', width: 110 },
  badge: { display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 },
  removeBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
}
