import { query } from './db.js'
import { isCancelled } from '../../agent/utils/cancellation.js'

// Importar runners
import { runBruteForce } from '../../agent/runners/brute-force.js'
import { runLoadTest } from '../../agent/runners/load-test.js'
import { runPortScan } from '../../agent/runners/port-scan.js'
import { runEnumeration } from '../../agent/runners/enumeration.js'
import { runHeadersAudit } from '../../agent/runners/headers-audit.js'
import { runApiScan } from '../../agent/runners/api-scan.js'
import { runSecretsScan } from '../../agent/runners/secrets-scan.js'

const POLL_INTERVAL = (parseInt(process.env.POLL_INTERVAL || '3', 10)) * 1000

const RUNNERS = {
  fuerza_bruta: runBruteForce,
  carga: runLoadTest,
  escaneo_puertos: runPortScan,
  enumeracion: runEnumeration,
  auditoria_headers: runHeadersAudit,
  api_scanner: runApiScan,
  busqueda_secretos: runSecretsScan,
}

async function processAudit(audit) {
  const runner = RUNNERS[audit.type]
  if (!runner) {
    console.log(`  Tipo desconocido: ${audit.type}`)
    await query("UPDATE audits SET status = $1, updated_at = NOW() WHERE id = $2", ['cancelada', audit.id])
    return
  }

  console.log(`  Ejecutando ${audit.type} (ID ${audit.id})`)
  await query("UPDATE audits SET status = $1, updated_at = NOW() WHERE id = $2", ['en_progreso', audit.id])

  try {
    await runner(audit)
    const check = await query('SELECT status FROM audits WHERE id = $1', [audit.id])
    if (check.rows[0]?.status !== 'cancelada') {
      await query("UPDATE audits SET status = $1, updated_at = NOW() WHERE id = $2", ['completada', audit.id])
      console.log(`  Completada ${audit.type} (ID ${audit.id})`)
    }
  } catch (err) {
    console.error(`  Error en ${audit.type}:`, err.message)
    await query("UPDATE audits SET status = $1, updated_at = NOW() WHERE id = $2", ['cancelada', audit.id])
  }
}

async function poll() {
  try {
    const result = await query(
      "SELECT * FROM audits WHERE status = 'pendiente' ORDER BY created_at ASC LIMIT 5"
    )
    for (const audit of result.rows) {
      await processAudit(audit)
    }
  } catch (err) {
    console.error('Error en polling:', err.message)
  }
}

export function startAgent() {
  console.log(`🤖 AutoAudit Agent iniciado (polling cada ${POLL_INTERVAL / 1000}s)`)
  poll()
  setInterval(poll, POLL_INTERVAL)
}
