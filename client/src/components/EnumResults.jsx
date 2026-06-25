import { useState, useEffect } from 'react'
import api from '../utils/api'

export default function EnumResults({ auditId }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchResults = async () => {
    try {
      const data = await api.get(`/api/audits/${auditId}/enum-results`)
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

  return (
    <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Recursos descubiertos</h2>
        <span className="text-sm text-gray-400">{results.length} encontrados</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          Esperando resultados... El agente comenzara a reportar cuando la enumeracion este en progreso.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2 px-3 font-medium">Subdominio / Recurso</th>
                <th className="text-left py-2 px-3 font-medium">IP</th>
                <th className="text-left py-2 px-3 font-medium">Fuente</th>
                <th className="text-left py-2 px-3 font-medium">Descubierto</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-b border-gray-800 hover:bg-gray-700/30 transition">
                  <td className="py-2 px-3 font-mono text-white">{r.subdomain}</td>
                  <td className="py-2 px-3 font-mono text-gray-300">{r.ip_address || '—'}</td>
                  <td className="py-2 px-3 text-gray-400 text-xs">{r.source || '—'}</td>
                  <td className="py-2 px-3 text-gray-500 text-xs">
                    {r.created_at ? new Date(r.created_at).toLocaleTimeString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
