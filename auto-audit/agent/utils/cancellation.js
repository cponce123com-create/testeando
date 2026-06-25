import { query } from '../db.js'

export async function isCancelled(auditId) {
  const result = await query('SELECT status FROM audits WHERE id = $1', [auditId])
  return result.rows[0]?.status === 'cancelada'
}
