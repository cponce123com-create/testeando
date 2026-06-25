import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import authRoutes from './routes/auth.js'
import domainRoutes from './routes/domains.js'
import auditRoutes from './routes/audits.js'
import resultRoutes from './routes/results.js'

const app = express()
const PORT = process.env.PORT || 3001
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

// Middlewares globales
app.use(cors({ origin: CLIENT_URL, credentials: true }))
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

app.listen(PORT, () => {
  console.log(`🚀 AutoAudit API corriendo en http://localhost:${PORT}`)
})
