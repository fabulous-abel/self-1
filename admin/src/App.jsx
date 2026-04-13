import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AlertCircle, Activity, List, LogOut, MapPin, Users, Users2 } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import ActivityPage from './pages/ActivityPage'
import LoginPage from './pages/LoginPage'
import LocationsPage from './pages/LocationsPage'
import NotificationsPage from './pages/NotificationsPage'
import PassengersPage from './pages/PassengersPage'
import QueuesPage from './pages/QueuesPage'
import UsersPage from './pages/UsersPage'
import LandingPage from './pages/LandingPage'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (user === undefined) return (
    <div style={loadingStyles.root}>
      <div style={loadingStyles.text}>Loading...</div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppShell() {
  const { user, logout } = useAuth()
  const [page, setPage] = useState('locations')

  return (
    <div style={styles.root}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          <div style={styles.logoCircle}>L</div>
          <div>
            <div style={styles.logoTitle}>LinkEt Admin</div>
            <div style={styles.logoSub}>{user?.email}</div>
          </div>
        </div>

        <nav style={styles.nav}>
          <NavBtn icon={<MapPin size={18} />} label="Locations" active={page === 'locations'} onClick={() => setPage('locations')} />
          <NavBtn icon={<AlertCircle size={18} />} label="Notifications" active={page === 'notifications'} onClick={() => setPage('notifications')} />
          <NavBtn icon={<List size={18} />} label="Live Queues" active={page === 'queues'} onClick={() => setPage('queues')} />
          <NavBtn icon={<Users2 size={18} />} label="Passengers" active={page === 'passengers'} onClick={() => setPage('passengers')} />
          <NavBtn icon={<Activity size={18} />} label="Activity" active={page === 'activity'} onClick={() => setPage('activity')} />
          <NavBtn icon={<Users size={18} />} label="Users" active={page === 'users'} onClick={() => setPage('users')} />
        </nav>

        <button onClick={logout} style={styles.logoutBtn}>
          <LogOut size={16} /> Sign out
        </button>
      </div>

      <div style={styles.content}>
        <div style={styles.pageWrap}>
          {page === 'locations' && <LocationsPage />}
          {page === 'notifications' && <NotificationsPage />}
          {page === 'queues' && <QueuesPage />}
          {page === 'passengers' && <PassengersPage />}
          {page === 'activity' && <ActivityPage />}
          {page === 'users' && <UsersPage />}
        </div>
      </div>
    </div>
  )
}

function NavBtn({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ ...styles.navBtn, ...(active ? styles.navBtnActive : {}) }}>
      {icon} {label}
    </button>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            } 
          />
          {/* Catch all redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

const loadingStyles = {
  root: {
    display: 'flex',
    height: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f172a',
  },
  text: {
    color: '#38bdf8',
    fontSize: 18,
    fontWeight: 700,
  },
}

const styles = {
  root: {
    display: 'flex',
    height: '100vh',
    fontFamily: "'Inter', system-ui, sans-serif",
    backgroundColor: '#f1f5f9',
  },
  sidebar: {
    width: 240,
    background: '#0f172a',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sidebarLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 8px 24px',
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: '#1e3a5f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#38bdf8',
    fontWeight: 900,
    fontSize: 20,
  },
  logoTitle: {
    fontWeight: 800,
    fontSize: 16,
    color: 'white',
  },
  logoSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 14px',
    borderRadius: 10,
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all 0.15s',
  },
  navBtnActive: {
    background: '#1e40af',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: '40px 32px',
    overflowY: 'auto',
  },
  pageWrap: {
    maxWidth: 1280,
    margin: '0 auto',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '11px 14px',
    borderRadius: 10,
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },
  pageSub: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 6,
    marginBottom: 28,
  },
}

