import 'dotenv/config'
import { query } from './db.js'

try {
  const u = await query('SELECT id, email, created_at FROM users')
  console.log('USUARIOS:', u.rows.length)
  for (const r of u.rows) {
    console.log('  -', r.id, r.email, r.created_at)
  }

  const t = await query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
  console.log('TABLAS (' + t.rows.length + '):')
  for (const r of t.rows) {
    console.log('  -', r.table_name)
  }
} catch (e) {
  console.log('ERROR:', e.code, (e.message || '').slice(0, 200))
}
process.exit(0)
