import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'

export default function CreateSecretsScan() {
  const { domainId } = useParams()
  const navigate = useNavigate()

  const [targetUrl, setTargetUrl] = useState('')
  const [scanType, setScanType] = useState('web')
  const [depth, setDepth] = useState(2)
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
        type: 'busqueda_secretos',
        config: {
          targetUrl: targetUrl.trim(),
          scanType,
          depth: Number(depth),
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
      <h1 className="text-2xl font-bold text-white mb-2">Busqueda de secretos expuestos</h1>
      <p className="text-gray-400 text-sm mb-6">Escanea paginas web y repositorios en busca de API keys, tokens, contrasenas y datos sensibles expuestos.</p>

      {error && <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm mb-6">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">URL objetivo</label>
          <input type="text" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://miweb.com"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de escaneo</label>
          <select value={scanType} onChange={(e) => setScanType(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
            <option value="web">Pagina web (HTML + JS)</option>
            <option value="git">Repositorio Git expuesto</option>
            <option value="both">Ambos</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Profundidad de escaneo</label>
          <input type="number" value={depth} onChange={(e) => setDepth(e.target.value)} min={1} max={5}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
          <p className="text-xs text-gray-500 mt-1">A mayor profundidad, mas paginas se revisaran</p>
        </div>

        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Patrones que se buscaran:</h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <span>• API Keys (AWS, Google, Stripe...)</span>
            <span>• Tokens JWT</span>
            <span>• Contrasenas en texto plano</span>
            <span>• Credenciales de BD</span>
            <span>• Secret keys de frameworks</span>
            <span>• Tokens de acceso</span>
            <span>• Variables de entorno</span>
            <span>• Comentarios con credenciales</span>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition">Cancelar</button>
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition shadow-lg shadow-amber-900/20 flex-1">
            {loading ? 'Buscando...' : 'Buscar secretos'}
          </button>
        </div>
      </form>
    </main>
  )
}
