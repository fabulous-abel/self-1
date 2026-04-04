import { createContext, useContext, useEffect, useState } from 'react'
import {
  getCurrentSession,
  loginAdmin,
  logoutAdmin,
  subscribeToLocalAdminStore,
} from '../lib/localAdminStore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    setUser(getCurrentSession())

    return subscribeToLocalAdminStore(() => {
      setUser(getCurrentSession())
    })
  }, [])

  const login = async (email, password) => {
    const session = loginAdmin(email, password)
    setUser(session)
    return session
  }

  const logout = () => {
    logoutAdmin()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
