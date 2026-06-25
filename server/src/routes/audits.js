import { Router } from 'express'
import { query } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

// Helper: verifica que el usuario sea propietario del dominio
async function verifyDomainOwnership(domainId, userId) {
  const result = await query(
    'SELECT id FROM domains WHERE id = $1 AND owner_id = $2',
    [domainId, userId]
  )
  return result.rows.length > 0
}

// GET /api/domains/:domainId/audits — Listar auditorías de un dominio
router.get('/domain/:domainId/audits', async (req, res) => {
  if (!(await verifyDomainOwnership(req.params.domainId, req.userId))) {
    return res.status(404).json({ error: 'Dominio no encontrado.' })
  }

  try {
    const result = await query(
      `SELECT id, type, status, config, created_at, updated_at
       FROM audits WHERE domain_id = $1 ORDER BY created_at DESC`,
      [req.params.domainId]
    )
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Error al obtener auditorías.' })
  }
})

// POST /api/domains/:domainId/audits — Crear auditoría
router.post('/domain/:domainId/audits', async (req, res) => {
  if (!(await verifyDomainOwnership(req.params.domainId, req.userId))) {
    return res.status(404).json({ error: 'Dominio no encontrado.' })
  }

  const { type, config } = req.body
  if (!type || !['fuerza_bruta', 'carga'].includes(type)) {
    return res.status(400).json({ error: 'Tipo inválido (fuerza_bruta o carga).' })
  }
  if (!config) {
    return res.status(400).json({ error: 'Config es obligatorio.' })
  }

  try {
    const result = await query(
      `INSERT INTO audits (domain_id, type, config)
       VALUES ($1, $2, $3) RETURNING id, type, status, config, created_at`,
      [req.params.domainId, type, JSON.stringify(config)]
    )
    res.status(201).json(result.rows[0])
  } catch {
    res.status(500).json({ error: 'Error al crear auditoría.' })
  }
})

// GET /api/audits/:id — Obtener detalle de una auditoría
router.get('/audits/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*, d.url AS domain_url
       FROM audits a JOIN domains d ON a.domain_id = d.id
       WHERE a.id = $1 AND d.owner_id = $2`,
      [req.params.id, req.userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Auditoría no encontrada.' })
    }
    res.json(result.rows[0])
  } catch {
    res.status(500).json({ error: 'Error al obtener auditoría.' })
  }
})

// PATCH /api/audits/:id/cancel — Cancelar auditoría
router.patch('/audits/:id/cancel', async (req, res) => {
  try {
    const result = await query(
      `UPDATE audits SET status = 'cancelada', updated_at = NOW()
       WHERE id = $1 AND domain_id IN (
         SELECT id FROM domains WHERE owner_id = $2
       ) AND status IN ('pendiente', 'en_progreso')
       RETURNING id, status, updated_at`,
      [req.params.id, req.userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Auditoría no encontrada o ya finalizada.' })
    }
    res.json(result.rows[0])
  } catch {
    res.status(500).json({ error: 'Error al cancelar auditoría.' })
  }
})

export default router
