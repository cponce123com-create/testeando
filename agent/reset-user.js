import bcrypt from 'bcrypt'
import { query } from './db.js'

const email = 'cponce@testeando.pe'
const password = 'Hadrones456%'

try {
  console.log('Conectando a Neon...')
  const test = await query('SELECT 1 as test')
  console.log('Conexion OK:', test.rows[0].test)

  // Eliminar usuario existente
  const del = await query('DELETE FROM users WHERE email = $1 RETURNING id', [email])
  if (del.rows.length > 0) {
    console.log('Usuario existente eliminado (ID: ' + del.rows[0].id + ')')
  } else {
    console.log('No habia usuario previo')
  }

  // Crear usuario nuevo
  console.log('Generando hash...')
  const hash = await bcrypt.hash(password, 10)
  console.log('Hash:', hash)

  const result = await query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
    [email, hash]
  )
  console.log('Usuario creado:')
  console.log('  ID: ' + result.rows[0].id)
  console.log('  Email: ' + result.rows[0].email)
  console.log('  Creado: ' + result.rows[0].created_at)

  // Verificar que el hash funciona
  const valid = await bcrypt.compare(password, hash)
  console.log('Verificacion password:', valid ? 'OK' : 'FALLO')

  process.exit(0)
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
}
