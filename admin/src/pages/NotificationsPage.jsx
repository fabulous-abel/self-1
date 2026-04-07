import { useEffect, useState } from 'react'
import { Eye, Pencil, Send, Sparkles } from 'lucide-react'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { createBroadcastMessage, subscribeToBroadcastMessages, updateBroadcastMessage } from '../lib/broadcastService'
import { recordLocalActivity } from '../lib/localAdminStore'

const EMPTY_FORM = { target: 'both', message: '' }

export default function NotificationsPage() {
  const { user } = useAuth()
  const [broadcasts, setBroadcasts] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [editingBroadcast, setEditingBroadcast] = useState(null)
  const [selectedBroadcast, setSelectedBroadcast] = useState(null)

  useEffect(() => {
    return subscribeToBroadcastMessages({
      onBroadcasts: setBroadcasts,
      onError: (err) => setError(err?.message || 'Unable to sync broadcasts.'),
    })
  }, [])

  const openComposer = () => {
    setEditingBroadcast(null)
    setForm(EMPTY_FORM)
    setError('')
    setIsComposerOpen(true)
  }

  const openEditComposer = (item) => {
    setEditingBroadcast(item)
    setForm({ target: item.target, message: item.message })
    setError('')
    setSelectedBroadcast(null)
    setIsComposerOpen(true)
  }

  const closeComposer = () => {
    if (saving) return
    setIsComposerOpen(false)
    setEditingBroadcast(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)

    try {
      const item = editingBroadcast
        ? await updateBroadcastMessage(editingBroadcast.id, {
            message: form.message,
            target: form.target,
            updatedBy: user?.email,
          })
        : await createBroadcastMessage({
            message: form.message,
            target: form.target,
            createdBy: user?.email,
          })

      recordLocalActivity({
        kind: 'broadcast',
        title: editingBroadcast ? 'Broadcast updated' : 'Broadcast published',
        detail: `${editingBroadcast ? 'Updated' : 'Published'} a "${item.target}" broadcast: ${item.message}`,
      })

      setNotice(
        editingBroadcast
          ? `Broadcast updated for ${formatAudience(item.target)} through the backend.`
          : `Broadcast published for ${formatAudience(item.target)} through the backend.`
      )
      setIsComposerOpen(false)
      setEditingBroadcast(null)
      setForm(EMPTY_FORM)
    } catch (err) {
      setError(err?.message || 'Unable to save the broadcast.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Broadcast Center</h1>
          <p style={styles.sub}>Publish broadcast messages to driver and passenger apps with modal-based actions.</p>
        </div>

        <button type="button" onClick={openComposer} style={styles.primaryBtn}>
          <Sparkles size={18} /> New Broadcast
        </button>
      </div>

      <div style={styles.summaryRow}>
        <SummaryCard label="Live Broadcasts" value={broadcasts.length} />
        <SummaryCard label="Latest Audience" value={broadcasts[0] ? formatAudience(broadcasts[0].target) : 'None'} />
        <SummaryCard label="Last Published" value={broadcasts[0] ? formatDateTime(getBroadcastTimestamp(broadcasts[0])) : 'No broadcasts'} />
      </div>

      {notice ? <div style={styles.notice}>{notice}</div> : null}

      <div style={styles.tableCard}>
        <div style={styles.cardHeader}>
          <div style={styles.cardTitle}>Live Broadcasts</div>
          <div style={styles.cardSub}>Each row can be opened in a modal for full review before you edit and republish it.</div>
        </div>

        {broadcasts.length === 0 ? (
          <div style={styles.empty}>No broadcasts yet. Start from the "New Broadcast" modal.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Audience</th>
                  <th style={styles.th}>Message</th>
                  <th style={styles.th}>Published</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {broadcasts.map(item => (
                  <tr key={item.id} style={styles.row}>
                    <td style={styles.td}>
                      <span style={audienceBadge(item.target)}>{formatAudience(item.target)}</span>
                    </td>
                    <td style={styles.td}>{truncate(item.message, 88)}</td>
                    <td style={styles.td}>{formatDateTime(getBroadcastTimestamp(item))}</td>
                    <td style={styles.actionCell}>
                      <div style={styles.actionGroup}>
                        <button type="button" style={styles.ghostBtn} onClick={() => setSelectedBroadcast(item)}>
                          <Eye size={16} /> View
                        </button>
                        <button type="button" style={styles.editBtn} onClick={() => openEditComposer(item)}>
                          <Pencil size={16} /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={isComposerOpen}
        onClose={closeComposer}
        title={editingBroadcast ? 'Edit Broadcast' : 'Compose Broadcast'}
        subtitle={editingBroadcast ? 'Update the selected live broadcast.' : 'Publish a live broadcast for the selected audience.'}
        footer={(
          <div style={styles.modalFooter}>
            <button type="button" onClick={closeComposer} style={styles.secondaryBtn}>Cancel</button>
            <button type="submit" form="broadcast-form" disabled={saving} style={styles.primaryBtn}>
              <Send size={18} /> {saving ? 'Saving...' : editingBroadcast ? 'Update Broadcast' : 'Publish Broadcast'}
            </button>
          </div>
        )}
      >
        <form id="broadcast-form" onSubmit={handleSave}>
          <label style={styles.label}>Select Audience</label>
          <div style={styles.audienceRow}>
            {['both', 'passengers', 'drivers'].map(option => (
              <button
                key={option}
                type="button"
                style={audienceOption(form.target === option)}
                onClick={() => setForm(current => ({ ...current, target: option }))}
              >
                {formatAudience(option)}
              </button>
            ))}
          </div>

          <label style={styles.label}>Broadcast Message</label>
          <textarea
            value={form.message}
            onChange={event => setForm(current => ({ ...current, message: event.target.value }))}
            placeholder="Type the message you want driver and passenger apps to receive..."
            style={styles.textarea}
          />

          <div style={styles.previewCard}>
            <div style={styles.previewLabel}>Preview</div>
            <div style={styles.previewAudience}>{formatAudience(form.target)}</div>
            <div style={styles.previewText}>{form.message.trim() || 'Your draft preview will appear here.'}</div>
          </div>

          {error ? <div style={styles.error}>{error}</div> : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedBroadcast)}
        onClose={() => setSelectedBroadcast(null)}
        title={selectedBroadcast ? `Broadcast for ${formatAudience(selectedBroadcast.target)}` : 'Broadcast'}
        subtitle={selectedBroadcast ? `Last changed ${formatDateTime(getBroadcastTimestamp(selectedBroadcast))}` : ''}
        footer={(
          <div style={styles.modalFooter}>
            {selectedBroadcast ? (
              <button type="button" onClick={() => openEditComposer(selectedBroadcast)} style={styles.editBtn}>
                <Pencil size={16} /> Edit
              </button>
            ) : null}
            <button type="button" onClick={() => setSelectedBroadcast(null)} style={styles.secondaryBtn}>Close</button>
          </div>
        )}
        width={640}
      >
        {selectedBroadcast ? (
          <div style={styles.detailStack}>
            <div style={styles.detailCard}>
              <div style={styles.detailLabel}>Audience</div>
              <div style={styles.detailValue}>{formatAudience(selectedBroadcast.target)}</div>
            </div>

            <div style={styles.detailCard}>
              <div style={styles.detailLabel}>Message</div>
              <div style={styles.messageBody}>{selectedBroadcast.message}</div>
            </div>

            <div style={styles.detailCard}>
              <div style={styles.detailLabel}>Updated</div>
              <div style={styles.detailValue}>
                {selectedBroadcast.updatedAt ? formatDateTime(selectedBroadcast.updatedAt) : 'Not edited yet'}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
    </div>
  )
}

function formatAudience(target) {
  if (target === 'both') return 'Both Apps'
  if (target === 'passengers') return 'Passengers'
  if (target === 'drivers') return 'Drivers'
  return target
}

function formatDateTime(value) {
  if (!value) return 'Just now'

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Just now' : date.toLocaleString()
}

function getBroadcastTimestamp(item) {
  return item.updatedAt ?? item.createdAt
}

function truncate(value, length) {
  return value.length > length ? `${value.slice(0, length - 1)}...` : value
}

const audienceOption = (active) => ({
  flex: 1,
  padding: '14px',
  borderRadius: 12,
  border: `1.5px solid ${active ? '#0ea5e9' : '#dbeafe'}`,
  background: active ? '#e0f2fe' : '#f8fafc',
  color: active ? '#0369a1' : '#475569',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
})

const audienceBadge = (target) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background: target === 'drivers' ? '#eff6ff' : target === 'passengers' ? '#f0fdf4' : '#fff7ed',
  color: target === 'drivers' ? '#1d4ed8' : target === 'passengers' ? '#15803d' : '#c2410c',
})

const styles = {
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },
  sub: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 6,
    marginBottom: 0,
  },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 14,
    marginBottom: 20,
  },
  summaryCard: {
    background: 'white',
    borderRadius: 18,
    padding: '18px 20px',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  summaryValue: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: 800,
    color: '#0f172a',
  },
  notice: {
    marginBottom: 20,
    padding: '12px 14px',
    borderRadius: 12,
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
    fontSize: 13,
    fontWeight: 600,
  },
  tableCard: {
    background: 'white',
    borderRadius: 20,
    boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '22px 24px 18px',
    borderBottom: '1px solid #e2e8f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: '#0f172a',
  },
  cardSub: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748b',
  },
  empty: {
    padding: '42px 24px',
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 15,
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 720,
  },
  th: {
    padding: '14px 24px',
    fontSize: 12,
    fontWeight: 800,
    color: '#64748b',
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    background: '#f8fafc',
  },
  row: {
    borderTop: '1px solid #e2e8f0',
  },
  td: {
    padding: '18px 24px',
    fontSize: 14,
    color: '#334155',
    verticalAlign: 'top',
  },
  actionCell: {
    padding: '18px 24px',
    width: 220,
  },
  actionGroup: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  ghostBtn: {
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
  editBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #fcd34d',
    background: '#fef3c7',
    color: '#b45309',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '13px 18px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
    color: 'white',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '13px 18px',
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    background: 'white',
    color: '#334155',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    flexWrap: 'wrap',
  },
  label: {
    display: 'block',
    marginBottom: 10,
    fontSize: 13,
    fontWeight: 700,
    color: '#334155',
  },
  audienceRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  textarea: {
    width: '100%',
    minHeight: 140,
    padding: 14,
    borderRadius: 14,
    border: '1.5px solid #cbd5e1',
    fontSize: 15,
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  },
  previewCard: {
    marginTop: 18,
    padding: '18px',
    borderRadius: 16,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  previewAudience: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
  },
  previewText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 1.6,
    color: '#475569',
    whiteSpace: 'pre-wrap',
  },
  error: {
    marginTop: 16,
    padding: '12px 14px',
    borderRadius: 12,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    fontSize: 13,
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
  messageBody: {
    fontSize: 14,
    lineHeight: 1.7,
    color: '#334155',
    whiteSpace: 'pre-wrap',
  },
}
