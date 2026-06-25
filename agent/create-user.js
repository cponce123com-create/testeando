import bcrypt from 'bcrypt'
import { query } from './db.js'

const email = 'cponce@testeando.pe'
const password = 'Hadrones456%'

try {
  console.log('Conectando a Neon...')
  const test = await query('SELECT 1 as test')
  console.log('Conexion OK:', test.rows[0].test)

  const existing = await query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    console.log('El usuario ya existe (ID: ' + existing.rows[0].id + ')')
    process.exit(0)
  }

  console.log('Generando hash...')
  const hash = await bcrypt.hash(password, 10)
  console.log('Hash generado')

  const result = await query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
    [email, hash]
  )
  console.log('Usuario creado:')
  console.log('  ID: ' + result.rows[0].id)
  console.log('  Email: ' + result.rows[0].email)
  console.log('  Creado: ' + result.rows[0].created_at)
  process.exit(0)
} catch (err) {
  console.error('Error detallado:')
  console.error('  Mensaje:', err.message)
  console.error('  Stack:', (err.stack || '').slice(0, 300))
  process.exit(1)
}
