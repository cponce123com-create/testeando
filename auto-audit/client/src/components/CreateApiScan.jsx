import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'

export default function CreateApiScan() {
  const { domainId } = useParams()
  const navigate = useNavigate()

  const [baseUrl, setBaseUrl] = useState('')
  const DEFAULT_ENDPOINTS = ['/api/health', '/api/users', '/api/login', '/api/data'].join(String.fromCharCode(10))
  const [endpoints, setEndpoints] = useState(DEFAULT_ENDPOINTS)
  const [methods, setMethods] = useState(['GET', 'POST'])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleMethod = (m) => {
    setMethods((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!baseUrl.trim()) return setError('La URL base es obligatoria.')
    if (!endpoints.trim()) return setError('Introduce al menos un endpoint.')
    if (methods.length === 0) return setError('Selecciona al menos un metodo HTTP.')

    const list = endpoints.split(/\x0d?\x0a/).map((e) => e.trim()).filter(Boolean)
    if (list.length < 1) return setError('Al menos un endpoint.')

    setLoading(true)
    try {
      const result = await api.post(`/api/domain/${domainId}/audits`, {
        type: 'api_scanner',
        config: {
          baseUrl: baseUrl.trim(),
          endpoints: list,
          methods,
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
      <h1 className="text-2xl font-bold text-white mb-2">Escaneo de seguridad en API</h1>
      <p className="text-gray-400 text-sm mb-6">Prueba endpoints de API en busca de vulnerabilidades y malas practicas.</p>

      {error && <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm mb-6">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">URL base de la API</label>
          <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.miweb.com"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Metodos HTTP a probar</label>
          <div className="flex flex-wrap gap-2">
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
              <button key={m} type="button" onClick={() => toggleMethod(m)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                  methods.includes(m)
                    ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Endpoints <span className="text-gray-500">(uno por linea)</span>
          </label>
          <textarea value={endpoints} onChange={(e) => setEndpoints(e.target.value)} rows={6}
            placeholder="/api/health&#10;/api/users&#10;/api/login"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono text-sm" />
        </div>

        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Que se revisara:</h3>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Codigos de estado HTTP (5xx/4xx inesperados)</li>
            <li>• Cabeceras de seguridad ausentes</li>
            <li>• CORS mal configurado</li>
            <li>• Informacion sensible en respuestas</li>
            <li>• Rate limiting detectado</li>
          </ul>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition">Cancelar</button>
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition shadow-lg shadow-rose-900/20 flex-1">
            {loading ? 'Escaneando...' : 'Escanear API'}
          </button>
        </div>
      </form>
    </main>
  )
}
