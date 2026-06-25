import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'

export default function CreateLoadAudit() {
  const { domainId } = useParams()
  const navigate = useNavigate()

  const [targetUrl, setTargetUrl] = useState('')
  const [httpMethod, setHttpMethod] = useState('GET')
  const [concurrentUsers, setConcurrentUsers] = useState(50)
  const [duration, setDuration] = useState(60)
  const [maxRps, setMaxRps] = useState(0)
  const [headers, setHeaders] = useState([{ key: '', value: '' }])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const addHeader = () => setHeaders([...headers, { key: '', value: '' }])
  const removeHeader = (i) => setHeaders(headers.filter((_, idx) => idx !== i))
  const updateHeader = (i, field, val) => {
    const h = [...headers]
    h[i] = { ...h[i], [field]: val }
    setHeaders(h)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!targetUrl.trim()) return setError('URL objetivo obligatoria.')
    try { new URL(targetUrl.trim()) } catch { return setError('URL inválida.') }

    const validHeaders = headers.filter((h) => h.key.trim() && h.value.trim())
    const headersObj = {}
    validHeaders.forEach((h) => { headersObj[h.key.trim()] = h.value.trim() })

    setLoading(true)
    try {
      const result = await api.post(`/api/domain/${domainId}/audits`, {
        type: 'carga',
        config: {
          targetUrl: targetUrl.trim(),
          httpMethod,
          concurrentUsers: Number(concurrentUsers),
          duration: Number(duration),
          maxRps: Number(maxRps),
          headers: headersObj,
        },
      })
      navigate(`/dominio/${domainId}/auditoria/${result.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Nueva auditoría — Prueba de carga</h1>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">URL objetivo</label>
          <input type="text" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://miweb.com/pagina"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Método HTTP</label>
          <select value={httpMethod} onChange={(e) => setHttpMethod(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="GET">GET</option><option value="POST">POST</option>
            <option value="PUT">PUT</option><option value="DELETE">DELETE</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Usuarios concurrentes</label>
            <input type="number" value={concurrentUsers} onChange={(e) => setConcurrentUsers(e.target.value)} min={1}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Duración <span className="text-gray-500">(seg)</span></label>
            <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min={1}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Max req/s <span className="text-gray-500">(0=∞)</span></label>
            <input type="number" value={maxRps} onChange={(e) => setMaxRps(e.target.value)} min={0}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-300">Headers personalizados</label>
            <button type="button" onClick={addHeader} className="text-xs text-emerald-400 hover:text-emerald-300 transition">+ Añadir header</button>
          </div>
          <div className="space-y-2">
            {headers.map((h, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={h.key} onChange={(e) => updateHeader(i, 'key', e.target.value)} placeholder="Authorization"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                <input type="text" value={h.value} onChange={(e) => updateHeader(i, 'value', e.target.value)} placeholder="Bearer token..."
                  className="flex-[2] px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                {headers.length > 1 && (
                  <button type="button" onClick={() => removeHeader(i)} className="px-2 text-gray-500 hover:text-red-400 transition">✕</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition">Cancelar</button>
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition shadow-lg shadow-emerald-900/20 flex-1">
            {loading ? 'Creando…' : 'Crear auditoría'}
          </button>
        </div>
      </form>
    </main>
  )
}
