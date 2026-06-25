import { useState, useEffect } from 'react'
import api from '../utils/api'

const METHOD_COLORS = {
  GET: 'bg-green-900/30 text-green-300',
  POST: 'bg-blue-900/30 text-blue-300',
  PUT: 'bg-yellow-900/30 text-yellow-300',
  PATCH: 'bg-purple-900/30 text-purple-300',
  DELETE: 'bg-red-900/30 text-red-300',
}

export default function ApiScanResults({ auditId }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchResults = async () => {
    try {
      const data = await api.get(`/api/audits/${auditId}/api-scan-results`)
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

  const totalErrors = results.filter((r) => r.status_code >= 400).length
  const totalOk = results.filter((r) => r.status_code < 400).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Endpoints probados</p>
          <p className="text-xl font-bold text-white">{results.length}</p>
        </div>
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-4 text-center">
          <p className="text-xs text-green-400 uppercase tracking-wide mb-1">Respuestas OK</p>
          <p className="text-xl font-bold text-green-300">{totalOk}</p>
        </div>
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-center">
          <p className="text-xs text-red-400 uppercase tracking-wide mb-1">Errores/Alertas</p>
          <p className="text-xl font-bold text-red-300">{totalErrors}</p>
        </div>
      </div>

      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-5">
        <h2 className="text-lg font-bold text-white mb-4">Resultados por endpoint</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Esperando resultados...</p>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <div key={r.id} className="bg-gray-800/60 rounded-lg px-4 py-3 border border-gray-700">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${METHOD_COLORS[r.method] || 'bg-gray-700 text-gray-300'}`}>
                      {r.method}
                    </span>
                    <span className="font-mono text-sm text-white truncate">{r.endpoint}</span>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                    r.status_code >= 500 ? 'bg-red-900/40 text-red-300' :
                    r.status_code >= 400 ? 'bg-yellow-900/40 text-yellow-300' :
                    'bg-green-900/40 text-green-300'
                  }`}>{r.status_code}</span>
                </div>
                {r.issues && r.issues.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {r.issues.map((issue, i) => (
                      <p key={i} className="text-xs text-red-400">⚠ {issue}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
