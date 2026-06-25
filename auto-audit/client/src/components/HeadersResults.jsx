import { useState, useEffect } from 'react'
import api from '../utils/api'

const STATUS_COLORS = {
  present: 'bg-green-900/30 text-green-300 border-green-700',
  weak: 'bg-yellow-900/30 text-yellow-300 border-yellow-700',
  missing: 'bg-red-900/30 text-red-300 border-red-700',
}

export default function HeadersResults({ auditId }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchResults = async () => {
    try {
      const data = await api.get(`/api/audits/${auditId}/header-results`)
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

  const summary = {
    present: results.filter((r) => r.status === 'present').length,
    weak: results.filter((r) => r.status === 'weak').length,
    missing: results.filter((r) => r.status === 'missing').length,
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-4 text-center">
          <p className="text-xs text-green-400 uppercase tracking-wide mb-1">Correctas</p>
          <p className="text-xl font-bold text-green-300">{summary.present}</p>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-4 text-center">
          <p className="text-xs text-yellow-400 uppercase tracking-wide mb-1">Debiles</p>
          <p className="text-xl font-bold text-yellow-300">{summary.weak}</p>
        </div>
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-center">
          <p className="text-xs text-red-400 uppercase tracking-wide mb-1">Ausentes</p>
          <p className="text-xl font-bold text-red-300">{summary.missing}</p>
        </div>
      </div>

      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-5">
        <h2 className="text-lg font-bold text-white mb-4">Cabeceras de seguridad</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Esperando resultados...</p>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <div key={r.id}
                className={`rounded-lg px-4 py-3 border ${STATUS_COLORS[r.status] || 'bg-gray-800 border-gray-700'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm font-semibold">{r.header_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    r.status === 'present' ? 'border-green-700 text-green-300' :
                    r.status === 'weak' ? 'border-yellow-700 text-yellow-300' :
                    'border-red-700 text-red-300'
                  }`}>{r.status}</span>
                </div>
                {r.value && <p className="text-xs text-gray-400 font-mono truncate">{r.value}</p>}
                {r.recommendation && (
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="text-gray-400">Sugerencia:</span> {r.recommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
