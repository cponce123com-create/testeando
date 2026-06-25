import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'

const DEFAULT_WORDS = [
  'www','mail','ftp','admin','api','blog','dev','vpn','cdn','webmail',
  'ssh','dns','ns1','ns2','pop3','smtp','imap','git','jenkins','jira',
  'confluence','status','docs','wiki','forum',
]

export default function CreateEnumeration() {
  const { domainId } = useParams()
  const navigate = useNavigate()

  const [domain, setDomain] = useState('')
  const [enumType, setEnumType] = useState('subdominios')
  const [wordlist, setWordlist] = useState(DEFAULT_WORDS.join(String.fromCharCode(10)))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!domain.trim()) return setError('El dominio es obligatorio.')
    if (!wordlist.trim()) return setError('La wordlist no puede estar vacia.')

    const words = wordlist.split(/\x0d?\x0a/).map((w) => w.trim()).filter(Boolean)
    if (words.length < 1) return setError('La wordlist debe contener al menos una palabra.')

    setLoading(true)
    try {
      const result = await api.post(`/api/domain/${domainId}/audits`, {
        type: 'enumeracion',
        config: {
          domain: domain.trim().toLowerCase(),
          enumType,
          wordlist: words,
        },
      })
      navigate(`/dominio/${domainId}/auditoria/${result.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const wordCount = wordlist.split(/\x0d?\x0a/).filter(Boolean).length

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Nueva auditoria — Enumeracion</h1>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Dominio objetivo</label>
          <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)}
            placeholder="miweb.com"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de enumeracion</label>
          <select value={enumType} onChange={(e) => setEnumType(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="subdominios">Subdominios (DNS)</option>
            <option value="directorios">Directorios web</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Wordlist <span className="text-gray-500">(una por linea)</span>
          </label>
          <textarea value={wordlist} onChange={(e) => setWordlist(e.target.value)} rows={8}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm" />
          {wordCount > 0 && (
            <p className="text-xs text-gray-500 mt-1">{wordCount} palabras en la wordlist</p>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition">Cancelar</button>
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition shadow-lg shadow-purple-900/20 flex-1">
            {loading ? 'Creando...' : 'Iniciar enumeracion'}
          </button>
        </div>
      </form>
    </main>
  )
}
