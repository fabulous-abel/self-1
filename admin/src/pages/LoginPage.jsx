import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getDefaultAdminCredentials } from '../lib/localAdminStore'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const credentials = useMemo(() => getDefaultAdminCredentials(), [])

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
    } catch (err) {
      setError(err?.message || 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <div style={styles.logoCircle}>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#0ea5e9' }}>L</span>
          </div>
          <div>
            <div style={styles.logoTitle}>LinkEt Admin</div>
            <div style={styles.logoSub}>Local Auth + Backend Dispatch</div>
          </div>
        </div>

        <h2 style={styles.heading}>Sign in to your account</h2>
        <p style={styles.sub}>Sign in still uses local browser storage. Queue, dispatch, user, and broadcast data now load through the backend API.</p>
        <div style={styles.infoBanner}>
          Default login: <b>{credentials.email}</b> / <b>{credentials.password}</b>
        </div>

        <form onSubmit={handleLogin} style={{ marginTop: 28 }}>
          <label style={styles.label}>Email address</label>
          <input
            type="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder={credentials.email}
            style={styles.input}
          />

          <label style={{ ...styles.label, marginTop: 16 }}>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={event => setPassword(event.target.value)}
            placeholder="Enter your local admin password"
            style={styles.input}
          />

          {error && <div style={styles.errorBanner}>{error}</div>}

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: 16,
  },
  card: {
    background: 'white',
    borderRadius: 24,
    padding: '40px 40px 36px',
    width: '100%',
    maxWidth: 440,
    boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 32,
  },
  logoCircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: '#f0f9ff',
    border: '2px solid #bae6fd',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTitle: { fontSize: 17, fontWeight: 800, color: '#0f172a' },
  logoSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  heading: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 },
  sub: { fontSize: 14, color: '#64748b', marginTop: 6 },
  infoBanner: {
    marginTop: 14,
    padding: '10px 14px',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 8,
    color: '#1d4ed8',
    fontSize: 13,
  },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 },
  input: {
    display: 'block',
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1.5px solid #e2e8f0',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    color: '#0f172a',
  },
  errorBanner: {
    marginTop: 14,
    padding: '10px 14px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    color: '#dc2626',
    fontSize: 13,
  },
  btn: {
    marginTop: 22,
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(90deg, #0ea5e9, #0284c7)',
    color: 'white',
    fontWeight: 700,
    fontSize: 16,
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    letterSpacing: 0.3,
  },
}
