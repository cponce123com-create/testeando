import { useState, useEffect } from 'react'
import api from '../utils/api'

export default function PortScanResults({ auditId }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchResults = async () => {
    try {
      const data = await api.get(`/api/audits/${auditId}/scan-results`)
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

  const openPorts = results.filter((r) => r.state === 'open')

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Puertos escaneados</p>
          <p className="text-xl font-bold text-white">{results.length}</p>
        </div>
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Abiertos</p>
          <p className="text-xl font-bold text-green-400">{openPorts.length}</p>
        </div>
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Cerrados/Filtrados</p>
          <p className="text-xl font-bold text-gray-400">{results.length - openPorts.length}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-5">
        <h2 className="text-lg font-bold text-white mb-4">Puertos descubiertos</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Esperando resultados... El agente comenzara a reportar cuando el escaneo este en progreso.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2 px-3 font-medium">Puerto</th>
                  <th className="text-left py-2 px-3 font-medium">Protocolo</th>
                  <th className="text-left py-2 px-3 font-medium">Servicio</th>
                  <th className="text-center py-2 px-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-b border-gray-800 hover:bg-gray-700/30 transition">
                    <td className="py-2 px-3 font-mono text-white font-medium">{r.port}</td>
                    <td className="py-2 px-3 text-gray-300 uppercase">{r.protocol}</td>
                    <td className="py-2 px-3 text-gray-300">{r.service || '—'}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.state === 'open' ? 'bg-green-900/40 text-green-300 border border-green-700' : 'bg-gray-800 text-gray-500 border border-gray-700'
                      }`}>
                        {r.state}
                      </span>
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
