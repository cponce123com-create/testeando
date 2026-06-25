import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'

export default function CreateHeadersAudit() {
  const { domainId } = useParams()
  const navigate = useNavigate()

  const [targetUrl, setTargetUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!targetUrl.trim()) return setError('La URL objetivo es obligatoria.')
    try { new URL(targetUrl.trim()) } catch { return setError('URL invalida.') }

    setLoading(true)
    try {
      const result = await api.post(`/api/domain/${domainId}/audits`, {
        type: 'auditoria_headers',
        config: { targetUrl: targetUrl.trim() },
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
      <h1 className="text-2xl font-bold text-white mb-2">Auditoria de cabeceras HTTP</h1>
      <p className="text-gray-400 text-sm mb-6">Analiza las cabeceras de seguridad de una URL y detecta las que faltan o estan debiles.</p>

      {error && <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm mb-6">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">URL objetivo</label>
          <input type="text" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://miweb.com"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>

        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Cabeceras que se revisaran:</h3>
          <ul className="text-xs text-gray-500 space-y-1">
            <li><span className="text-gray-400 font-mono">Strict-Transport-Security</span> — HSTS</li>
            <li><span className="text-gray-400 font-mono">Content-Security-Policy</span> — CSP</li>
            <li><span className="text-gray-400 font-mono">X-Frame-Options</span> — Clickjacking</li>
            <li><span className="text-gray-400 font-mono">X-Content-Type-Options</span> — MIME sniffing</li>
            <li><span className="text-gray-400 font-mono">Referrer-Policy</span> — Privacidad de referer</li>
            <li><span className="text-gray-400 font-mono">Permissions-Policy</span> — Restriccion de APIs</li>
            <li><span className="text-gray-400 font-mono">Cache-Control</span> — Cacheo</li>
            <li>Y mas...</li>
          </ul>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition">Cancelar</button>
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition shadow-lg shadow-orange-900/20 flex-1">
            {loading ? 'Analizando...' : 'Analizar cabeceras'}
          </button>
        </div>
      </form>
    </main>
  )
}
