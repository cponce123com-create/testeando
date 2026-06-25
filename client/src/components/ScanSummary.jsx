import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'

export default function ScanSummary({ domainId, audits }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!audits || audits.length === 0) {
      setLoading(false)
      return
    }
    loadSummary()
  }, [audits])

  async function loadSummary() {
    try {
      const completed = audits.filter(a => a.status === 'completada')
      if (completed.length === 0) { setLoading(false); return }

      const results = await Promise.allSettled(
        completed.map(async (audit) => {
          const endpoints = {
            fuerza_bruta: 'attempts',
            carga: 'metrics',
            escaneo_puertos: 'scan-results',
            enumeracion: 'enum-results',
            auditoria_headers: 'header-results',
            api_scanner: 'api-scan-results',
            busqueda_secretos: 'secret-results',
            nettacker_scan: 'nettacker-results',
            titus_scan: 'titus-results',
            brutus_scan: 'brutus-results',
            subfinder_scan: 'enum-results',
          }
          const ep = endpoints[audit.type]
          if (!ep) return null
          try {
            const data = await api.get(`/api/audits/${audit.id}/${ep}`)
            return { type: audit.type, data }
          } catch { return null }
        })
      )

      // Extraer vulnerabilidades criticas/altas
      const vulns = []
      for (const r of results) {
        if (r.status !== 'fulfilled' || !r.value) continue
        const { type, data } = r.value
        if (!Array.isArray(data)) continue

        if (type === 'header-results') {
          data.filter(h => h.status === 'missing' || h.status === 'weak').forEach(h =>
            vulns.push({ severity: h.status === 'missing' ? 'high' : 'medium', scanner: 'Headers', title: h.header_name, desc: h.recommendation })
          )
        }
        if (type === 'secret-results') {
          data.filter(s => s.severity === 'critical' || s.severity === 'high').forEach(s =>
            vulns.push({ severity: s.severity, scanner: 'Secretos', title: s.secret_type, desc: s.location })
          )
        }
        if (type === 'scan-results') {
          data.filter(p => p.state === 'open').forEach(p =>
            vulns.push({ severity: 'medium', scanner: 'Puertos', title: `Puerto ${p.port}/${p.protocol}`, desc: p.service || 'abierto' })
          )
        }
        if (type === 'api-scan-results') {
          data.filter(a => a.issues && a.issues.length > 0).forEach(a =>
            vulns.push({ severity: 'high', scanner: 'API', title: `${a.method} ${a.endpoint}`, desc: a.issues.join('; ') })
          )
        }
        if (type === 'titus-results' || type === 'nettacker-results') {
          data.filter(r => r.severity === 'critical' || r.severity === 'high').forEach(r =>
            vulns.push({
              severity: r.severity,
              scanner: type === 'titus-results' ? 'Titus' : 'Nettacker',
              title: r.rule_name || r.vulnerability || r.module || r.host,
              desc: r.match || r.service || r.vulnerability || ''
            })
          )
        }
        if (type === 'brutus-results') {
          data.filter(b => b.success).forEach(b =>
            vulns.push({ severity: 'critical', scanner: 'Brutus', title: `${b.protocol}:${b.username}`, desc: `Credencial valida en ${b.target}` })
          )
        }
        if (type === 'attempts') {
          data.filter(a => a.success).forEach(a =>
            vulns.push({ severity: 'critical', scanner: 'Fuerza Bruta', title: a.username, desc: `Password: ${a.password}` })
          )
        }
      }

      vulns.sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
        return (order[a.severity] ?? 5) - (order[b.severity] ?? 5)
      })

      setSummary(vulns.slice(0, 20))
    } catch {} finally {
      setLoading(false)
    }
  }

  if (loading) return null
  if (!summary || summary.length === 0) return null

  const critical = summary.filter(v => v.severity === 'critical').length
  const high = summary.filter(v => v.severity === 'high').length

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden mb-6">
      <div className="bg-gray-800/60 px-4 py-3 border-b border-gray-700 flex items-center gap-2">
        <span className="text-lg">⚠️</span>
        <h2 className="text-white font-semibold text-sm">Resumen de Vulnerabilidades</h2>
        {critical > 0 && <span className="ml-auto text-xs bg-red-600/20 text-red-300 px-2 py-0.5 rounded-full border border-red-700">{critical} críticas</span>}
        {high > 0 && <span className="text-xs bg-orange-600/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-700">{high} altas</span>}
        <span className="text-xs text-gray-400">{summary.length} hallazgos</span>
      </div>
      <div className="divide-y divide-gray-800/50 max-h-96 overflow-y-auto">
        {summary.map((v, i) => (
          <div key={i} className="px-4 py-2.5 flex items-start gap-3 hover:bg-gray-800/30 transition">
            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium whitespace-nowrap mt-0.5 ${
              v.severity === 'critical' ? 'bg-red-600/20 text-red-300 border-red-700' :
              v.severity === 'high' ? 'bg-orange-600/20 text-orange-300 border-orange-700' :
              'bg-yellow-600/20 text-yellow-300 border-yellow-700'
            }`}>{v.severity}</span>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{v.title}</p>
              <p className="text-gray-400 text-xs truncate">{v.desc}</p>
              <span className="text-gray-600 text-xs">{v.scanner}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
