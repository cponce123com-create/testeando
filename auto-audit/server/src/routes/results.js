import { Router } from 'express'
import { query } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

// Helper: verifica que el usuario tenga acceso a la auditoría
async function verifyAuditAccess(auditId, userId) {
  const result = await query(
    `SELECT a.id FROM audits a
     JOIN domains d ON a.domain_id = d.id
     WHERE a.id = $1 AND d.owner_id = $2`,
    [auditId, userId]
  )
  return result.rows.length > 0
}

// GET /api/audits/:id/attempts — Intentos de fuerza bruta
router.get('/audits/:id/attempts', async (req, res) => {
  if (!(await verifyAuditAccess(req.params.id, req.userId))) {
    return res.status(404).json({ error: 'Auditoría no encontrada.' })
  }

  try {
    const result = await query(
      `SELECT id, username, password, status_code, success, created_at
       FROM attempts WHERE audit_id = $1 ORDER BY created_at DESC LIMIT 200`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Error al obtener intentos.' })
  }
})

// GET /api/audits/:id/metrics — Métricas de prueba de carga
router.get('/audits/:id/metrics', async (req, res) => {
  if (!(await verifyAuditAccess(req.params.id, req.userId))) {
    return res.status(404).json({ error: 'Auditoría no encontrada.' })
  }

  try {
    const result = await query(
      `SELECT id, requests_sent, success_count, failure_count,
              avg_response_time, requests_per_second, created_at
       FROM metrics WHERE audit_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Error al obtener métricas.' })
  }
})

// GET /api/audits/:id/scan-results — Resultados de escaneo de puertos
router.get('/audits/:id/scan-results', async (req, res) => {
  if (!(await verifyAuditAccess(req.params.id, req.userId))) {
    return res.status(404).json({ error: 'Auditoría no encontrada.' })
  }

  try {
    const result = await query(
      `SELECT id, port, protocol, service, state, created_at
       FROM scan_results WHERE audit_id = $1 ORDER BY port ASC`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Error al obtener resultados de escaneo.' })
  }
})

// GET /api/audits/:id/enum-results — Resultados de enumeración
router.get('/audits/:id/enum-results', async (req, res) => {
  if (!(await verifyAuditAccess(req.params.id, req.userId))) {
    return res.status(404).json({ error: 'Auditoría no encontrada.' })
  }

  try {
    const result = await query(
      `SELECT id, subdomain, ip_address, source, created_at
       FROM enum_results WHERE audit_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Error al obtener resultados de enumeración.' })
  }
})

// GET /api/audits/:id/header-results — Resultados de auditoría de headers HTTP
router.get('/audits/:id/header-results', async (req, res) => {
  if (!(await verifyAuditAccess(req.params.id, req.userId))) {
    return res.status(404).json({ error: 'Auditoría no encontrada.' })
  }
  try {
    const result = await query(
      `SELECT id, header_name, value, status, recommendation, created_at
       FROM header_results WHERE audit_id = $1 ORDER BY
         CASE status
           WHEN 'missing' THEN 1 WHEN 'weak' THEN 2 WHEN 'present' THEN 3
           ELSE 4
         END`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Error al obtener resultados de headers.' })
  }
})

// GET /api/audits/:id/api-scan-results — Resultados de escaneo de API
router.get('/audits/:id/api-scan-results', async (req, res) => {
  if (!(await verifyAuditAccess(req.params.id, req.userId))) {
    return res.status(404).json({ error: 'Auditoría no encontrada.' })
  }
  try {
    const result = await query(
      `SELECT id, endpoint, method, status_code, issues, created_at
       FROM api_scan_results WHERE audit_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Error al obtener resultados de API scan.' })
  }
})

// GET /api/audits/:id/secret-results — Resultados de búsqueda de secretos
router.get('/audits/:id/secret-results', async (req, res) => {
  if (!(await verifyAuditAccess(req.params.id, req.userId))) {
    return res.status(404).json({ error: 'Auditoría no encontrada.' })
  }
  try {
    const result = await query(
      `SELECT id, secret_type, location, snippet, severity, created_at
       FROM secret_results WHERE audit_id = $1 ORDER BY
         CASE severity
           WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4
           ELSE 5
         END`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Error al obtener resultados de secretos.' })
  }
})

export default router
