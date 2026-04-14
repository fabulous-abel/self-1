import { useEffect, useState } from 'react'
import { Banknote, Save } from 'lucide-react'
import { getFareSettings, updateFareSettings } from '../services/backendApi'

export default function FaresPage() {
  const [fares, setFares] = useState({
    currency: 'ETB',
    baseFare: 0,
    perKmRate: 0,
    perMinRate: 0,
    platformCommissionPercent: 0,
    surgeMultiplier: 1.0,
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    loadFares()
  }, [])

  async function loadFares() {
    setLoading(true)
    setError('')
    try {
      const data = await getFareSettings()
      setFares(data)
    } catch (err) {
      setError(err?.message || 'Unable to load fare configurations.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFares((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const updated = await updateFareSettings({
        currency: fares.currency,
        baseFare: Number(fares.baseFare),
        perKmRate: Number(fares.perKmRate),
        perMinRate: Number(fares.perMinRate),
        platformCommissionPercent: Number(fares.platformCommissionPercent),
        surgeMultiplier: Number(fares.surgeMultiplier),
      })
      setFares(updated)
      setNotice('Fare settings updated successfully.')
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
          <h1 style={styles.title}>Fare Configuration</h1>
          <p style={styles.sub}>
            Manage how the system calculates estimates and final trip costs for your queued drivers.
          </p>
        </div>
      </div>

      {notice ? <div style={styles.notice}>{notice}</div> : null}
      {error ? <div style={styles.errorBanner}>{error}</div> : null}

      <div style={styles.grid}>
        {/* Base Fares Section */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>Pricing Structure</div>
            <div style={styles.sectionSub}>Adjust the base rules to compute point-to-point fares.</div>
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
               <label style={styles.label}>Base Fare</label>
               <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                 <input
                   type="number"
                   value={fares.baseFare}
                   onChange={(e) => handleChange('baseFare', e.target.value)}
                   style={{...styles.input, flex: 1}}
                 />
                 <span style={styles.unit}>{fares.currency}</span>
               </div>
               <div style={styles.helpText}>Added instantly when a ride begins.</div>
            </div>

            <div style={styles.fieldRow}>
               <label style={styles.label}>Per-Kilometer Rate</label>
               <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                 <input
                   type="number"
                   value={fares.perKmRate}
                   onChange={(e) => handleChange('perKmRate', e.target.value)}
                   style={{...styles.input, flex: 1}}
                 />
                 <span style={styles.unit}>{fares.currency} / km</span>
               </div>
               <div style={styles.helpText}>Charged for every kilometer of distance.</div>
            </div>

            <div style={styles.fieldRow}>
               <label style={styles.label}>Per-Minute Rate</label>
               <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                 <input
                   type="number"
                   value={fares.perMinRate}
                   onChange={(e) => handleChange('perMinRate', e.target.value)}
                   style={{...styles.input, flex: 1}}
                 />
                 <span style={styles.unit}>{fares.currency} / min</span>
               </div>
               <div style={styles.helpText}>Charged for time spent in traffic or long waits.</div>
            </div>
          </div>
        </div>

        {/* Global Multipliers Section */}
        <div style={styles.sectionCard}>
           <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>Platform Logic</div>
            <div style={styles.sectionSub}>Surge algorithms and platform commission limits.</div>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={styles.fieldRow}>
               <label style={styles.label}>Surge Multiplier</label>
               <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                 <input
                   type="number"
                   step="0.1"
                   value={fares.surgeMultiplier}
                   onChange={(e) => handleChange('surgeMultiplier', e.target.value)}
                   style={{...styles.input, flex: 1}}
                 />
                 <span style={styles.unit}>x Base</span>
               </div>
               <div style={styles.helpText}>1.0 is standard rate. 1.5 increases prices by 50% system-wide.</div>
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
                 <Save size={18} /> {saving ? 'Applying...' : 'Save Fare Settings'}
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
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
    background: '#f8fafc',
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
    gap: 10,
    padding: '14px 24px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
    color: 'white',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
  },
}
