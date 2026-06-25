import { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'

const AuthContext = createContext()

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Al montar, verificar si hay un token guardado
  useEffect(() => {
    const token = localStorage.getItem('auto_audit_token')
    const savedUser = localStorage.getItem('auto_audit_user')
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('auto_audit_token')
        localStorage.removeItem('auto_audit_user')
      }
    }
    setLoading(false)
  }, [])

  // Iniciar sesión
  const login = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password })
    localStorage.setItem('auto_audit_token', data.token)
    localStorage.setItem('auto_audit_user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  // Registrar nuevo usuario
  const register = async (email, password) => {
    const data = await api.post('/api/auth/register', { email, password })
    localStorage.setItem('auto_audit_token', data.token)
    localStorage.setItem('auto_audit_user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  // Cerrar sesión
  const logout = () => {
    localStorage.removeItem('auto_audit_token')
    localStorage.removeItem('auto_audit_user')
    setUser(null)
  }

  const value = { user, loading, login, register, logout }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
