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

const MODULE_ICONS = {
  port_scan: '🔍',
  subdomain_scan: '📡',
  directory_scan: '📁',
  cve_check: '⚠️',
  service_detect: '🔌',
  raw: '📄',
  error: '❌',
}

export default function NettackerResults() {
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
          api.get(`/api/audits/${auditId}/nettacker-results`),
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

  // Agrupar resultados por módulo
  const grouped = {}
  for (const r of results) {
    const mod = r.module || 'unknown'
    if (!grouped[mod]) grouped[mod] = { results: [], count: 0, icon: MODULE_ICONS[mod] || '🛠️' }
    grouped[mod].results.push(r)
    grouped[mod].count++
  }

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
        <h1 className="text-xl font-bold text-white">Resultados Nettacker</h1>
      </div>

      {audit && (
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <p className="text-white text-sm font-medium">Objetivo: {audit.domain_url || audit.config?.target || '—'}</p>
            <p className="text-gray-500 text-xs">Estado: {audit.status} — {results.length} hallazgos</p>
          </div>
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl">🔍</span>
          <p className="text-gray-400 mt-4 text-lg">Sin resultados aún.</p>
          <p className="text-gray-500 text-sm mt-1">Espera a que el escaneo termine.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([module, group]) => (
            <section key={module} className="bg-gray-900/40 border border-gray-800 rounded-xl overflow-hidden">
              <div className="bg-gray-800/60 px-4 py-3 flex items-center gap-2 border-b border-gray-700">
                <span>{group.icon}</span>
                <h2 className="text-white font-medium text-sm capitalize">{module.replace(/_/g, ' ')}</h2>
                <span className="ml-auto text-xs text-gray-400">{group.count} hallazgos</span>
              </div>
              <div className="divide-y divide-gray-800/50">
                {group.results.map((r) => (
                  <div key={r.id} className="px-4 py-3 hover:bg-gray-800/30 transition">
                    <div className="flex items-start gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${
                        SEVERITY_COLORS[r.severity] || SEVERITY_COLORS.info
                      }`}>{r.severity || 'info'}</span>
                      <div className="min-w-0 flex-1">
                        {r.host && <p className="text-white text-sm font-medium truncate">{r.host}{r.port ? `:${r.port}` : ''}</p>}
                        {r.service && <p className="text-gray-400 text-xs">{r.service}</p>}
                        {r.vulnerability && <p className="text-gray-300 text-xs mt-1">{r.vulnerability}</p>}
                        {r.extra && typeof r.extra === 'object' && Object.keys(r.extra).length > 0 && (
                          <pre className="text-gray-500 text-xs mt-1 truncate">{JSON.stringify(r.extra).slice(0, 200)}</pre>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 text-xs mt-1">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
