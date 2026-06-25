import { query } from './db.js'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SUBFINDER_BIN = process.env.SUBFINDER_BIN || path.join(__dirname, '..', 'bin', 'subfinder')
const NL = String.fromCharCode(10)

export async function runSubfinderScan(audit) {
  const { domain } = audit.config
  if (!domain) throw new Error('Dominio requerido para subfinder')

  console.log(`    Subfinder target: ${domain}`)

  try {
    const cmd = `${SUBFINDER_BIN} -d ${domain} -silent -oJ 2>&1`
    console.log('    Ejecutando: ' + cmd)
    const stdout = execSync(cmd, { timeout: 120000, maxBuffer: 10 * 1024 * 1024 })
    const output = stdout.toString()

    const re = new RegExp('[^' + NL + ']+', 'g')
    const lines = (output.match(re) || []).filter(l => l.trim())

    let subdomains = []
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        const host = parsed.host || parsed.domain || line.trim()
        if (host && !subdomains.some(s => s.host === host)) {
          subdomains.push({
            host,
            ip: parsed.ip || null,
            source: Array.isArray(parsed.sources) ? parsed.sources.join(',') : (parsed.source || 'subfinder'),
          })
        }
      } catch {
        const host = line.trim()
        if (host && !subdomains.some(s => s.host === host)) {
          subdomains.push({ host, ip: null, source: 'subfinder' })
        }
      }
    }

    if (subdomains.length === 0) {
      for (const line of lines) {
        const host = line.trim()
        if (host && !subdomains.some(s => s.host === host)) {
          subdomains.push({ host, ip: null, source: 'subfinder' })
        }
      }
    }

    let count = 0
    for (const sub of subdomains) {
      await query(
        `INSERT INTO enum_results (audit_id, subdomain, ip_address, source, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [audit.id, sub.host, sub.ip, sub.source]
      )
      count++
      if (count % 50 === 0) console.log(`    Progreso: ${count} subdominios guardados`)
    }

    const bySource = {}
    for (const sub of subdomains) {
      bySource[sub.source] = (bySource[sub.source] || 0) + 1
    }
    const sourcesSummary = Object.entries(bySource)
      .sort((a, b) => b[1] - a[1])
      .map(([s, c]) => `${s}:${c}`)
      .join(', ')

    console.log(`    Subfinder completado: ${subdomains.length} subdominios encontrados (${sourcesSummary})`)

  } catch (err) {
    console.error('    Subfinder error:', err.message)
    await query(
      `INSERT INTO enum_results (audit_id, subdomain, source, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [audit.id, 'ERROR: ' + err.message, 'subfinder_error']
    )
  }
}
