import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../utils/api'

export default function BrutusResults() {
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
          api.get(`/api/audits/${auditId}/brutus-results`),
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

  const valid = results.filter(r => r.success).length

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
        <h1 className="text-xl font-bold text-white">Resultados Brutus — Credenciales</h1>
      </div>

      {audit && (
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">🔐</span>
          <div>
            <p className="text-white text-sm font-medium">Target: {audit.config?.target || audit.domain_url || '—'}</p>
            <p className="text-gray-500 text-xs">Estado: {audit.status} — {results.length} intentos, {valid} válidos</p>
          </div>
        </div>
      )}

      {valid > 0 && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 mb-6">
          <p className="text-red-300 font-bold text-lg">⚠️ {valid} credencial{valid !== 1 ? 'es' : ''} válida{valid !== 1 ? 's' : ''} encontrada{valid !== 1 ? 's' : ''}</p>
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
            <div className="col-span-2">Protocolo</div>
            <div className="col-span-3">Target</div>
            <div className="col-span-2">Usuario</div>
            <div className="col-span-2">Password</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Banner</div>
          </div>
          <div className="divide-y divide-gray-800/50 bg-gray-900/40 border border-gray-800 rounded-xl overflow-hidden">
            {results.map((r) => (
              <div key={r.id} className={`grid grid-cols-12 gap-2 px-4 py-2.5 hover:bg-gray-800/30 transition items-center text-sm ${r.success ? 'bg-red-900/10' : ''}`}>
                <div className="col-span-2 text-gray-300">{r.protocol}</div>
                <div className="col-span-3 text-white truncate" title={r.target}>{r.target}</div>
                <div className="col-span-2 text-gray-300 truncate">{r.username || '—'}</div>
                <div className="col-span-2 text-gray-300 truncate font-mono">{r.password ? '••••••' : '—'}</div>
                <div className="col-span-1">{r.success ? <span className="text-green-400 font-bold">✅</span> : <span className="text-gray-500">❌</span>}</div>
                <div className="col-span-2 text-gray-400 truncate text-xs">{r.banner || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
