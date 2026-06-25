import { query } from './db.js'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TITUS_BIN = process.env.TITUS_BIN || path.join(__dirname, '..', 'bin', 'titus')

export async function runTitusScan(audit) {
  const { targetUrl, scanType } = audit.config
  if (!targetUrl) throw new Error('URL objetivo requerida para Titus')

  console.log(`    Titus target: ${targetUrl}`)

  try {
    // Ejecutar titus scan con salida JSON
    const cmd = `${TITUS_BIN} scan ${targetUrl} --format json --datastore /tmp/titus-${audit.id}.ds 2>&1`
    console.log('    Ejecutando: ' + cmd)
    const stdout = execSync(cmd, { timeout: 300000, maxBuffer: 10 * 1024 * 1024 })
    const output = stdout.toString()

    // Parsear JSON de salida
    let findings = []
    try {
      const lines = output.split(/r?\n/).filter(l => l.trim())
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line)
          if (parsed.rule_id || parsed.rule_name) findings.push(parsed)
        } catch {}
      }
      // Si no encontró líneas JSON, intentar parsear todo
      if (findings.length === 0) {
        try {
          const parsed = JSON.parse(output)
          if (Array.isArray(parsed)) findings = parsed
          else if (parsed.findings) findings = parsed.findings
        } catch {}
      }
    } catch {}

    // Intentar reporte JSON desde el datastore
    if (findings.length === 0) {
      try {
        const reportCmd = `${TITUS_BIN} report --datastore /tmp/titus-${audit.id}.ds --format json 2>&1`
        const reportOut = execSync(reportCmd, { timeout: 30000 }).toString()
        const parsed = JSON.parse(reportOut)
        if (Array.isArray(parsed)) findings = parsed
        else if (parsed.findings) findings = parsed.findings
      } catch {}
    }

    // Guardar hallazgos en DB
    for (const f of findings) {
      await query(
        `INSERT INTO titus_results (audit_id, rule_id, rule_name, match, file_path, line_number, severity, score, extra, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          audit.id,
          f.rule_id || f.rule_name || 'unknown',
          f.rule_name || f.rule_id || 'unknown',
          String(f.match || f.raw || f.secret || '').slice(0, 200),
          f.file_path || f.location?.file || f.location || null,
          f.line_number || f.location?.line || null,
          severityFromScore(f.score ?? f.severity),
          f.score ?? null,
          JSON.stringify(f.extra || {}),
        ]
      )
    }

    console.log(`    Titus completado: ${findings.length} hallazgos`)

  } catch (err) {
    console.error('    Titus error:', err.message)
    await query(
      `INSERT INTO titus_results (audit_id, rule_id, rule_name, match, severity, extra, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [audit.id, 'error', 'error', 'Error ejecutando Titus: ' + err.message, 'high', JSON.stringify({})]
    )
  }
}

function severityFromScore(score) {
  if (score == null) return 'medium'
  if (typeof score === 'string') return score
  if (score >= 81) return 'critical'
  if (score >= 61) return 'high'
  if (score >= 41) return 'medium'
  if (score >= 21) return 'low'
  return 'info'
}
