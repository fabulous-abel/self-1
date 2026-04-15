import { useEffect, useState } from 'react'
import { Eye, Pencil, Plus } from 'lucide-react'
import Modal from '../components/Modal'
import { recordLocalActivity } from '../lib/localAdminStore'
import { buildManagedAuthEmail, createManagedUser, subscribeToManagedUsers, updateManagedUser } from '../lib/userDirectoryService'

const EMPTY_FORM = { name: '', phone: '', email: '', password: '', vehicle: '' }

export default function UsersPage() {
  const [tab, setTab] = useState('drivers')
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)

  const role = tab === 'drivers' ? 'driver' : 'passenger'
  const authEmailPreview = buildManagedAuthEmail(role, form.phone)

  useEffect(() => {
    setError('')
    return subscribeToManagedUsers(role, {
      onUsers: setUsers,
      onError: (err) => setError(err?.message || 'Unable to load users from the backend.'),
    })
  }, [role])

  const openCreateModal = () => {
    setEditingUser(null)
    setForm(EMPTY_FORM)
    setError('')
    setIsCreateOpen(true)
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setForm(toFormValues(user))
    setError('')
    setSelectedUser(null)
    setIsCreateOpen(true)
  }

  const closeCreateModal = () => {
    if (loading) return
    setIsCreateOpen(false)
    setEditingUser(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    try {
      const user = editingUser
        ? await updateManagedUser(editingUser, form)
        : await createManagedUser(role, form)

      recordLocalActivity({
        kind: 'user',
        title: editingUser ? 'Managed user updated' : 'Managed user created',
        detail: `${user.fullName} was ${editingUser ? 'updated in' : 'added to'} the backend ${role} directory.`,
      })

      setNotice(
        editingUser
          ? `${role === 'driver' ? 'Driver' : 'Passenger'} "${user.fullName}" updated in the backend directory.`
          : `${role === 'driver' ? 'Driver' : 'Passenger'} "${user.fullName}" created in the backend directory.`
      )
      setForm(EMPTY_FORM)
      setEditingUser(null)
      setIsCreateOpen(false)
    } catch (err) {
      setError(err?.message || 'Unable to save the backend user record.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header-row" style={styles.headerRow}>
        <div>
          <h1 className="page-title" style={styles.title}>User Records</h1>
          <p className="page-sub" style={styles.sub}>Create backend-managed driver and passenger records, then review the saved profile details in modal flows.</p>
        </div>

        <button type="button" onClick={openCreateModal} className="primary-btn" style={styles.primaryBtn}>
          <Plus size={18} /> New {tab === 'drivers' ? 'Driver' : 'Passenger'}
        </button>
      </div>

      <div className="tab-bar" style={styles.tabBar}>
        <button type="button" onClick={() => setTab('drivers')} style={tabBtn(tab === 'drivers')}>Drivers</button>
        <button type="button" onClick={() => setTab('passengers')} style={tabBtn(tab === 'passengers')}>Passengers</button>
      </div>

      {notice ? <div style={styles.success}>{notice}</div> : null}
      {!isCreateOpen && error ? <div style={styles.errorBanner}>{error}</div> : null}

      <div className="table-card" style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <h3 style={styles.cardTitle}>
            {tab === 'drivers' ? 'Drivers' : 'Passengers'} ({users.length})
          </h3>
          <div style={styles.tableSub}>Each record here comes from the backend user directory and keeps the same phone-based format used across the apps.</div>
        </div>

        {users.length === 0 ? (
          <p style={styles.empty}>No {tab} in the backend directory yet.</p>
        ) : (
          <div style={styles.tableWrap}>
            <table className="responsive-table" style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Vehicle</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={styles.row}>
                    <td style={styles.tdStrong}>{user.fullName ?? '-'}</td>
                    <td style={styles.td}>{user.phoneNumber}</td>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>{user.vehicleInfo || '-'}</td>
                    <td style={styles.td}>{formatDateTime(user.createdAt)}</td>
                    <td style={styles.actionCell}>
                      <div className="action-group" style={styles.actionGroup}>
                        <button type="button" style={styles.viewBtn} onClick={() => setSelectedUser(user)}>
                          <Eye size={16} /> View
                        </button>
                        <button type="button" style={styles.editBtn} onClick={() => openEditModal(user)}>
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
        open={isCreateOpen}
        onClose={closeCreateModal}
        title={`${editingUser ? 'Edit' : 'Create'} ${tab === 'drivers' ? 'Driver' : 'Passenger'} Record`}
        subtitle={editingUser ? 'Update the saved profile fields for the selected backend user.' : 'Create a backend-managed user record for operational use in the admin tools.'}
        footer={(
          <div className="modal-footer" style={styles.modalFooter}>
            <button type="button" onClick={closeCreateModal} style={styles.secondaryBtn}>Cancel</button>
            <button type="submit" form="user-form" disabled={loading} style={styles.primaryBtn}>
              {loading ? 'Saving...' : editingUser ? `Update ${tab === 'drivers' ? 'Driver' : 'Passenger'}` : `Create ${tab === 'drivers' ? 'Driver' : 'Passenger'}`}
            </button>
          </div>
        )}
      >
        <form id="user-form" onSubmit={handleSave}>
          <Field label="Full Name" value={form.name} onChange={value => setForm(current => ({ ...current, name: value }))} placeholder="Dawit Alemu" />
          <Field
            label="Phone Number"
            value={form.phone}
            onChange={value => setForm(current => ({ ...current, phone: value }))}
            placeholder="0912345678"
            readOnly={Boolean(editingUser)}
          />
          <Field
            label="Auth Email"
            value={editingUser?.email ?? authEmailPreview}
            placeholder="Generated from the phone number"
            type="email"
            readOnly
          />
          {!editingUser ? (
            <Field
              label="Password"
              value={form.password}
              onChange={value => setForm(current => ({ ...current, password: value }))}
              placeholder="Minimum 6 characters"
              type="password"
            />
          ) : (
            <div style={styles.helperNote}>
              Phone, auth email, and password changes are not supported from the admin app yet. You can update the saved profile fields here.
            </div>
          )}
          {tab === 'drivers' ? (
            <Field label="Vehicle Info" value={form.vehicle} onChange={value => setForm(current => ({ ...current, vehicle: value }))} placeholder="Toyota Vitz - AA 67890" />
          ) : null}

          {error ? <div style={styles.error}>{error}</div> : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title={selectedUser?.fullName ?? 'User Details'}
        subtitle={selectedUser ? `${selectedUser.role} - ${formatDateTime(selectedUser.createdAt)}` : ''}
        footer={(
          <div style={styles.modalFooter}>
            {selectedUser ? (
              <button type="button" onClick={() => openEditModal(selectedUser)} style={styles.editBtn}>
                <Pencil size={16} /> Edit
              </button>
            ) : null}
            <button type="button" onClick={() => setSelectedUser(null)} style={styles.secondaryBtn}>Close</button>
          </div>
        )}
        width={640}
      >
        {selectedUser ? (
          <div className="detail-grid" style={styles.detailGrid}>
            <DetailCard label="Phone" value={selectedUser.phoneNumber} />
            <DetailCard label="Email" value={selectedUser.email} />
            <DetailCard label="Role" value={selectedUser.role} />
            <DetailCard label="Source" value={selectedUser.source || 'admin'} />
            <DetailCard label="Vehicle" value={selectedUser.vehicleInfo || 'Not assigned'} />
            <DetailCard label="Created" value={formatDateTime(selectedUser.createdAt)} />
            <DetailCard label="Updated" value={selectedUser.updatedAt ? formatDateTime(selectedUser.updatedAt) : 'Not edited yet'} />
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function DetailCard({ label, value }) {
  return (
    <div style={styles.detailCard}>
      <div style={styles.detailLabel}>{label}</div>
      <div style={styles.detailValue}>{value}</div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', readOnly = false }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={event => onChange?.(event.target.value)}
        placeholder={placeholder}
        style={inputStyle(readOnly)}
        readOnly={readOnly}
      />
    </div>
  )
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : 'Just now'
}

function toFormValues(user) {
  return {
    name: user.fullName ?? '',
    phone: user.phoneNumber ?? '',
    email: user.email ?? '',
    password: '',
    vehicle: user.vehicleInfo ?? '',
  }
}

const tabBtn = (active) => ({
  padding: '11px 24px',
  borderRadius: 999,
  border: `1px solid ${active ? '#bfdbfe' : '#e2e8f0'}`,
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 14,
  background: active ? '#eff6ff' : '#ffffff',
  color: active ? '#1d4ed8' : '#64748b',
})

const inputStyle = (readOnly) => ({
  ...styles.input,
  background: readOnly ? '#f8fafc' : 'white',
  color: readOnly ? '#64748b' : '#0f172a',
  cursor: readOnly ? 'not-allowed' : 'text',
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
  tabBar: { display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' },
  tableCard: {
    background: 'white',
    borderRadius: 20,
    boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)',
    overflow: 'hidden',
  },
  tableHeader: {
    padding: '22px 24px 18px',
    borderBottom: '1px solid #e2e8f0',
  },
  cardTitle: { fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 },
  tableSub: { marginTop: 6, fontSize: 13, color: '#64748b' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 },
  input: { display: 'block', width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' },
  error: { padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 12 },
  errorBanner: { padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, color: '#dc2626', fontSize: 13, marginBottom: 18, fontWeight: 600 },
  success: { padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, color: '#16a34a', fontSize: 13, marginBottom: 18, fontWeight: 600 },
  helperNote: { padding: '10px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, color: '#1d4ed8', fontSize: 13, marginBottom: 14, lineHeight: 1.5 },
  empty: { color: '#94a3b8', fontSize: 14, padding: '28px 24px' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 860 },
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
  row: { borderTop: '1px solid #e2e8f0' },
  td: { padding: '18px 24px', fontSize: 14, color: '#475569', verticalAlign: 'top' },
  tdStrong: { padding: '18px 24px', fontSize: 14, fontWeight: 700, color: '#0f172a', verticalAlign: 'top' },
  actionCell: { padding: '18px 24px', width: 220, verticalAlign: 'top' },
  actionGroup: { display: 'flex', gap: 10, flexWrap: 'wrap' },
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
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
    fontSize: 15,
    lineHeight: 1.6,
    fontWeight: 700,
    color: '#0f172a',
  },
}
