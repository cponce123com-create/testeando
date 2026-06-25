import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-gray-900/80 backdrop-blur border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link to="/dashboard" className="flex items-center gap-2 text-lg font-bold text-white hover:text-indigo-400 transition">
            <span className="text-xl">🛡️</span>
            <span>AutoAudit</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 hidden sm:block">{user?.email}</span>
            <button onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-red-400 transition px-3 py-1.5 rounded-lg hover:bg-gray-800">
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
