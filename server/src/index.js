import 'dotenv/config'
import express from 'express'
import rateLimit from 'express-rate-limit'

import authRoutes from './routes/auth.js'
import domainRoutes from './routes/domains.js'
import auditRoutes from './routes/audits.js'
import resultRoutes from './routes/results.js'
import { startAgent } from './agent.js'
import { bootstrapTools } from './bootstrap.js'

const app = express()
const PORT = process.env.PORT || 3001

// Rate limiting para endpoints de autenticación (previene fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,                   // máximo 20 intentos por IP
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
})

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
app.use('/api/auth', authLimiter, authRoutes)
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

app.listen(PORT, async () => {
  console.log(`🚀 AutoAudit API corriendo en http://localhost:${PORT}`)

  // Ejecutar migraciones de BD
  try {
    console.log('🔄 Ejecutando migraciones de BD...')
    await runMigrations()
    console.log('✅ Migraciones completadas')
  } catch (err) {
    console.error('❌ Error en migraciones:', err.message)
  }

  // Descargar herramientas externas
  await bootstrapTools()
  startAgent()
})

async function runMigrations() {
  await query(`CREATE TABLE IF NOT EXISTS nettacker_results (id SERIAL PRIMARY KEY, audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE, module VARCHAR(100) NOT NULL, host VARCHAR(255), port INTEGER, service VARCHAR(100), vulnerability TEXT, severity VARCHAR(20), extra JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW())`)
  await query(`CREATE TABLE IF NOT EXISTS titus_results (id SERIAL PRIMARY KEY, audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE, rule_id VARCHAR(200), rule_name VARCHAR(200) NOT NULL, match TEXT, file_path TEXT, line_number INTEGER, severity VARCHAR(20) DEFAULT 'medium', score INTEGER, extra JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW())`)
  await query(`CREATE TABLE IF NOT EXISTS brutus_results (id SERIAL PRIMARY KEY, audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE, protocol VARCHAR(30) NOT NULL, target VARCHAR(255) NOT NULL, username VARCHAR(255), password TEXT, success BOOLEAN DEFAULT FALSE, banner TEXT, duration_ms INTEGER, extra JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW())`)
}
