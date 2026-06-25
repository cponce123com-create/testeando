import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'

const MODULES = [
  { id: 'port_scan', label: 'Escaneo de puertos', desc: 'Descubre puertos abiertos TCP/UDP' },
  { id: 'subdomain_scan', label: 'Subdominios', desc: 'Enumeración de subdominios' },
  { id: 'directory_scan', label: 'Directorios', desc: 'Fuerza bruta de directorios ocultos' },
  { id: 'cve_check', label: 'Vulnerabilidades (CVE)', desc: 'Chequeo de vulnerabilidades conocidas' },
  { id: 'service_detect', label: 'Detección de servicios', desc: 'Identifica servicios y versiones' },
]

export default function CreateNettackerScan() {
  const { domainId } = useParams()
  const navigate = useNavigate()
  const [selectedModules, setSelectedModules] = useState(['port_scan', 'subdomain_scan', 'directory_scan'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleModule = (id) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedModules.length === 0) return setError('Selecciona al menos un módulo.')

    setLoading(true)
    setError('')
    try {
      const data = await api.post(`/api/domain/${domainId}/audits`, {
        type: 'nettacker_scan',
        config: { target: '', modules: selectedModules },
      })
      navigate(`/dominio/${domainId}/auditoria/${data.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition text-sm">← Volver</button>
        <h1 className="text-xl font-bold text-white">Nuevo escaneo Nettacker</h1>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Módulos de escaneo</h2>
          <p className="text-gray-500 text-xs mb-4">Selecciona qué módulos ejecutar en el objetivo.</p>
          <div className="space-y-2">
            {MODULES.map((mod) => (
              <label key={mod.id}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition ${
                  selectedModules.includes(mod.id)
                    ? 'bg-indigo-600/10 border-indigo-600/40'
                    : 'bg-gray-800/40 border-gray-700 hover:border-gray-600'
                }`}>
                <input type="checkbox" checked={selectedModules.includes(mod.id)}
                  onChange={() => toggleModule(mod.id)}
                  className="mt-1 accent-indigo-500" />
                <div>
                  <p className="text-white text-sm font-medium">{mod.label}</p>
                  <p className="text-gray-500 text-xs">{mod.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition shadow-lg shadow-indigo-900/30">
          {loading ? 'Iniciando escaneo…' : '🚀 Iniciar escaneo Nettacker'}
        </button>
      </form>
    </main>
  )
}
