import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err?.message || 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.root}>
      <div style={styles.shell}>
        <section style={styles.leftPanel}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={styles.logoCircle}>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#67e8f9' }}>L</span>
            </div>
            <div>
              <div style={styles.logoTitle}>LinkEt Admin</div>
              <div style={styles.logoSub}>Backend dispatch workspace</div>
            </div>
          </Link>


          <div style={styles.eyebrow}>Operations Hub</div>
          <h1 style={styles.heroTitle}>Run queue operations from a focused left-right control surface.</h1>
          <p style={styles.heroCopy}>
            Review dispatch state, broadcast updates, user records, and live queue controls from one admin entry point.
          </p>

          <div style={styles.featureGrid}>
            <FeatureCard
              title="Queue Control"
              text="Inspect live queues, monitor waiting positions, and remove entries from admin tools."
            />
            <FeatureCard
              title="Dispatch Board"
              text="Manage places and route phone requests through the backend-backed dispatch flow."
            />
            <FeatureCard
              title="Broadcasts"
              text="Publish operational notices without depending on Firestore in the browser."
            />
            <FeatureCard
              title="User Records"
              text="Work with backend-managed driver and passenger records in the same workspace."
            />
          </div>

          <div style={styles.statsRow}>
            <MiniPanel label="Primary API" value="Backend /api" />
            <MiniPanel label="Session Mode" value="Local Login" />
            <MiniPanel label="Update Mode" value="Polling" />
          </div>
        </section>

        <section style={styles.rightPanel}>
          <div style={styles.formCard}>
            <h2 style={styles.heading}>Sign in to your account</h2>
            <p style={styles.sub}>
              Sign in still uses local browser storage. Queue, dispatch, user, and broadcast data now load through the
              backend API.
            </p>
            <form onSubmit={handleLogin} style={{ marginTop: 28 }}>
              <label style={styles.label}>Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="Enter your admin email"
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

              {error ? <div style={styles.errorBanner}>{error}</div> : null}

              <button type="submit" disabled={loading} style={styles.btn}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}

function FeatureCard({ title, text }) {
  return (
    <div style={styles.featureCard}>
      <div style={styles.featureTitle}>{title}</div>
      <div style={styles.featureText}>{text}</div>
    </div>
  )
}

function MiniPanel({ label, value }) {
  return (
    <div style={styles.miniPanel}>
      <div style={styles.miniPanelLabel}>{label}</div>
      <div style={styles.miniPanelValue}>{value}</div>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'radial-gradient(circle at top left, rgba(103,232,249,0.18), transparent 26%), linear-gradient(135deg, #08111f 0%, #10233d 53%, #efe7d8 53%, #f7f3ea 100%)',
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: 24,
  },
  shell: {
    width: '100%',
    maxWidth: 1180,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    borderRadius: 30,
    overflow: 'hidden',
    boxShadow: '0 32px 90px rgba(8, 17, 31, 0.28)',
    background: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(14px)',
  },
  leftPanel: {
    padding: '42px 38px',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    background: 'linear-gradient(180deg, rgba(7,18,33,0.97) 0%, rgba(16,35,61,0.95) 100%)',
    color: 'white',
  },
  rightPanel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 28px',
    background: 'linear-gradient(180deg, rgba(248,244,236,0.96) 0%, rgba(255,255,255,0.98) 100%)',
  },
  formCard: {
    width: '100%',
    maxWidth: 430,
    background: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    padding: '34px 32px 30px',
    border: '1px solid rgba(148,163,184,0.18)',
    boxShadow: '0 18px 44px rgba(15, 23, 42, 0.12)',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  logoCircle: {
    width: 54,
    height: 54,
    borderRadius: 16,
    background: 'rgba(103, 232, 249, 0.08)',
    border: '1px solid rgba(103, 232, 249, 0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: '#f8fafc',
  },
  logoSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  eyebrow: {
    display: 'inline-flex',
    width: 'fit-content',
    padding: '7px 12px',
    borderRadius: 999,
    background: 'rgba(103, 232, 249, 0.12)',
    color: '#a5f3fc',
    border: '1px solid rgba(103, 232, 249, 0.12)',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  heroTitle: {
    margin: 0,
    fontSize: 38,
    lineHeight: 1.08,
    fontWeight: 900,
    color: '#f8fafc',
    maxWidth: 520,
  },
  heroCopy: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.7,
    color: '#cbd5e1',
    maxWidth: 520,
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
  },
  featureCard: {
    padding: '18px 18px 16px',
    borderRadius: 18,
    background: 'rgba(15, 23, 42, 0.26)',
    border: '1px solid rgba(148,163,184,0.14)',
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: '#f8fafc',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 13,
    lineHeight: 1.65,
    color: '#cbd5e1',
  },
  statsRow: {
    marginTop: 'auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
  },
  miniPanel: {
    padding: '16px 16px 14px',
    borderRadius: 16,
    background: 'rgba(248, 250, 252, 0.08)',
    border: '1px solid rgba(148,163,184,0.14)',
  },
  miniPanelLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  miniPanelValue: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: 800,
    color: '#f8fafc',
  },
  heading: {
    fontSize: 24,
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },
  sub: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    lineHeight: 1.65,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '13px 14px',
    borderRadius: 12,
    border: '1.5px solid #dbe3ee',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    color: '#0f172a',
    background: '#fffdf9',
  },
  errorBanner: {
    marginTop: 14,
    padding: '10px 14px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 10,
    color: '#dc2626',
    fontSize: 13,
  },
  btn: {
    marginTop: 22,
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(90deg, #0f766e, #0ea5e9)',
    color: 'white',
    fontWeight: 800,
    fontSize: 16,
    border: 'none',
    borderRadius: 14,
    cursor: 'pointer',
    letterSpacing: 0.2,
    boxShadow: '0 12px 26px rgba(14, 165, 233, 0.22)',
  },
}
