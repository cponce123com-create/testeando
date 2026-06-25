import pg from 'pg'
const { Pool } = pg

// Pool de conexiones a Neon (PostgreSQL serverless)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Neon requiere SSL
})

// Helper para consultas con errores manejados
export async function query(text, params) {
  try {
    const result = await pool.query(text, params)
    return result
  } catch (error) {
    console.error('Error en DB query:', error.message)
    throw error
  }
}

export default pool
