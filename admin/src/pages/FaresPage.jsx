import { useEffect, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { getFareSettings, updateFareSettings } from '../services/backendApi'
import { subscribeToDispatchLocations } from '../lib/locationQueueService'

export default function FaresPage() {
  const [fares, setFares] = useState({
    currency: 'ETB',
    platformCommissionPercent: 10,
    routeFares: [],
  })
  
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  
  const [newRoute, setNewRoute] = useState({ pickup: '', offboarding: '', amount: '' })

  useEffect(() => {
    loadFares()
    
    const unsubscribeLocations = subscribeToDispatchLocations({
      onLocations: (items) => {
        setLocations(items || [])
        if (items && items.length > 0 && !newRoute.pickup) {
          setNewRoute((prev) => ({ ...prev, pickup: items[0].name }))
        }
      },
    })
    
    return () => {
      unsubscribeLocations()
    }
  }, [])
  
  useEffect(() => {
    if (locations.length > 0 && !newRoute.pickup) {
      setNewRoute((prev) => ({ ...prev, pickup: locations[0].name }))
    }
  }, [locations])

  async function loadFares() {
    setLoading(true)
    setError('')
    try {
      const data = await getFareSettings()
      setFares({
        currency: data.currency || 'ETB',
        platformCommissionPercent: data.platformCommissionPercent || 10,
        routeFares: data.routeFares || [],
      })
    } catch (err) {
      setError(err?.message || 'Unable to load fare configurations.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFares((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddRoute = () => {
    if (!newRoute.pickup?.trim() || !newRoute.offboarding?.trim() || !newRoute.amount) {
      setError('Please fill all route fields.')
      return
    }
    setError('')
    
    const newRouteItem = {
      id: 'route_' + Math.random().toString(36).substr(2, 9),
      pickup: newRoute.pickup.trim(),
      offboarding: newRoute.offboarding.trim(),
      amount: Number(newRoute.amount)
    }
    
    setFares((prev) => ({
      ...prev,
      routeFares: [newRouteItem, ...prev.routeFares],
    }))
    
    setNewRoute({ pickup: locations[0]?.name || '', offboarding: '', amount: '' })
  }

  const handleRemoveRoute = (id) => {
    setFares((prev) => ({
      ...prev,
      routeFares: prev.routeFares.filter(r => r.id !== id),
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const updated = await updateFareSettings({
        currency: fares.currency,
        platformCommissionPercent: Number(fares.platformCommissionPercent),
        routeFares: fares.routeFares,
      })
      
      setFares({
        currency: updated.currency || 'ETB',
        platformCommissionPercent: updated.platformCommissionPercent || 10,
        routeFares: updated.routeFares || [],
      })
      setNotice('Fare routes updated successfully.')
    } catch (err) {
      setError(err?.message || 'Unable to update fare configurations.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <h1 style={styles.title}>Fare Management</h1>
        <p style={styles.sub}>Loading fare configurations...</p>
      </div>
    )
  }

  return (
    <div>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Route Fares Configuration</h1>
          <p style={styles.sub}>
            Manage fixed point-to-point pricing combinations based on dispatch pick-up zones and custom offboarding places.
          </p>
        </div>
      </div>

      {notice ? <div style={styles.notice}>{notice}</div> : null}
      {error ? <div style={styles.errorBanner}>{error}</div> : null}

      <div style={styles.grid}>
        {/* Route Fares Section */}
        <div style={{...styles.sectionCard, gridColumn: '1 / -1'}}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>Point-to-Point Routes</div>
            <div style={styles.sectionSub}>Add the default prices charged when passenger travels between these zones.</div>
          </div>
          
          <div style={{ padding: '24px 24px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
             <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 140px auto', gap: 12, alignItems: 'end' }}>
                <div>
                   <label style={styles.label}>Origin (Pick-up)</label>
                   <select 
                     value={newRoute.pickup} 
                     onChange={(e) => setNewRoute({...newRoute, pickup: e.target.value})}
                     style={styles.input}
                   >
                     {locations.map(loc => <option key={loc.id} value={loc.name}>{loc.name}</option>)}
                     <option value="*Custom">-- Custom text --</option>
                   </select>
                   {newRoute.pickup === '*Custom' && (
                     <input 
                       placeholder="Type origin..." 
                       autoFocus
                       style={{...styles.input, marginTop: 8}}
                       onChange={(e) => setNewRoute({...newRoute, pickup: e.target.value})}
                     />
                   )}
                </div>
                <div>
                   <label style={styles.label}>Destination (Offboarding)</label>
                   <input
                     value={newRoute.offboarding}
                     onChange={(e) => setNewRoute({...newRoute, offboarding: e.target.value})}
                     placeholder="e.g. City Center"
                     style={styles.input}
                   />
                </div>
                <div>
                   <label style={styles.label}>Fare Amount</label>
                   <div style={{position: 'relative'}}>
                     <input
                       type="number"
                       value={newRoute.amount}
                       onChange={(e) => setNewRoute({...newRoute, amount: e.target.value})}
                       placeholder="400"
                       style={{...styles.input, paddingRight: 45}}
                     />
                     <span style={{position: 'absolute', right: 12, top: 12, fontSize: 13, color: '#94a3b8', fontWeight: 600}}>{fares.currency}</span>
                   </div>
                </div>
                <div>
                   <button onClick={handleAddRoute} style={{...styles.primaryBtn, padding: '12px 16px', marginBottom: 2}}>
                     <Plus size={16} /> Add
                   </button>
                </div>
             </div>
          </div>
          
          <div style={{ padding: '0px' }}>
             <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Origin</th>
                      <th style={styles.th}>Destination</th>
                      <th style={styles.th}>Cost</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fares.routeFares.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={styles.empty}>No fixed routes configured. Add one above.</td>
                      </tr>
                    ) : fares.routeFares.map(route => (
                       <tr key={route.id} style={styles.row}>
                         <td style={styles.tdStrong}>{route.pickup}</td>
                         <td style={styles.tdStrong}>{route.offboarding}</td>
                         <td style={styles.td}>{route.amount} <span style={{fontSize: 12, color: '#94a3b8', marginLeft: 4}}>{fares.currency}</span></td>
                         <td style={styles.td}>
                           <button onClick={() => handleRemoveRoute(route.id)} style={styles.deleteBtn}>
                             <Trash2 size={16}/> Remove
                           </button>
                         </td>
                       </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        </div>

        {/* Global Multipliers Section */}
        <div style={styles.sectionCard}>
           <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>Global Economy</div>
            <div style={styles.sectionSub}>Currency and platform commission.</div>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={styles.fieldRow}>
               <label style={styles.label}>Currency Code</label>
               <input
                 type="text"
                 value={fares.currency}
                 onChange={(e) => handleChange('currency', e.target.value)}
                 style={styles.input}
               />
            </div>

            <div style={styles.fieldRow}>
               <label style={styles.label}>Platform Commission</label>
               <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                 <input
                   type="number"
                   max="100"
                   min="0"
                   value={fares.platformCommissionPercent}
                   onChange={(e) => handleChange('platformCommissionPercent', e.target.value)}
                   style={{...styles.input, flex: 1}}
                 />
                 <span style={styles.unit}>%</span>
               </div>
               <div style={styles.helpText}>Automatically deducted from driver's wallet per trip.</div>
            </div>
            
            <div style={{ marginTop: '36px', display: 'flex', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
               <button onClick={handleSave} disabled={saving} style={styles.primaryBtn}>
                 <Save size={18} /> {saving ? 'Saving...' : 'Publish Changes'}
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 24,
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
  notice: {
    marginBottom: 24,
    padding: '12px 14px',
    borderRadius: 12,
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
    fontSize: 14,
    fontWeight: 600,
  },
  errorBanner: {
    marginBottom: 24,
    padding: '12px 14px',
    borderRadius: 12,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: 600,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: 20,
    alignItems: 'start',
  },
  sectionCard: {
    background: 'white',
    borderRadius: 20,
    boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)',
    overflow: 'hidden',
  },
  sectionHeader: {
    padding: '22px 24px 18px',
    borderBottom: '1px solid #e2e8f0',
    background: '#ffffff',
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
  fieldRow: {
    marginBottom: 18,
  },
  label: {
    display: 'block',
    marginBottom: 8,
    fontSize: 13,
    fontWeight: 700,
    color: '#334155',
  },
  helpText: {
    marginTop: 6,
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 500,
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
  unit: {
    fontSize: 14,
    fontWeight: 700,
    color: '#64748b',
    minWidth: '60px',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '14px 24px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
    color: 'white',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #fecaca',
    background: '#fef2f2',
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 500,
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
    borderBottom: '1px solid #e2e8f0',
  },
  row: {
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '18px 24px',
    fontSize: 14,
    color: '#475569',
    verticalAlign: 'middle',
  },
  tdStrong: {
    padding: '18px 24px',
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
    verticalAlign: 'middle',
  },
  empty: {
    padding: '30px 24px',
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
}
