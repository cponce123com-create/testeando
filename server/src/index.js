import 'dotenv/config'
import express from 'express'

import authRoutes from './routes/auth.js'
import domainRoutes from './routes/domains.js'
import auditRoutes from './routes/audits.js'
import resultRoutes from './routes/results.js'

const app = express()
const PORT = process.env.PORT || 3001

// CORS manual — maneja preflight (OPTIONS) explícitamente
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') {
    console.log('➡️ Preflight OPTIONS desde:', origin)
    return res.status(200).end()
  }
  next()
})
app.use(express.json())

// Rutas
app.use('/api/auth', authRoutes)
app.use('/api/domains', domainRoutes)
app.use('/api', auditRoutes)   // /api/domains/:domainId/audits, /api/audits/:id
app.use('/api', resultRoutes)  // /api/audits/:id/attempts, /api/audits/:id/metrics

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Manejador global de errores — siempre devuelve JSON, nunca HTML ni cuerpo vacío
app.use((err, _req, res, _next) => {
  console.error('Error no capturado:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor.',
  })
})

app.listen(PORT, () => {
  console.log(`🚀 AutoAudit API corriendo en http://localhost:${PORT}`)
})
