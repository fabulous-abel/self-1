import { useEffect, useRef, useState } from 'react'
import { Users2, Eye, X, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import {
  listQueues,
  getQueueDetails,
  adminRemovePassenger,
  ensureAdminToken,
  createSocketConnection,
  syncQueueSubscriptions,
} from '../services/backendApi'

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  notified: { bg: '#fff7ed', text: '#c2410c', label: 'Your turn' },
  missed:   { bg: '#fef2f2', text: '#b91c1c', label: 'Missed' },
}

const TYPE_TONE = {
  Taxi: { bg: '#fff7ed', text: '#c2410c' },
  Bus:  { bg: '#eff6ff', text: '#1d4ed8' },
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function QueuesPage() {
  const [queues, setQueues] = useState([])
  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState(false)
  const [selectedQueue, setSelectedQueue] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [removing, setRemoving] = useState(null)
  const socketRef = useRef(null)

  // ── Polling fallback + Socket.IO live updates ──
  const fetchQueues = async () => {
    try {
      const data = await listQueues()
      setQueues(data)
      syncQueueSubscriptions(socketRef.current, data.map(queue => queue.id))
      setOnline(true)
    } catch {
      setOnline(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    ensureAdminToken()
    try {
      const socket = createSocketConnection()
      if (socket) {
        socketRef.current = socket
        socket.on('queue:updated', () => fetchQueues())
      }
    } catch { /* socket not available */ }
    fetchQueues()
    const interval = setInterval(fetchQueues, 8000)

    return () => {
      clearInterval(interval)
      socketRef.current?.disconnect()
    }
  }, [])

  const openDetail = async (queue) => {
    setSelectedQueue(queue)
    setDetail(null)
    setDetailLoading(true)
    try {
      const d = await getQueueDetails(queue.id)
      setDetail(d)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleRemove = async (queueId, passengerId, passengerName) => {
    if (!window.confirm(`Remove ${passengerName} from this queue?`)) return
    setRemoving(passengerId)
    try {
      await adminRemovePassenger(queueId, passengerId)
      // Refresh detail
      const d = await getQueueDetails(queueId)
      setDetail(d)
      await fetchQueues()
    } catch (err) {
      alert('Remove failed: ' + (err?.response?.data?.message ?? err.message))
    } finally {
      setRemoving(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.title}>Live Queues</h1>
          <p style={s.sub}>Real-time view of all active queues. Click a queue to manage its passengers.</p>
        </div>
        <div style={s.headerRight}>
          <div style={statusPill(online)}>
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
            {online ? 'Backend online' : 'Backend offline'}
          </div>
          <button style={s.refreshBtn} onClick={fetchQueues}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      {!loading && (
        <div style={s.statsRow}>
          <StatCard label="Total queues" value={queues.length} color="#1d4ed8" />
          <StatCard
            label="Total waiting"
            value={queues.reduce((n, q) => n + (q.waitingCount ?? 0), 0)}
            color="#15803d"
          />
          <StatCard
            label="Avg wait"
            value={queues.length
              ? `${Math.round(queues.reduce((n, q) => n + (q.averageWaitMinutes ?? 0), 0) / queues.length)} min`
              : '—'}
            color="#c2410c"
          />
        </div>
      )}

      {/* Queue cards */}
      {loading ? (
        <p style={s.loadingText}>Loading queues from backend…</p>
      ) : !online ? (
        <div style={s.offlineBox}>
          <WifiOff size={24} style={{ marginBottom: 8, color: '#94a3b8' }} />
          <p style={{ margin: 0, fontWeight: 700 }}>Backend unreachable</p>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>
            Start the server with <code>npm run dev</code> in the Backend folder.
          </p>
        </div>
      ) : (
        <div style={s.grid}>
          {queues.map(q => (
            <QueueCard key={q.id} queue={q} onView={() => openDetail(q)} />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedQueue && (
        <div style={s.overlay} onClick={() => setSelectedQueue(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={s.modalTitle}>{selectedQueue.name}</div>
                <div style={s.modalSub}>{selectedQueue.type} queue · {selectedQueue.waitingCount ?? 0} waiting</div>
              </div>
              <button style={s.closeBtn} onClick={() => setSelectedQueue(null)}><X size={18} /></button>
            </div>

            {detailLoading ? (
              <p style={{ padding: '24px', color: '#64748b' }}>Loading entries…</p>
            ) : !detail ? (
              <p style={{ padding: '24px', color: '#ef4444' }}>Failed to load queue details.</p>
            ) : detail.entries.length === 0 ? (
              <p style={{ padding: '24px', color: '#64748b' }}>No passengers in this queue.</p>
            ) : (
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['#', 'Name', 'Pickup', 'Destination', 'Status', 'Joined', 'Action'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.entries.map(entry => {
                      const tone = STATUS_TONE[entry.status] ?? STATUS_TONE.waiting
                      return (
                        <tr key={entry.passengerId} style={s.row}>
                          <td style={s.tdNum}>{entry.position}</td>
                          <td style={s.tdStrong}>{entry.passengerName ?? '—'}</td>
                          <td style={s.td}>{entry.pickupLabel ?? '—'}</td>
                          <td style={s.td}>{entry.destinationLabel ?? '—'}</td>
                          <td style={s.td}>
                            <span style={{ ...s.badge, background: tone.bg, color: tone.text }}>
                              {tone.label}
                            </span>
                          </td>
                          <td style={s.td}>{relativeTime(entry.joinedAt)}</td>
                          <td style={s.tdAction}>
                            <button
                              style={s.removeBtn}
                              disabled={removing === entry.passengerId}
                              onClick={() => handleRemove(selectedQueue.id, entry.passengerId, entry.passengerName)}
                            >
                              {removing === entry.passengerId ? '…' : <><X size={14} /> Remove</>}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function QueueCard({ queue, onView }) {
  const typeTone = TYPE_TONE[queue.type] ?? { bg: '#f1f5f9', text: '#475569' }
  const fillPct = queue.capacity > 0
    ? Math.min(100, Math.round((queue.waitingCount / queue.capacity) * 100))
    : 0

  return (
    <div style={s.card}>
      <div style={s.cardTop}>
        <div style={s.cardName}>{queue.name}</div>
        <span style={{ ...s.typeBadge, background: typeTone.bg, color: typeTone.text }}>
          {queue.type}
        </span>
      </div>

      <div style={s.statsLine}>
        <Stat label="Waiting" value={queue.waitingCount ?? 0} icon={<Users2 size={13} />} />
        <Stat label="Capacity" value={queue.capacity ?? '—'} />
        <Stat label="Avg wait" value={`${queue.averageWaitMinutes ?? '?'} min`} />
      </div>

      <div style={s.barBg}>
        <div style={{ ...s.barFill, width: `${fillPct}%`, background: fillPct > 80 ? '#ef4444' : '#1d4ed8' }} />
      </div>
      <div style={s.barLabel}>{fillPct}% full</div>

      <button style={s.viewBtn} onClick={onView}>
        <Eye size={15} /> View &amp; Manage
      </button>
    </div>
  )
}

function Stat({ label, value, icon }) {
  return (
    <div style={s.stat}>
      <div style={s.statVal}>{icon} {value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={s.statCard}>
      <div style={{ ...s.statCardVal, color }}>{value}</div>
      <div style={s.statCardLabel}>{label}</div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const statusPill = (online) => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700,
  background: online ? '#f0fdf4' : '#fef2f2',
  color: online ? '#15803d' : '#b91c1c',
  border: `1px solid ${online ? '#bbf7d0' : '#fecaca'}`,
})

const s = {
  headerRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0 },
  sub: { fontSize: 14, color: '#64748b', marginTop: 6, marginBottom: 0 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  refreshBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  statsRow: { display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' },
  statCard: { flex: '1 1 140px', background: 'white', borderRadius: 18, padding: '18px 20px', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' },
  statCardVal: { fontSize: 26, fontWeight: 800, marginBottom: 6 },
  statCardLabel: { fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' },
  loadingText: { color: '#64748b', textAlign: 'center', paddingTop: 40 },
  offlineBox: { background: 'white', borderRadius: 20, padding: '40px 24px', textAlign: 'center', boxShadow: '0 4px 16px rgba(15,23,42,0.06)', color: '#0f172a' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 },
  card: { background: 'white', borderRadius: 20, padding: 22, boxShadow: '0 4px 20px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', gap: 14 },
  cardTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  cardName: { fontSize: 16, fontWeight: 800, color: '#0f172a', lineHeight: 1.3 },
  typeBadge: { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, flexShrink: 0 },
  statsLine: { display: 'flex', gap: 16 },
  stat: { display: 'flex', flexDirection: 'column', gap: 2 },
  statVal: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 16, fontWeight: 800, color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: 600 },
  barBg: { height: 6, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999, transition: 'width 0.4s ease' },
  barLabel: { fontSize: 11, color: '#64748b', fontWeight: 600 },
  viewBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 12, border: '1px solid #dbeafe', background: '#eff6ff', color: '#1d4ed8', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 'auto' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal: { background: 'white', borderRadius: 24, width: '100%', maxWidth: 860, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(15,23,42,0.2)' },
  modalHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 28px 20px', borderBottom: '1px solid #e2e8f0' },
  modalTitle: { fontSize: 20, fontWeight: 800, color: '#0f172a' },
  modalSub: { fontSize: 14, color: '#64748b', marginTop: 4 },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 6, borderRadius: 8 },
  tableWrap: { overflowY: 'auto', flex: 1 },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 640 },
  th: { padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  row: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '14px 20px', fontSize: 13, color: '#475569', verticalAlign: 'middle' },
  tdNum: { padding: '14px 20px', fontSize: 15, fontWeight: 800, color: '#0f172a', width: 40 },
  tdStrong: { padding: '14px 20px', fontSize: 14, fontWeight: 700, color: '#0f172a' },
  tdAction: { padding: '14px 20px', width: 110 },
  badge: { display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 },
  removeBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
}
