import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../utils/api'

const STATUS_MAP = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-700' },
  en_progreso: { label: 'En progreso', color: 'bg-blue-500/20 text-blue-300 border-blue-700' },
  completada: { label: 'Completada', color: 'bg-green-500/20 text-green-300 border-green-700' },
  cancelada: { label: 'Cancelada', color: 'bg-red-500/20 text-red-300 border-red-700' },
}

const TYPE_OPTIONS = [
  { type: 'fuerza_bruta', icon: '🔐', label: 'Fuerza bruta', color: 'indigo' },
  { type: 'carga', icon: '⚡', label: 'Prueba de carga', color: 'emerald' },
  { type: 'escaneo_puertos', icon: '🔍', label: 'Escaneo de puertos', color: 'cyan' },
  { type: 'enumeracion', icon: '📡', label: 'Enumeracion', color: 'purple' },
  { type: 'auditoria_headers', icon: '🛡️', label: 'Aud. headers', color: 'orange' },
  { type: 'api_scanner', icon: '🔌', label: 'API scanner', color: 'rose' },
  { type: 'busqueda_secretos', icon: '🔑', label: 'Secretos', color: 'amber' },
]

export default function AuditList() {
  const { domainId } = useParams()
  const [audits, setAudits] = useState([])
  const [domainUrl, setDomainUrl] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [domains, auditsData] = await Promise.all([
        api.get('/api/domains'),
        api.get(`/api/domain/${domainId}/audits`),
      ])
      const domain = domains.find((d) => String(d.id) === String(domainId))
      if (domain) setDomainUrl(domain.url)
      setAudits(auditsData)
    } catch {
      // Silencioso
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 4000)
    return () => clearInterval(interval)
  }, [domainId])

  const handleCancel = async (auditId) => {
    if (!window.confirm('¿Cancelar esta auditoria?')) return
    try {
      await api.patch(`/api/audits/${auditId}/cancel`)
      await fetchData()
    } catch {
      // Silencioso
    }
  }

  const canCancel = (s) => s === 'pendiente' || s === 'en_progreso'

  const getTypeInfo = (type) => TYPE_OPTIONS.find((t) => t.type === type) || { icon: '🛠️', label: type, color: 'gray' }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboard" className="text-gray-400 hover:text-white transition text-sm">← Mis dominios</Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-xl font-bold text-white truncate">{domainUrl || 'Cargando...'}</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {TYPE_OPTIONS.map((opt) => {
          const colorMap = {
            indigo: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20',
            emerald: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20',
            cyan: 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/20',
            purple: 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20',
            orange: 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20',
            rose: 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20',
            amber: 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20',
          }
          return (
            <Link
              key={opt.type}
              to={`/dominio/${domainId}/auditoria/nueva/${opt.type}`}
              className={`px-3 py-2 ${colorMap[opt.color] || 'bg-gray-600 hover:bg-gray-500'} text-white text-xs font-medium rounded-lg transition shadow-lg whitespace-nowrap`}
            >
              + {opt.icon} {opt.label}
            </Link>
          )
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : audits.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl">📋</span>
          <p className="text-gray-400 mt-4 text-lg">No hay auditorias para este dominio.</p>
          <p className="text-gray-500 text-sm mt-1">Crea una nueva auditoria para empezar.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {audits.map((audit) => {
            const st = STATUS_MAP[audit.status] || STATUS_MAP.pendiente
            const ti = getTypeInfo(audit.type)
            return (
              <div key={audit.id}
                className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 flex items-center justify-between hover:border-gray-600 transition group">
                <Link to={`/dominio/${domainId}/auditoria/${audit.id}`}
                  className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-xl flex-shrink-0">{ti.icon}</span>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{ti.label}</p>
                    <p className="text-gray-500 text-xs">
                      Creada {audit.created_at ? new Date(audit.created_at).toLocaleString() : '—'}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full border ${st.color}`}>{st.label}</span>
                  {canCancel(audit.status) && (
                    <button onClick={() => handleCancel(audit.id)}
                      className="text-xs px-2.5 py-1 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition">
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
