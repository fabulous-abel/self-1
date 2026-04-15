import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Code, Layout, ShieldCheck, Zap } from 'lucide-react'

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
      <div className="login-shell" style={styles.shell}>
        <section className="login-left-panel" style={styles.leftPanel}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={styles.logoCircle}>
              <Code size={24} color="#ffffff" />
            </div>
            <div>
              <div style={styles.logoTitle}>LinkEt Web</div>
              <div style={styles.logoSub}>Client Portal</div>
            </div>
          </Link>

          <div style={styles.eyebrow}>Secure Login</div>
          <h1 className="login-hero-title" style={styles.heroTitle}>Manage your web projects from a single unified dashboard.</h1>
          <p style={styles.heroCopy}>
            Review project milestones, submit tickets, view analytics, and collaborate with our development team seamlessly.
          </p>

          <div className="login-feature-grid" style={styles.featureGrid}>
            <FeatureCard
              icon={<Layout size={20} color="#F39C12" />}
              title="Project Tracking"
              text="Monitor your web application's progress from concept to deployment."
            />
            <FeatureCard
              icon={<ShieldCheck size={20} color="#F39C12" />}
              title="Secure Storage"
              text="Access sensitive assets, contracts, and credentials in a protected environment."
            />
            <FeatureCard
              icon={<Zap size={20} color="#F39C12" />}
              title="Performance"
              text="View real-time analytics and optimization metrics for your platforms."
            />
          </div>

        </section>

        <section className="login-right-panel" style={styles.rightPanel}>
          <div style={styles.formCard}>
            <h2 className="login-heading" style={styles.heading}>Access Your Account</h2>
            <p style={styles.sub}>
              Enter your credentials to access your dedicated project workspace.
            </p>
            <form onSubmit={handleLogin} style={{ marginTop: 28 }}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="client@company.com"
                style={styles.input}
              />

              <label style={{ ...styles.label, marginTop: 16 }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="Enter your password"
                style={styles.input}
              />

              {error ? <div style={styles.errorBanner}>{error}</div> : null}

              <button type="submit" disabled={loading} style={styles.btn}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, text }) {
  return (
    <div style={styles.featureCard}>
      <div style={{ marginBottom: 12 }}>{icon}</div>
      <div style={styles.featureTitle}>{title}</div>
      <div style={styles.featureText}>{text}</div>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: 24,
  },
  shell: {
    width: '100%',
    maxWidth: 1100,
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(29, 105, 100, 0.25)',
    background: '#ffffff',
  },
  leftPanel: {
    padding: '60px 48px',
    display: 'flex',
    flexDirection: 'column',
    gap: 32,
    background: '#041615',
    color: 'white',
    position: 'relative',
    overflow: 'hidden',
  },
  rightPanel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    background: '#ffffff',
  },
  formCard: {
    width: '100%',
    maxWidth: 400,
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'rgba(76, 184, 184, 0.2)',
    border: '1px solid rgba(76, 184, 184, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '-0.5px',
  },
  logoSub: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  eyebrow: {
    display: 'inline-flex',
    width: 'fit-content',
    padding: '6px 14px',
    borderRadius: 999,
    background: 'rgba(243, 156, 18, 0.15)',
    color: '#F39C12',
    border: '1px solid rgba(243, 156, 18, 0.3)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  heroTitle: {
    margin: 0,
    fontSize: 36,
    lineHeight: 1.15,
    fontWeight: 800,
    color: '#ffffff',
    maxWidth: 480,
  },
  heroCopy: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.6,
    color: '#94a3b8',
    maxWidth: 440,
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 20,
    marginTop: 'auto',
  },
  featureCard: {
    padding: '24px',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    lineHeight: 1.5,
    color: '#94a3b8',
  },
  heading: {
    fontSize: 28,
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  sub: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 8,
    lineHeight: 1.6,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '14px 16px',
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    color: '#0f172a',
    background: '#ffffff',
    transition: 'border-color 0.2s',
  },
  errorBanner: {
    marginTop: 16,
    padding: '12px 14px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 12,
    color: '#dc2626',
    fontSize: 14,
    fontWeight: 500,
  },
  btn: {
    marginTop: 24,
    width: '100%',
    padding: '16px',
    background: '#1D6964',
    color: 'white',
    fontWeight: 700,
    fontSize: 16,
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    boxShadow: '0 10px 20px -5px rgba(29, 105, 100, 0.4)',
    transition: 'transform 0.2s',
  },
}
