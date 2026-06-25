import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import authRoutes from './routes/auth.js'
import domainRoutes from './routes/domains.js'
import auditRoutes from './routes/audits.js'
import resultRoutes from './routes/results.js'

const app = express()
const PORT = process.env.PORT || 3001

// CORS: permite el frontend en desarrollo y producción
app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: true,
}))
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
