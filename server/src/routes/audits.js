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

// Tipos de auditoría soportados
const AUDIT_TYPES = [
  'fuerza_bruta',
  'carga',
  'escaneo_puertos',
  'enumeracion',
  'auditoria_headers',
  'api_scanner',
  'busqueda_secretos',
  'nettacker_scan',
  'titus_scan',
]
// POST /api/domains/:domainId/audits — Crear auditoría
router.post('/domain/:domainId/audits', async (req, res) => {
  if (!(await verifyDomainOwnership(req.params.domainId, req.userId))) {
    return res.status(404).json({ error: 'Dominio no encontrado.' })
  }

  const { type, config } = req.body
  if (!type || !AUDIT_TYPES.includes(type)) {
    return res.status(400).json({ error: `Tipo inválido. Tipos válidos: ${AUDIT_TYPES.join(', ')}` })
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

// POST /api/domains/:domainId/full-scan — Crear todas las auditorías de una vez
router.post('/domain/:domainId/full-scan', async (req, res) => {
  if (!(await verifyDomainOwnership(req.params.domainId, req.userId))) {
    return res.status(404).json({ error: 'Dominio no encontrado.' })
  }

  // Obtener la URL del dominio para armar configs por defecto
  const domainRes = await query('SELECT url FROM domains WHERE id = $1', [req.params.domainId])
  if (domainRes.rows.length === 0) {
    return res.status(404).json({ error: 'Dominio no encontrado.' })
  }
  const domainUrl = domainRes.rows[0].url

  try {
    const parsedUrl = new URL(domainUrl)
    const hostname = parsedUrl.hostname
    const baseUrl = domainUrl.replace(/\/+$/, '')

    const audits = [
      {
        type: 'auditoria_headers',
        config: { targetUrl: domainUrl },
      },
      {
        type: 'busqueda_secretos',
        config: { targetUrl: domainUrl, scanType: 'web', depth: 1 },
      },
      {
        type: 'carga',
        config: { targetUrl: domainUrl, httpMethod: 'GET', concurrentUsers: 5, duration: 15 },
      },
      {
        type: 'escaneo_puertos',
        config: {
          target: hostname,
          ports: '21,22,25,53,80,110,143,443,993,995,1433,1521,3306,3389,5432,6379,8080,8443,27017',
          timeout: 1500,
        },
      },
      {
        type: 'enumeracion',
        config: {
          domain: hostname,
          wordlist: ['www', 'mail', 'admin', 'api', 'blog', 'ftp', 'dev', 'test', 'app', 'cdn',
                     'web', 'portal', 'backup', 'secure', 'staging', 'vpn', 'docs', 'status', 'support', 'help'],
        },
      },
      {
        type: 'api_scanner',
        config: {
          baseUrl,
          endpoints: ['api', 'api/v1', 'api/health', 'health', '.env', 'robots.txt', 'sitemap.xml'],
          methods: ['GET', 'POST'],
        },
      },
      {
        type: 'nettacker_scan',
        config: {
          target: hostname,
          modules: ['port_scan', 'subdomain_scan', 'directory_scan', 'cve_check'],
        },
      },
      {
        type: 'titus_scan',
        config: { targetUrl: domainUrl },
      },
      {
        type: 'brutus_scan',
        config: {
          target: hostname,
          protocol: 'ssh',
          usernames: ['root', 'admin', 'ubuntu', 'deploy'],
          passwords: ['admin', 'root', 'password', '123456', 'toor'],
          mode: 'cautious',
        },
      },
    ]

    const created = []
    for (const audit of audits) {
      const result = await query(
        `INSERT INTO audits (domain_id, type, config)
         VALUES ($1, $2, $3) RETURNING id, type, status, created_at`,
        [req.params.domainId, audit.type, JSON.stringify(audit.config)]
      )
      created.push(result.rows[0])
    }

    res.status(201).json({ created: created.length, audits: created })
  } catch (err) {
    console.error('Error en full-scan:', err.message)
    res.status(500).json({ error: 'Error al crear auditorías masivas.' })
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
