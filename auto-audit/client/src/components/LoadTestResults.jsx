import { useState, useEffect } from 'react'
import api from '../utils/api'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

export default function LoadTestResults({ auditId }) {
  const [metricsList, setMetricsList] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMetrics = async () => {
    try {
      const data = await api.get(`/api/audits/${auditId}/metrics`)
      setMetricsList(data)
    } catch {
      // Silencioso
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 2000)
    return () => clearInterval(interval)
  }, [auditId])

  // Última métrica para las tarjetas
  const latest = metricsList[0]

  // Histórico para el gráfico (invertir a orden cronológico)
  const history = [...metricsList].reverse()

  const chartData = {
    labels: history.map((m) => m.created_at ? new Date(m.created_at).toLocaleTimeString() : '—'),
    datasets: [
      {
        label: 'Req/s',
        data: history.map((m) => m.requests_per_second),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        borderWidth: 2,
      },
      {
        label: 'Tiempo medio (ms)',
        data: history.map((m) => m.avg_response_time),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        borderWidth: 2,
        yAxisID: 'y1',
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { labels: { color: '#9ca3af', boxWidth: 12, padding: 12 } },
    },
    scales: {
      x: {
        ticks: { color: '#6b7280', maxTicksLimit: 8 },
        grid: { color: 'rgba(75, 85, 99, 0.2)' },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#6b7280' },
        grid: { color: 'rgba(75, 85, 99, 0.2)' },
        title: { display: true, text: 'Req/s', color: '#9ca3af' },
      },
      y1: {
        beginAtZero: true,
        position: 'right',
        ticks: { color: '#6b7280' },
        grid: { display: false },
        title: { display: true, text: 'ms', color: '#9ca3af' },
      },
    },
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!latest) {
    return (
      <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-8 text-center">
        <p className="text-gray-500 text-lg">⏳ Esperando métricas…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard label="Enviadas" value={latest.requests_sent} color="text-blue-400" />
        <MetricCard label="Exitosas (2xx/3xx)" value={latest.success_count} color="text-green-400" />
        <MetricCard label="Fallidas (4xx/5xx)" value={latest.failure_count} color="text-red-400" />
        <MetricCard label="Tiempo medio" value={`${Math.round(latest.avg_response_time || 0)} ms`} color="text-indigo-400" />
        <MetricCard label="Throughput" value={`${(latest.requests_per_second || 0).toFixed(1)} req/s`} color="text-emerald-400" />
      </div>

      {history.length > 1 && (
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Rendimiento en tiempo real</h3>
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, color }) {
  return (
    <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value ?? '—'}</p>
    </div>
  )
}
