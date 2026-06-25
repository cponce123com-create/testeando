import { useState, useEffect } from 'react'
import api from '../utils/api'

const SEVERITY_COLORS = {
  critical: 'bg-red-900/40 text-red-300 border-red-700',
  high: 'bg-orange-900/40 text-orange-300 border-orange-700',
  medium: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  low: 'bg-gray-700 text-gray-300 border-gray-600',
}

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

export default function SecretsResults({ auditId }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchResults = async () => {
    try {
      const data = await api.get(`/api/audits/${auditId}/secret-results`)
      setResults(data)
    } catch {
      // Silencioso
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResults()
    const interval = setInterval(fetchResults, 3000)
    return () => clearInterval(interval)
  }, [auditId])

  const sorted = [...results].sort((a, b) => (SEVERITY_ORDER[a.severity] || 99) - (SEVERITY_ORDER[b.severity] || 99))
  const criticalCount = results.filter((r) => r.severity === 'critical' || r.severity === 'high').length

  return (
    <div className="space-y-6">
      {criticalCount > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚨</span>
            <p className="text-red-300 font-semibold">
              Se encontraron <span className="font-bold">{criticalCount}</span> secretos de alta criticidad
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Secretos encontrados</p>
          <p className="text-xl font-bold text-white">{results.length}</p>
        </div>
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Alta criticidad</p>
          <p className="text-xl font-bold text-red-400">{criticalCount}</p>
        </div>
      </div>

      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-5">
        <h2 className="text-lg font-bold text-white mb-4">Secretos detectados</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No se encontraron secretos expuestos. El agente comenzara a escanear cuando la auditoria este en progreso.
          </p>
        ) : (
          <div className="space-y-2">
            {sorted.map((r) => (
              <div key={r.id}
                className={`rounded-lg px-4 py-3 border ${SEVERITY_COLORS[r.severity] || 'bg-gray-800 border-gray-700'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{r.secret_type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    r.severity === 'critical' || r.severity === 'high'
                      ? 'border-red-700 text-red-300'
                      : r.severity === 'medium'
                      ? 'border-yellow-700 text-yellow-300'
                      : 'border-gray-600 text-gray-400'
                  }`}>{r.severity}</span>
                </div>
                <p className="text-xs text-gray-400 font-mono truncate">
                  <span className="text-gray-500">Ubicacion:</span> {r.location || '—'}
                </p>
                {r.snippet && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">Ver fragmento</summary>
                    <pre className="mt-2 bg-gray-900/60 rounded p-2 text-xs text-gray-400 overflow-x-auto max-h-20">{r.snippet}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
