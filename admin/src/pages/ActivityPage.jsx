import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import Modal from '../components/Modal'
import { getActivity, subscribeToLocalAdminStore } from '../lib/localAdminStore'

const FILTERS = [
  { key: 'all', label: 'All Events' },
  { key: 'auth', label: 'Auth' },
  { key: 'user', label: 'Users' },
  { key: 'broadcast', label: 'Broadcasts' },
  { key: 'system', label: 'System' },
]

export default function ActivityPage() {
  const [events, setEvents] = useState([])
  const [tab, setTab] = useState('all')
  const [selectedEvent, setSelectedEvent] = useState(null)

  useEffect(() => {
    const syncEvents = () => {
      setEvents(getActivity())
    }

    syncEvents()
    return subscribeToLocalAdminStore(syncEvents)
  }, [])

  const filteredEvents = tab === 'all' ? events : events.filter(event => event.kind === tab)

  return (
    <div>
      <div className="page-header-row" style={styles.headerRow}>
        <div>
          <h1 className="page-title" style={styles.title}>Admin Activity Feed</h1>
          <p className="page-sub" style={styles.sub}>Use tabs to inspect each event stream, then open any row in a modal for full detail.</p>
        </div>

        <div className="summary-card" style={styles.statsCard}>
          <div style={styles.statsLabel}>Total Events</div>
          <div className="summary-value" style={styles.statsValue}>{events.length}</div>
        </div>
      </div>

      <div className="tab-bar" style={styles.tabBar}>
        {FILTERS.map(filter => {
          const count = filter.key === 'all'
            ? events.length
            : events.filter(event => event.kind === filter.key).length

          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setTab(filter.key)}
              style={tabBtn(tab === filter.key)}
            >
              {filter.label}
              <span style={tabCount(tab === filter.key)}>{count}</span>
            </button>
          )
        })}
      </div>

      {filteredEvents.length === 0 ? (
        <div style={styles.empty}>
          No activity in this tab yet. Saved broadcasts and created user records will appear here.
        </div>
      ) : null}

      <div className="table-card" style={styles.tableCard}>
        <div style={styles.tableWrap}>
          <table className="responsive-table" style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Detail</th>
                <th style={styles.th}>Time</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map(event => (
                <ActivityRow key={event.id} event={event} onView={() => setSelectedEvent(event)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title ?? 'Activity Event'}
        subtitle={selectedEvent ? `${labelForKind(selectedEvent.kind)} - ${formatDateTime(selectedEvent.createdAt)}` : ''}
        footer={(
          <div className="modal-footer" style={styles.modalFooter}>
            <button type="button" onClick={() => setSelectedEvent(null)} style={styles.closeBtn}>Close</button>
          </div>
        )}
        width={640}
      >
        {selectedEvent ? (
          <div style={styles.detailStack}>
            <div style={styles.detailCard}>
              <div style={styles.detailLabel}>Type</div>
              <div style={styles.detailValue}>{labelForKind(selectedEvent.kind)}</div>
            </div>
            <div style={styles.detailCard}>
              <div style={styles.detailLabel}>Description</div>
              <div style={styles.detailText}>{selectedEvent.detail}</div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function ActivityRow({ event, onView }) {
  const tone = tones[event.kind] ?? tones.system

  return (
    <tr style={styles.row}>
      <td style={styles.td}>
        <span style={{ ...styles.badge, background: tone.bg, color: tone.text }}>
          {tone.label}
        </span>
      </td>
      <td style={styles.tdStrong}>{event.title}</td>
      <td style={styles.td}>{truncate(event.detail, 90)}</td>
      <td style={styles.td}>{formatDateTime(event.createdAt)}</td>
      <td style={styles.actionCell}>
        <button type="button" onClick={onView} style={styles.viewBtn}>
          <Eye size={16} /> View
        </button>
      </td>
    </tr>
  )
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : 'Just now'
}

function labelForKind(kind) {
  return (tones[kind] ?? tones.system).label
}

function truncate(value, length) {
  return value.length > length ? `${value.slice(0, length - 1)}...` : value
}

const tones = {
  auth: { bg: '#eff6ff', text: '#1d4ed8', label: 'Auth' },
  user: { bg: '#f0fdf4', text: '#15803d', label: 'User' },
  broadcast: { bg: '#fff7ed', text: '#c2410c', label: 'Broadcast' },
  system: { bg: '#f8fafc', text: '#475569', label: 'System' },
}

const tabBtn = (active) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  padding: '11px 16px',
  borderRadius: 999,
  border: `1px solid ${active ? '#bfdbfe' : '#e2e8f0'}`,
  background: active ? '#eff6ff' : 'white',
  color: active ? '#1d4ed8' : '#475569',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: 'nowrap',
})

const tabCount = (active) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 24,
  height: 24,
  padding: '0 8px',
  borderRadius: 999,
  background: active ? '#dbeafe' : '#f1f5f9',
  color: active ? '#1d4ed8' : '#64748b',
  fontSize: 12,
  fontWeight: 800,
})

const styles = {
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  title: { fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0 },
  sub: { fontSize: 14, color: '#64748b', marginTop: 6, marginBottom: 0, maxWidth: 640 },
  statsCard: {
    minWidth: 160,
    background: 'white',
    borderRadius: 18,
    padding: '18px 20px',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
  },
  statsLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  statsValue: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: 800,
    color: '#0f172a',
  },
  tabBar: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  empty: {
    padding: '20px 24px',
    background: '#ffffff',
    borderRadius: 16,
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 15,
    marginBottom: 18,
  },
  tableCard: {
    background: 'white',
    borderRadius: 20,
    boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)',
    overflow: 'hidden',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 780,
  },
  th: {
    padding: '14px 22px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 800,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    background: '#f8fafc',
  },
  row: {
    borderTop: '1px solid #e2e8f0',
  },
  td: {
    padding: '18px 22px',
    fontSize: 14,
    color: '#475569',
    verticalAlign: 'top',
  },
  tdStrong: {
    padding: '18px 22px',
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
    verticalAlign: 'top',
  },
  actionCell: {
    padding: '18px 22px',
    width: 120,
    verticalAlign: 'top',
  },
  badge: {
    fontSize: 12,
    fontWeight: 700,
    padding: '6px 10px',
    borderRadius: 999,
    display: 'inline-flex',
  },
  viewBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #dbeafe',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  closeBtn: {
    padding: '13px 18px',
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    background: 'white',
    color: '#334155',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  detailStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  detailCard: {
    padding: '18px',
    borderRadius: 16,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
  },
  detailText: {
    fontSize: 14,
    lineHeight: 1.7,
    color: '#334155',
    whiteSpace: 'pre-wrap',
  },
}
