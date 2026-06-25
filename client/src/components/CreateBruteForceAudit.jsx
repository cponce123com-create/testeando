import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'

// Helper: split text by newlines regardless of OS
function splitLines(text) {
  return text.split(/\x0d?\x0a/).map(s => s.trim()).filter(Boolean)
}

export default function CreateBruteForceAudit() {
  const { domainId } = useParams()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [endpointUrl, setEndpointUrl] = useState('')
  const [httpMethod, setHttpMethod] = useState('POST')
  const [usernameField, setUsernameField] = useState('username')
  const [passwordField, setPasswordField] = useState('password')
  const [usernames, setUsernames] = useState('')
  const [passwords, setPasswords] = useState('')
  const [delayMs, setDelayMs] = useState(1000)
  const [maxAttempts, setMaxAttempts] = useState(100)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPasswords(ev.target.result)
    reader.readAsText(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!endpointUrl.trim()) return setError('URL del endpoint obligatoria.')
    if (!usernames.trim()) return setError('Debes introducir al menos un usuario.')
    if (!passwords.trim()) return setError('Debes introducir al menos una contraseña.')

    const userList = splitLines(usernames)
    const passList = splitLines(passwords)
    if (userList.length < 1) return setError('Al menos un usuario.')
    if (passList.length < 1) return setError('Al menos una contraseña.')

    setLoading(true)
    try {
      const result = await api.post(`/api/domain/${domainId}/audits`, {
        type: 'fuerza_bruta',
        config: {
          endpointUrl: endpointUrl.trim(),
          httpMethod,
          usernameField: usernameField.trim(),
          passwordField: passwordField.trim(),
          usernames: userList,
          passwords: passList,
          delayMs: Number(delayMs),
          maxAttempts: Number(maxAttempts),
        },
      })
      navigate(`/dominio/${domainId}/auditoria/${result.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const passCount = splitLines(passwords).length

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Nueva auditoria — Fuerza bruta</h1>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">URL del endpoint de login</label>
          <input type="text" value={endpointUrl} onChange={(e) => setEndpointUrl(e.target.value)} placeholder="/login"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Metodo HTTP</label>
          <select value={httpMethod} onChange={(e) => setHttpMethod(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="POST">POST</option>
            <option value="GET">GET</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Campo de usuario</label>
            <input type="text" value={usernameField} onChange={(e) => setUsernameField(e.target.value)} placeholder="username"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Campo de contrasena</label>
            <input type="text" value={passwordField} onChange={(e) => setPasswordField(e.target.value)} placeholder="password"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Lista de usuarios <span className="text-gray-500">(uno por linea)</span></label>
          <textarea value={usernames} onChange={(e) => setUsernames(e.target.value)} rows={4} placeholder="admin&#10;usuario&#10;root"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Diccionario de contrasenas</label>
          <textarea value={passwords} onChange={(e) => setPasswords(e.target.value)} rows={6}
            placeholder="123456&#10;password&#10;admin&#10;letmein"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm mb-2" />
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition">Cargar archivo .txt</button>
            <input ref={fileRef} type="file" accept=".txt" onChange={handleFile} className="hidden" />
            {passCount > 0 && <span className="text-xs text-gray-500">{passCount} contrasenas</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Retardo <span className="text-gray-500">(ms)</span></label>
            <input type="number" value={delayMs} onChange={(e) => setDelayMs(e.target.value)} min={0} max={30000}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Max. intentos <span className="text-gray-500">(total)</span></label>
            <input type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} min={1}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition">Cancelar</button>
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition shadow-lg shadow-indigo-900/20 flex-1">
            {loading ? 'Creando...' : 'Crear auditoria'}
          </button>
        </div>
      </form>
    </main>
  )
}
