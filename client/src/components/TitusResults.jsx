import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../utils/api'

const SEVERITY_COLORS = {
  critical: 'bg-red-600/20 text-red-300 border-red-700',
  high: 'bg-orange-600/20 text-orange-300 border-orange-700',
  medium: 'bg-yellow-600/20 text-yellow-300 border-yellow-700',
  low: 'bg-green-600/20 text-green-300 border-green-700',
  info: 'bg-blue-600/20 text-blue-300 border-blue-700',
}

export default function TitusResults() {
  const { domainId, auditId } = useParams()
  const [results, setResults] = useState([])
  const [audit, setAudit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [auditData, resultsData] = await Promise.all([
          api.get(`/api/audits/${auditId}`),
          api.get(`/api/audits/${auditId}/titus-results`),
        ])
        setAudit(auditData)
        setResults(resultsData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [auditId])

  const critical = results.filter(r => r.severity === 'critical').length
  const high = results.filter(r => r.severity === 'high').length
  const medium = results.filter(r => r.severity === 'medium').length

  if (loading) return (
    <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  )

  if (error) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">{error}</div>
    </div>
  )

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/dominio/${domainId}/auditorias`} className="text-gray-400 hover:text-white transition text-sm">← Auditorías</Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-xl font-bold text-white">Resultados Titus — Secretos</h1>
      </div>

      {audit && (
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">🔑</span>
          <div>
            <p className="text-white text-sm font-medium">Objetivo: {audit.domain_url || audit.config?.targetUrl || '—'}</p>
            <p className="text-gray-500 text-xs">Estado: {audit.status} — {results.length} hallazgos (487 reglas)</p>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex gap-3 mb-6">
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-3 py-2 text-center min-w-[80px]">
            <p className="text-red-300 text-lg font-bold">{critical}</p>
            <p className="text-red-400 text-xs">Críticos</p>
          </div>
          <div className="bg-orange-900/30 border border-orange-800 rounded-lg px-3 py-2 text-center min-w-[80px]">
            <p className="text-orange-300 text-lg font-bold">{high}</p>
            <p className="text-orange-400 text-xs">Altos</p>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-800 rounded-lg px-3 py-2 text-center min-w-[80px]">
            <p className="text-yellow-300 text-lg font-bold">{medium}</p>
            <p className="text-yellow-400 text-xs">Medios</p>
          </div>
          <div className="bg-gray-800/40 border border-gray-700 rounded-lg px-3 py-2 text-center min-w-[80px]">
            <p className="text-gray-300 text-lg font-bold">{results.length}</p>
            <p className="text-gray-400 text-xs">Total</p>
          </div>
        </div>
      )}

      {results.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl">🔍</span>
          <p className="text-gray-400 mt-4 text-lg">Sin resultados aún.</p>
          <p className="text-gray-500 text-sm mt-1">Espera a que el escaneo termine.</p>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-gray-500 uppercase tracking-wider font-semibold">
            <div className="col-span-1">#</div>
            <div className="col-span-3">Regla</div>
            <div className="col-span-3">Match</div>
            <div className="col-span-3">Archivo</div>
            <div className="col-span-1">Score</div>
            <div className="col-span-1">Sev</div>
          </div>
          <div className="divide-y divide-gray-800/50 bg-gray-900/40 border border-gray-800 rounded-xl overflow-hidden">
            {results.map((r, i) => (
              <div key={r.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 hover:bg-gray-800/30 transition items-center text-sm">
                <div className="col-span-1 text-gray-500 text-xs">{i + 1}</div>
                <div className="col-span-3 text-white font-medium truncate" title={r.rule_name}>{r.rule_name}</div>
                <div className="col-span-3 text-gray-300 truncate font-mono text-xs" title={r.match}>{r.match}</div>
                <div className="col-span-3 text-gray-400 truncate text-xs" title={r.file_path}>{r.file_path || '—'}{r.line_number ? `:${r.line_number}` : ''}</div>
                <div className="col-span-1 text-gray-300 text-xs">{r.score ?? '—'}</div>
                <div className="col-span-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${
                    SEVERITY_COLORS[r.severity] || SEVERITY_COLORS.info
                  }`}>{r.severity?.[0]?.toUpperCase() || '?'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
