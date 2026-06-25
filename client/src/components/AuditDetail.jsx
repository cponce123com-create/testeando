import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../utils/api'
import BruteForceResults from './BruteForceResults'
import LoadTestResults from './LoadTestResults'
import PortScanResults from './PortScanResults'
import EnumResults from './EnumResults'
import HeadersResults from './HeadersResults'
import ApiScanResults from './ApiScanResults'
import SecretsResults from './SecretsResults'

const STATUS_MAP = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-700' },
  en_progreso: { label: 'En progreso', color: 'bg-blue-500/20 text-blue-300 border-blue-700' },
  completada: { label: 'Completada', color: 'bg-green-500/20 text-green-300 border-green-700' },
  cancelada: { label: 'Cancelada', color: 'bg-red-500/20 text-red-300 border-red-700' },
}

const TYPE_LABELS = {
  fuerza_bruta: { icon: '🔐', label: 'Fuerza bruta' },
  carga: { icon: '⚡', label: 'Prueba de carga' },
  escaneo_puertos: { icon: '🔍', label: 'Escaneo de puertos' },
  enumeracion: { icon: '📡', label: 'Enumeracion' },
  auditoria_headers: { icon: '🛡️', label: 'Auditoria de headers' },
  api_scanner: { icon: '🔌', label: 'Escaneo de API' },
  busqueda_secretos: { icon: '🔑', label: 'Busqueda de secretos' },
}

export default function AuditDetail() {
  const { domainId, auditId } = useParams()
  const [audit, setAudit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  const fetchAudit = async () => {
    try {
      const data = await api.get(`/api/audits/${auditId}`)
      setAudit(data)
    } catch {
      // Silencioso
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAudit()
    const interval = setInterval(fetchAudit, 3000)
    return () => clearInterval(interval)
  }, [auditId])

  const handleCancel = async () => {
    if (!window.confirm('¿Cancelar esta auditoria?')) return
    setCancelling(true)
    try {
      await api.patch(`/api/audits/${auditId}/cancel`)
      await fetchAudit()
    } catch {
      // Silencioso
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    )
  }

  if (!audit) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">Auditoria no encontrada.</p>
          <Link to={`/dominio/${domainId}/auditorias`} className="text-indigo-400 hover:underline mt-2 inline-block">Volver a auditorias</Link>
        </div>
      </main>
    )
  }

  const st = STATUS_MAP[audit.status] || STATUS_MAP.pendiente
  const typeInfo = TYPE_LABELS[audit.type] || { icon: '🛠️', label: audit.type }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6 text-sm">
        <Link to="/dashboard" className="text-gray-400 hover:text-white transition">Mis dominios</Link>
        <span className="text-gray-600">/</span>
        <Link to={`/dominio/${domainId}/auditorias`} className="text-gray-400 hover:text-white transition">Auditorias</Link>
        <span className="text-gray-600">/</span>
        <span className="text-white truncate">{auditId}</span>
      </div>

      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">{typeInfo.icon}</span>
              <h1 className="text-xl font-bold text-white">{typeInfo.label}</h1>
            </div>
            <span className={`inline-block text-xs px-2.5 py-1 rounded-full border mt-2 ${st.color}`}>{st.label}</span>
          </div>

          {(audit.status === 'pendiente' || audit.status === 'en_progreso') && (
            <button onClick={handleCancel} disabled={cancelling}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-300 text-sm font-medium rounded-lg transition disabled:opacity-50">
              {cancelling ? 'Cancelando...' : 'Cancelar prueba'}
            </button>
          )}
        </div>

        <details className="mt-4">
          <summary className="text-sm text-gray-400 hover:text-gray-200 cursor-pointer transition">Ver configuracion</summary>
          <pre className="mt-3 bg-gray-900/60 rounded-lg p-4 text-xs text-gray-300 overflow-auto max-h-64">
            {JSON.stringify(audit.config, null, 2)}
          </pre>
        </details>
      </div>

      {audit.type === 'fuerza_bruta' && <BruteForceResults auditId={auditId} />}
      {audit.type === 'carga' && <LoadTestResults auditId={auditId} />}
      {audit.type === 'escaneo_puertos' && <PortScanResults auditId={auditId} />}
      {(audit.type === 'enumeracion' || audit.type === 'subfinder_scan') && <EnumResults auditId={auditId} />}
      {audit.type === 'auditoria_headers' && <HeadersResults auditId={auditId} />}
      {audit.type === 'api_scanner' && <ApiScanResults auditId={auditId} />}
      {audit.type === 'busqueda_secretos' && <SecretsResults auditId={auditId} />}
    </main>
  )
}
