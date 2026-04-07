import { useEffect, useMemo, useState } from 'react'
import { CarFront, Clock3, MapPin, Pencil, PhoneCall, Plus, Settings2, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import {
  createDispatchLocation,
  createLocationQueueRequest,
  deleteDispatchLocation,
  subscribeToDispatchLocations,
  subscribeToLocationDispatch,
  updateDispatchLocation,
} from '../lib/locationQueueService'

const EMPTY_REQUEST_FORM = {
  location: '',
  customerName: '',
  customerPhone: '',
  note: '',
}

const EMPTY_PLACE_FORM = {
  name: '',
}

export default function LocationsPage() {
  const { user } = useAuth()
  const [view, setView] = useState('dispatch')
  const [locations, setLocations] = useState([])
  const [location, setLocation] = useState('')
  const [drivers, setDrivers] = useState([])
  const [waitingPassengers, setWaitingPassengers] = useState([])
  const [requests, setRequests] = useState([])
  const [trips, setTrips] = useState([])
  const [requestForm, setRequestForm] = useState(EMPTY_REQUEST_FORM)
  const [placeForm, setPlaceForm] = useState(EMPTY_PLACE_FORM)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editingPlace, setEditingPlace] = useState(null)
  const [requestSaving, setRequestSaving] = useState(false)
  const [placeSaving, setPlaceSaving] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [placeError, setPlaceError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const unsubscribe = subscribeToDispatchLocations({
      onLocations: (items) => {
        setLocations(items)
        setSyncError('')
      },
      onError: (error) => setSyncError(error?.message || 'Unable to load place list.'),
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (locations.length === 0) {
      setLocation('')
      return
    }

    if (!location || !locations.some((item) => item.name === location)) {
      setLocation(locations[0].name)
    }

    setRequestForm((current) => {
      if (current.location && locations.some((item) => item.name === current.location)) {
        return current
      }

      return {
        ...current,
        location: locations[0].name,
      }
    })
  }, [locations, location])

  useEffect(() => {
    setSyncError('')

    const unsubscribe = subscribeToLocationDispatch(location, {
      onDrivers: setDrivers,
      onWaitingPassengers: setWaitingPassengers,
      onRequests: setRequests,
      onTrips: setTrips,
      onError: (error) => setSyncError(error?.message || 'Unable to load live location queues.'),
    })

    return unsubscribe
  }, [location])

  const driverRows = useMemo(() => {
    const tripByDriver = new Map(trips.map((trip) => [trip.driverPhone || trip.id, trip]))

    return drivers.map((driver) => {
      const trip = tripByDriver.get(driver.driverPhone)
      const passengerCount = trip?.passengers?.length || 0
      const capacity = trip?.capacity || 4

      return {
        ...driver,
        tripStatus: trip?.status || 'waiting',
        passengerCount,
        capacity,
        latestRequest: trip?.latestQueueRequest || null,
      }
    })
  }, [drivers, trips])

  const openRequestModal = () => {
    if (locations.length === 0) {
      setView('places')
      setNotice('Add a place first before creating phone queue requests.')
      return
    }

    setRequestForm({
      ...EMPTY_REQUEST_FORM,
      location: location || locations[0].name,
    })
    setRequestError('')
    setIsRequestModalOpen(true)
  }

  const closeRequestModal = () => {
    if (requestSaving) return
    setIsRequestModalOpen(false)
    setRequestError('')
  }

  const openCreatePlaceModal = () => {
    setEditingPlace(null)
    setPlaceForm(EMPTY_PLACE_FORM)
    setPlaceError('')
    setIsPlaceModalOpen(true)
  }

  const openEditPlaceModal = (place) => {
    setEditingPlace(place)
    setPlaceForm({ name: place.name })
    setPlaceError('')
    setIsPlaceModalOpen(true)
  }

  const closePlaceModal = () => {
    if (placeSaving) return
    setIsPlaceModalOpen(false)
    setEditingPlace(null)
    setPlaceError('')
  }

  const handleCreateRequest = async (event) => {
    event.preventDefault()
    setRequestError('')
    setNotice('')
    setRequestSaving(true)

    try {
      const result = await createLocationQueueRequest({
        location: requestForm.location,
        customerName: requestForm.customerName,
        customerPhone: requestForm.customerPhone,
        note: requestForm.note,
        requestedBy: user?.email,
      })

      setLocation(requestForm.location)
      setIsRequestModalOpen(false)
      setRequestForm({
        ...EMPTY_REQUEST_FORM,
        location: requestForm.location,
      })
      setNotice(
        result.matched
          ? `${requestForm.customerName.trim()} was sent to ${result.driverName} in ${result.location}.`
          : `${requestForm.customerName.trim()} was added to the ${result.location} queue. No waiting driver was available yet.`
      )
    } catch (error) {
      setRequestError(error?.message || 'Unable to add the customer to the queue.')
    } finally {
      setRequestSaving(false)
    }
  }

  const handleSavePlace = async (event) => {
    event.preventDefault()
    setPlaceError('')
    setNotice('')
    setPlaceSaving(true)

    try {
      if (editingPlace) {
        const updated = await updateDispatchLocation(editingPlace.id, placeForm.name)
        if (location === editingPlace.name) {
          setLocation(updated.name)
        }
        setNotice(`Place "${editingPlace.name}" was updated to "${updated.name}".`)
      } else {
        const created = await createDispatchLocation(placeForm.name)
        setLocation(created.name)
        setNotice(`Place "${created.name}" was added.`)
      }

      setIsPlaceModalOpen(false)
      setEditingPlace(null)
      setPlaceForm(EMPTY_PLACE_FORM)
    } catch (error) {
      setPlaceError(error?.message || 'Unable to save place.')
    } finally {
      setPlaceSaving(false)
    }
  }

  const handleDeletePlace = async () => {
    if (!deleteTarget) return

    setPlaceError('')
    setNotice('')
    setPlaceSaving(true)

    try {
      const deleted = await deleteDispatchLocation(deleteTarget.id)
      setDeleteTarget(null)
      if (location === deleted.name) {
        const remaining = locations.filter((item) => item.id !== deleted.id)
        setLocation(remaining[0]?.name || '')
      }
      setNotice(`Place "${deleted.name}" was deleted.`)
    } catch (error) {
      setPlaceError(error?.message || 'Unable to delete place.')
    } finally {
      setPlaceSaving(false)
    }
  }

  return (
    <div>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Location Dispatch</h1>
          <p style={styles.sub}>
            Use the dispatch board for phone queue requests, and the second tab to add, edit, or delete places like
            Terminal A and Corporate Exit.
          </p>
        </div>

        <div style={styles.headerActions}>
          {view === 'dispatch' ? (
            <button type="button" onClick={openRequestModal} style={styles.primaryBtn}>
              <Plus size={18} /> Add Phone Request
            </button>
          ) : (
            <button type="button" onClick={openCreatePlaceModal} style={styles.primaryBtn}>
              <Plus size={18} /> Add Place
            </button>
          )}
        </div>
      </div>

      <div style={styles.modeTabs}>
        <button type="button" onClick={() => setView('dispatch')} style={modeTabBtn(view === 'dispatch')}>
          <PhoneCall size={16} /> Dispatch Board
        </button>
        <button type="button" onClick={() => setView('places')} style={modeTabBtn(view === 'places')}>
          <Settings2 size={16} /> Manage Places
        </button>
      </div>

      {notice ? <div style={styles.notice}>{notice}</div> : null}
      {syncError ? <div style={styles.errorBanner}>{syncError}</div> : null}

      {view === 'dispatch' ? (
        <>
          {locations.length === 0 ? (
            <div style={styles.sectionCard}>
              <div style={styles.empty}>
                No places exist yet. Open the <b>Manage Places</b> tab and create one first.
              </div>
            </div>
          ) : (
            <>
              <div style={styles.tabBar}>
                {locations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLocation(item.name)}
                    style={tabBtn(location === item.name)}
                  >
                    <MapPin size={15} /> {item.name}
                  </button>
                ))}
              </div>

              <div style={styles.summaryRow}>
                <SummaryCard icon={<CarFront size={18} />} label="Drivers In Queue" value={driverRows.length} />
                <SummaryCard icon={<PhoneCall size={18} />} label="Waiting Callers" value={waitingPassengers.length} />
                <SummaryCard icon={<Clock3 size={18} />} label="Queued Requests" value={requests.filter((item) => item.status === 'queued').length} />
              </div>

              <div style={styles.grid}>
                <SectionCard
                  title={`Phone Requests for ${location}`}
                  subtitle="Every customer call added from admin is logged here."
                >
                  {requests.length === 0 ? (
                    <div style={styles.empty}>No phone requests logged for this location yet.</div>
                  ) : (
                    <div style={styles.tableWrap}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Customer</th>
                            <th style={styles.th}>Phone</th>
                            <th style={styles.th}>Driver</th>
                            <th style={styles.th}>Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {requests.map((item) => (
                            <tr key={item.id} style={styles.row}>
                              <td style={styles.td}>
                                <span style={statusPill(item.status)}>{formatStatus(item.status)}</span>
                              </td>
                              <td style={styles.tdStrong}>{item.customerName}</td>
                              <td style={styles.td}>{item.customerPhone}</td>
                              <td style={styles.td}>{item.matchedDriverName || 'Waiting for driver'}</td>
                              <td style={styles.td}>{formatDateTime(item.updatedAt || item.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title={`Drivers at ${location}`}
                  subtitle="Drivers already queued in this location are eligible for instant matching."
                >
                  {driverRows.length === 0 ? (
                    <div style={styles.empty}>No drivers are queued at this location right now.</div>
                  ) : (
                    <div style={styles.tableWrap}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Driver</th>
                            <th style={styles.th}>Vehicle</th>
                            <th style={styles.th}>Trip</th>
                            <th style={styles.th}>Passengers</th>
                            <th style={styles.th}>Latest Request</th>
                          </tr>
                        </thead>
                        <tbody>
                          {driverRows.map((driver) => (
                            <tr key={driver.id} style={styles.row}>
                              <td style={styles.tdStrong}>{driver.driverName}</td>
                              <td style={styles.td}>{driver.vehicleInfo}</td>
                              <td style={styles.td}>
                                <span style={tripStatusPill(driver.tripStatus)}>{formatStatus(driver.tripStatus)}</span>
                              </td>
                              <td style={styles.td}>{driver.passengerCount}/{driver.capacity}</td>
                              <td style={styles.td}>
                                {driver.latestRequest?.customerName
                                  ? `${driver.latestRequest.customerName} (${driver.latestRequest.customerPhone || 'no phone'})`
                                  : 'No recent match'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>
              </div>

              <SectionCard
                title={`Customers Still Waiting in ${location}`}
                subtitle="These callers are still queued because no open driver seat was found yet."
              >
                {waitingPassengers.length === 0 ? (
                  <div style={styles.empty}>Everyone for this location is either matched already or no phone requests have been added.</div>
                ) : (
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Customer</th>
                          <th style={styles.th}>Phone</th>
                          <th style={styles.th}>Note</th>
                          <th style={styles.th}>Added</th>
                        </tr>
                      </thead>
                      <tbody>
                        {waitingPassengers.map((item) => (
                          <tr key={item.id} style={styles.row}>
                            <td style={styles.tdStrong}>{item.customerName}</td>
                            <td style={styles.td}>{item.customerPhone}</td>
                            <td style={styles.td}>{item.note || 'No note'}</td>
                            <td style={styles.td}>{formatDateTime(item.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </>
          )}
        </>
      ) : (
        <SectionCard
          title="Manage Places"
          subtitle="Add, edit, or delete the location tabs used by the dispatch board."
        >
          {locations.length === 0 ? (
            <div style={styles.empty}>No places exist yet. Create the first one from the button above.</div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Place</th>
                    <th style={styles.th}>Created</th>
                    <th style={styles.th}>Updated</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((item) => (
                    <tr key={item.id} style={styles.row}>
                      <td style={styles.tdStrong}>{item.name}</td>
                      <td style={styles.td}>{formatDateTime(item.createdAt)}</td>
                      <td style={styles.td}>{formatDateTime(item.updatedAt || item.createdAt)}</td>
                      <td style={styles.actionCell}>
                        <div style={styles.actionGroup}>
                          <button type="button" onClick={() => openEditPlaceModal(item)} style={styles.editBtn}>
                            <Pencil size={16} /> Edit
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(item)} style={styles.deleteBtn}>
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      <Modal
        open={isRequestModalOpen}
        onClose={closeRequestModal}
        title="Add Customer To Location Queue"
        subtitle="Use this when a customer calls and needs to be inserted into the live queue by location."
        footer={(
          <div style={styles.modalFooter}>
            <button type="button" onClick={closeRequestModal} style={styles.secondaryBtn}>Cancel</button>
            <button type="submit" form="location-request-form" disabled={requestSaving} style={styles.primaryBtn}>
              <PhoneCall size={18} /> {requestSaving ? 'Adding...' : 'Add To Queue'}
            </button>
          </div>
        )}
      >
        <form id="location-request-form" onSubmit={handleCreateRequest}>
          <label style={styles.label}>Location</label>
          <div style={styles.locationPills}>
            {locations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setRequestForm((current) => ({ ...current, location: item.name }))}
                style={locationChoice(requestForm.location === item.name)}
              >
                {item.name}
              </button>
            ))}
          </div>

          <Field
            label="Customer Name"
            value={requestForm.customerName}
            onChange={(value) => setRequestForm((current) => ({ ...current, customerName: value }))}
            placeholder="Sam Karanja"
          />

          <Field
            label="Customer Phone"
            value={requestForm.customerPhone}
            onChange={(value) => setRequestForm((current) => ({ ...current, customerPhone: value }))}
            placeholder="+251912345678"
          />

          <div style={{ marginBottom: 14 }}>
            <label style={styles.label}>Driver Note</label>
            <textarea
              value={requestForm.note}
              onChange={(event) => setRequestForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="Pickup detail, landmark, or short queue note..."
              style={styles.textarea}
            />
          </div>

          <div style={styles.tipCard}>
            If a driver is already waiting in this location queue, this request is matched through the backend dispatch
            state immediately.
          </div>

          {requestError ? <div style={styles.errorBanner}>{requestError}</div> : null}
        </form>
      </Modal>

      <Modal
        open={isPlaceModalOpen}
        onClose={closePlaceModal}
        title={editingPlace ? 'Edit Place' : 'Add Place'}
        subtitle={editingPlace ? 'Rename an existing dispatch place.' : 'Create a new dispatch place tab.'}
        footer={(
          <div style={styles.modalFooter}>
            <button type="button" onClick={closePlaceModal} style={styles.secondaryBtn}>Cancel</button>
            <button type="submit" form="place-form" disabled={placeSaving} style={styles.primaryBtn}>
              {placeSaving ? 'Saving...' : editingPlace ? 'Update Place' : 'Create Place'}
            </button>
          </div>
        )}
        width={560}
      >
        <form id="place-form" onSubmit={handleSavePlace}>
          <Field
            label="Place Name"
            value={placeForm.name}
            onChange={(value) => setPlaceForm({ name: value })}
            placeholder="Terminal B"
          />

          <div style={styles.tipCard}>
            Editing a place renames the matching live queue data as well. Deleting a place is only allowed when no
            drivers, callers, or active trips are still using it.
          </div>

          {placeError ? <div style={styles.errorBanner}>{placeError}</div> : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !placeSaving && setDeleteTarget(null)}
        title="Delete Place"
        subtitle={deleteTarget ? `Remove "${deleteTarget.name}" from the dispatch tabs.` : ''}
        footer={(
          <div style={styles.modalFooter}>
            <button type="button" onClick={() => setDeleteTarget(null)} style={styles.secondaryBtn}>Cancel</button>
            <button type="button" onClick={handleDeletePlace} disabled={placeSaving} style={styles.dangerBtn}>
              <Trash2 size={16} /> {placeSaving ? 'Deleting...' : 'Delete Place'}
            </button>
          </div>
        )}
        width={520}
      >
        <div style={styles.confirmText}>
          This removes the place from the dispatch tab list. Deletion is blocked automatically if the place still has
          queued drivers, waiting callers, or active trips.
        </div>
        {placeError ? <div style={styles.errorBanner}>{placeError}</div> : null}
      </Modal>
    </div>
  )
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div style={styles.sectionCard}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitle}>{title}</div>
        <div style={styles.sectionSub}>{subtitle}</div>
      </div>
      {children}
    </div>
  )
}

function SummaryCard({ icon, label, value }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryIcon}>{icon}</div>
      <div>
        <div style={styles.summaryLabel}>{label}</div>
        <div style={styles.summaryValue}>{value}</div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={styles.label}>{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={styles.input}
      />
    </div>
  )
}

function formatStatus(value) {
  return value ? value.replace(/_/g, ' ') : 'unknown'
}

function formatDateTime(value) {
  if (!value) return 'Just now'
  if (typeof value.toDate === 'function') {
    return value.toDate().toLocaleString()
  }

  return new Date(value).toLocaleString()
}

const modeTabBtn = (active) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 16px',
  borderRadius: 14,
  border: `1px solid ${active ? '#bfdbfe' : '#e2e8f0'}`,
  background: active ? '#eff6ff' : 'white',
  color: active ? '#1d4ed8' : '#475569',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 800,
})

const tabBtn = (active) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '11px 16px',
  borderRadius: 999,
  border: `1px solid ${active ? '#bfdbfe' : '#e2e8f0'}`,
  background: active ? '#eff6ff' : 'white',
  color: active ? '#1d4ed8' : '#475569',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 700,
})

const locationChoice = (active) => ({
  padding: '12px 16px',
  borderRadius: 12,
  border: `1px solid ${active ? '#bfdbfe' : '#e2e8f0'}`,
  background: active ? '#eff6ff' : '#fff',
  color: active ? '#1d4ed8' : '#334155',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
})

const statusPill = (status) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: 999,
  background: status === 'matched' ? '#ecfdf3' : '#fff7ed',
  color: status === 'matched' ? '#15803d' : '#c2410c',
  fontSize: 12,
  fontWeight: 800,
  textTransform: 'capitalize',
})

const tripStatusPill = (status) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: 999,
  background: status === 'waiting' ? '#eff6ff' : status === 'moving' ? '#ecfeff' : '#f8fafc',
  color: status === 'waiting' ? '#1d4ed8' : status === 'moving' ? '#0f766e' : '#475569',
  fontSize: 12,
  fontWeight: 800,
  textTransform: 'capitalize',
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
  headerActions: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
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
    maxWidth: 780,
    lineHeight: 1.6,
  },
  modeTabs: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  tabBar: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  notice: {
    marginBottom: 16,
    padding: '12px 14px',
    borderRadius: 12,
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
    fontSize: 13,
    fontWeight: 600,
  },
  errorBanner: {
    marginTop: 16,
    padding: '12px 14px',
    borderRadius: 12,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    fontSize: 13,
  },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
    marginBottom: 18,
  },
  summaryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    background: 'white',
    borderRadius: 18,
    padding: '18px 20px',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: '#eff6ff',
    color: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  summaryValue: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: 800,
    color: '#0f172a',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: 18,
    marginBottom: 18,
  },
  sectionCard: {
    background: 'white',
    borderRadius: 20,
    boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)',
    overflow: 'hidden',
    marginBottom: 18,
  },
  sectionHeader: {
    padding: '22px 24px 18px',
    borderBottom: '1px solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: '#0f172a',
  },
  sectionSub: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.5,
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
    background: '#f8fafc',
    color: '#64748b',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  row: {
    borderTop: '1px solid #e2e8f0',
  },
  td: {
    padding: '18px 24px',
    fontSize: 14,
    color: '#475569',
    verticalAlign: 'top',
  },
  tdStrong: {
    padding: '18px 24px',
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
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
  empty: {
    padding: '30px 24px',
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 1.6,
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
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #fecaca',
    background: '#fef2f2',
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  dangerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '13px 18px',
    borderRadius: 12,
    border: 'none',
    background: '#dc2626',
    color: 'white',
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
    marginBottom: 8,
    fontSize: 13,
    fontWeight: 700,
    color: '#334155',
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1.5px solid #e2e8f0',
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    minHeight: 112,
    padding: 14,
    borderRadius: 12,
    border: '1.5px solid #e2e8f0',
    fontSize: 14,
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  },
  locationPills: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tipCard: {
    padding: '14px 16px',
    borderRadius: 14,
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1d4ed8',
    fontSize: 13,
    lineHeight: 1.6,
  },
  confirmText: {
    fontSize: 14,
    lineHeight: 1.7,
    color: '#475569',
  },
}
