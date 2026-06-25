import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'

const COMMON_PORTS = [
  { label: 'Comunes (web)', value: '80,443,8080,8443' },
  { label: 'Todos los comunes', value: '21,22,23,25,53,80,110,143,443,445,993,995,1433,1521,3306,3389,5432,6379,8080,8443,27017' },
  { label: 'Rango personalizado', value: 'custom' },
]

export default function CreatePortScan() {
  const { domainId } = useParams()
  const navigate = useNavigate()

  const [target, setTarget] = useState('')
  const [portMode, setPortMode] = useState('80,443,8080,8443')
  const [customPorts, setCustomPorts] = useState('')
  const [scanType, setScanType] = useState('syn')
  const [timeout, setTimeout_] = useState(2000)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePreset = (value) => {
    if (value === 'custom') {
      setPortMode('custom')
    } else {
      setPortMode(value)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!target.trim()) return setError('El objetivo es obligatorio.')

    const ports = portMode === 'custom' ? customPorts : portMode
    if (!ports.trim()) return setError('Especifica los puertos a escanear.')

    setLoading(true)
    try {
      const result = await api.post(`/api/domain/${domainId}/audits`, {
        type: 'escaneo_puertos',
        config: {
          target: target.trim(),
          ports: ports,
          scanType,
          timeout: Number(timeout),
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
      <h1 className="text-2xl font-bold text-white mb-6">Nueva auditoria — Escaneo de puertos</h1>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Objetivo (IP o dominio)</label>
          <input type="text" value={target} onChange={(e) => setTarget(e.target.value)}
            placeholder="miweb.com o 192.168.1.1"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Puertos</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {COMMON_PORTS.map((p) => (
              <button key={p.label} type="button" onClick={() => handlePreset(p.value)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                  portMode === p.value
                    ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          {portMode === 'custom' && (
            <input type="text" value={customPorts} onChange={(e) => setCustomPorts(e.target.value)}
              placeholder="21,22,25,80,443,8080"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm" />
          )}
          {portMode !== 'custom' && (
            <p className="text-xs text-gray-500">Puertos: {portMode}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de escaneo</label>
            <select value={scanType} onChange={(e) => setScanType(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
              <option value="syn">SYN (rápido)</option>
              <option value="tcp">TCP Connect</option>
              <option value="udp">UDP</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Timeout <span className="text-gray-500">(ms)</span></label>
            <input type="number" value={timeout} onChange={(e) => setTimeout_(e.target.value)} min={500} max={30000}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition">Cancelar</button>
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition shadow-lg shadow-cyan-900/20 flex-1">
            {loading ? 'Creando...' : 'Iniciar escaneo'}
          </button>
        </div>
      </form>
    </main>
  )
}
