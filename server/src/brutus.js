import { query } from './db.js'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BRUTUS_BIN = process.env.BRUTUS_BIN || path.join(__dirname, '..', 'bin', 'brutus')
const NL = String.fromCharCode(10)

export async function runBrutusScan(audit) {
  const { target, host, port, protocol, usernames, passwords, mode } = audit.config
  const targetHost = target || host
  if (!targetHost) throw new Error('Target requerido para Brutus')

  const targetStr = port ? `${targetHost}:${port}` : targetHost
  const proto = protocol || 'ssh'
  const modeArg = mode || 'cautious'

  console.log(`    Brutus target: ${targetStr}, protocol: ${proto}, mode: ${modeArg}`)

  try {
    let cmd = `${BRUTUS_BIN} creds --target ${targetStr} --protocol ${proto} --mode ${modeArg} --json`
    if (usernames && usernames.length > 0) cmd += ` -u ${usernames.join(',')}`
    if (passwords && passwords.length > 0) cmd += ` -p ${passwords.join(',')}`

    console.log('    Ejecutando: ' + cmd)
    const stdout = execSync(cmd, { timeout: 300000, maxBuffer: 10 * 1024 * 1024 })
    const output = stdout.toString()

    const re = new RegExp('[^' + NL + ']+', 'g')
    const lines = (output.match(re) || []).filter(l => l.trim())

    let findings = []
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        if (parsed.protocol || parsed.username) findings.push(parsed)
      } catch {}
    }

    if (findings.length === 0) {
      try {
        const parsed = JSON.parse(output)
        if (Array.isArray(parsed)) findings = parsed
      } catch {}
    }

    for (const f of findings) {
      await query(
        `INSERT INTO brutus_results (audit_id, protocol, target, username, password, success, banner, duration_ms, extra, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          audit.id, f.protocol || proto, f.target || targetStr,
          f.username || null, f.password || null,
          f.success === true || String(f.status).toLowerCase() === 'valid',
          f.banner || null, f.duration ? parseDuration(f.duration) : null,
          JSON.stringify(f.extra || {}),
        ]
      )
    }

    console.log(`    Brutus completado: ${findings.length} intentos`)

    if (findings.length === 0) {
      const hasSuccess = output.toLowerCase().includes('valid') || output.toLowerCase().includes('success')
      await query(
        `INSERT INTO brutus_results (audit_id, protocol, target, username, success, extra, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [audit.id, proto, targetStr, null, hasSuccess, JSON.stringify({ raw_output: output.slice(0, 500) })]
      )
    }

  } catch (err) {
    console.error('    Brutus error:', err.message)
    await query(
      `INSERT INTO brutus_results (audit_id, protocol, target, success, extra, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [audit.id, protocol || 'unknown', targetStr, false, JSON.stringify({ error: err.message })]
    )
  }
}

function parseDuration(durStr) {
  if (!durStr) return null
  if (typeof durStr === 'number') return Math.round(durStr)
  const reDur = /^([\d.]+)(ms|s|m)?$/
  const match = durStr.match(reDur)
  if (!match) return null
  const val = parseFloat(match[1])
  const unit = match[2] || 'ms'
  if (unit === 's') return Math.round(val * 1000)
  if (unit === 'm') return Math.round(val * 60000)
  return Math.round(val)
}
