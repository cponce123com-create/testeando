import { Router } from 'express'
import { query } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// Todas las rutas requieren autenticación
router.use(authMiddleware)

// GET /api/domains — Listar dominios del usuario
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, url, created_at FROM domains WHERE owner_id = $1 ORDER BY created_at DESC',
      [req.userId]
    )
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Error al obtener dominios.' })
  }
})

// POST /api/domains — Crear dominio
router.post('/', async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'URL es obligatoria.' })

  try {
    const result = await query(
      'INSERT INTO domains (owner_id, url) VALUES ($1, $2) RETURNING id, url, created_at',
      [req.userId, url.trim()]
    )
    res.status(201).json(result.rows[0])
  } catch {
    res.status(500).json({ error: 'Error al crear dominio.' })
  }
})

// DELETE /api/domains/:id — Eliminar dominio (solo propietario)
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM domains WHERE id = $1 AND owner_id = $2 RETURNING id',
      [req.params.id, req.userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dominio no encontrado.' })
    }
    res.json({ message: 'Dominio eliminado.' })
  } catch {
    res.status(500).json({ error: 'Error al eliminar dominio.' })
  }
})

export default router
