import { useState, useEffect } from 'react'
import api from '../utils/api'

export default function BruteForceResults({ auditId }) {
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAttempts = async () => {
    try {
      const data = await api.get(`/api/audits/${auditId}/attempts`)
      setAttempts(data)
    } catch {
      // Silencioso
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttempts()
    const interval = setInterval(fetchAttempts, 2000)
    return () => clearInterval(interval)
  }, [auditId])

  const successfulAttempts = attempts.filter((a) => a.success)

  return (
    <div>
      {successfulAttempts.length > 0 && (
        <div className="bg-green-900/40 border border-green-700 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚠️</span>
            <h2 className="text-lg font-bold text-green-300">¡Credenciales válidas encontradas!</h2>
          </div>
          <div className="space-y-2">
            {successfulAttempts.map((att) => (
              <div key={att.id} className="bg-green-900/30 rounded-lg px-4 py-2 text-sm">
                <span className="text-green-200 font-mono">{att.username}</span>
                <span className="text-green-400 mx-2">:</span>
                <span className="text-green-200 font-mono">{att.password}</span>
                <span className="text-green-400 ml-3">Código: {att.status_code}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Intentos realizados</h2>
          <span className="text-sm text-gray-400">
            {attempts.length} intentos
            {successfulAttempts.length > 0 && (
              <span className="text-green-400 ml-2">({successfulAttempts.length} éxitos)</span>
            )}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : attempts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Esperando intentos… El agente comenzará a reportar resultados cuando la auditoría esté en progreso.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2 px-3 font-medium">Timestamp</th>
                  <th className="text-left py-2 px-3 font-medium">Usuario</th>
                  <th className="text-left py-2 px-3 font-medium">Contraseña</th>
                  <th className="text-center py-2 px-3 font-medium">Código</th>
                  <th className="text-center py-2 px-3 font-medium">¿Éxito?</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((att) => (
                  <tr key={att.id}
                    className={`border-b border-gray-800 hover:bg-gray-700/30 transition ${att.success ? 'bg-green-900/20' : ''}`}>
                    <td className="py-2 px-3 text-gray-300 whitespace-nowrap font-mono text-xs">
                      {att.created_at ? new Date(att.created_at).toLocaleTimeString() : '—'}
                    </td>
                    <td className="py-2 px-3 text-white font-mono">{att.username}</td>
                    <td className="py-2 px-3 text-gray-300 font-mono max-w-[180px] truncate">{att.password}</td>
                    <td className="py-2 px-3 text-center font-mono">{att.status_code}</td>
                    <td className="py-2 px-3 text-center">
                      {att.success ? <span className="text-green-400 font-bold">✅</span> : <span className="text-gray-600">❌</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
