import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'

export default function Dashboard() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [scanningDomain, setScanningDomain] = useState(null)

  const fetchDomains = async () => {
    try {
      const data = await api.get('/api/domains')
      setDomains(data)
    } catch {
      // Silencioso
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDomains()
    const interval = setInterval(fetchDomains, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    const trimmed = url.trim()
    if (!trimmed) return setError('Introduce una URL.')
    try {
      new URL(trimmed)
    } catch {
      return setError('URL inválida.')
    }

    setAdding(true)
    try {
      await api.post('/api/domains', { url: trimmed })
      setUrl('')
      await fetchDomains()
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este dominio?')) return
    try {
      await api.del(`/api/domains/${id}`)
      await fetchDomains()
    } catch {
      // Silencioso
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Mis Dominios</h1>
      <p className="text-gray-400 text-sm mb-8">Gestiona los dominios que deseas auditar.</p>

      {/* Añadir dominio */}
      <section className="bg-gray-900/40 border border-gray-800 rounded-xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Añadir nuevo dominio</h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://miweb.com"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
          </div>
          <button type="submit" disabled={adding}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition shadow-lg shadow-indigo-900/20 whitespace-nowrap">
            {adding ? 'Añadiendo…' : 'Añadir dominio'}
          </button>
          {error && <p className="text-red-400 text-sm self-center">{error}</p>}
        </form>
      </section>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : domains.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl">🌐</span>
          <p className="text-gray-400 mt-4 text-lg">No tienes dominios añadidos aún.</p>
          <p className="text-gray-500 text-sm mt-1">Añade tu primer dominio arriba.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {domains.map((domain) => (
            <div key={domain.id}
              className="bg-gray-800/60 backdrop-blur border border-gray-700 rounded-xl p-4 flex items-center justify-between hover:border-gray-600 transition group">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl flex-shrink-0">🌐</span>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{domain.url}</p>
                  <p className="text-gray-500 text-xs">
                    Añadido {domain.created_at ? new Date(domain.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleFullScan(domain.id)}
                  disabled={scanningDomain === domain.id}
                  className="px-3 py-1.5 text-sm bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-lg transition disabled:opacity-50 disabled:cursor-wait whitespace-nowrap">
                  {scanningDomain === domain.id ? 'Escaneando…' : '🚀 Full Scan'}
                </button>
                <Link to={`/dominio/${domain.id}/auditorias`}
                  className="px-3 py-1.5 text-sm bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg transition">
                  Ver auditorías
                </Link>
                <button onClick={() => handleDelete(domain.id)}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition opacity-0 group-hover:opacity-100">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
