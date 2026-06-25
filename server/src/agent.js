import { query } from './db.js'
import net from 'net'
import dns from 'dns/promises'
import { execSync } from 'child_process'
import { runTitusScan } from './titus.js'
import { runBrutusScan } from './brutus.js'
import { runSubfinderScan } from './subfinder.js'

// --- Utilidades inline (evitan importar de agent/utils) ---

// Cache compartido de cancelaciones
const cancellationCache = new Map()

export function markCancelled(auditId) {
  cancellationCache.set(auditId, true)
}

async function isCancelled(auditId) {
  if (cancellationCache.get(auditId)) return true
  const result = await query('SELECT status FROM audits WHERE id = $1', [auditId])
  return result.rows[0]?.status === 'cancelada'
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function httpFetch(url, opts = {}) {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), opts.timeout || 10000)
    const res = await fetch(url, { ...opts, signal: controller.signal })
    clearTimeout(timeout)
    const body = await res.text()
    return {
      status: res.status,
      body,
      headers: res.headers,
      elapsed: Date.now() - start,
    }
  } catch (err) {
    return { status: 0, body: '', headers: null, elapsed: Date.now() - start, error: err.message }
  }
}

// --- Runners inline ---

async function runHeadersAudit(audit) {
  const SECURITY_HEADERS = [
    { name: 'Strict-Transport-Security', check: (v) => {
      const maxAge = parseInt((v || '').match(/max-age=(\d+)/)?.[1] || '0', 10)
      return { weak: maxAge < 31536000, rec: 'Usa max-age=31536000 (1 ano) como minimo' }
    }},
    { name: 'Content-Security-Policy', check: () => ({ weak: false, rec: 'Implementa CSP para prevenir XSS' }) },
    { name: 'X-Frame-Options', check: (v) => {
      const valid = ['DENY', 'SAMEORIGIN'].includes((v || '').trim().toUpperCase())
      return { weak: !valid, rec: 'Usa DENY o SAMEORIGIN para prevenir clickjacking' }
    }},
    { name: 'X-Content-Type-Options', check: (v) => {
      const ok = (v || '').trim().toLowerCase() === 'nosniff'
      return { weak: !ok, rec: 'Debe ser "nosniff" para prevenir MIME sniffing' }
    }},
    { name: 'Referrer-Policy', check: () => ({ weak: false, rec: 'Recomendado: strict-origin-when-cross-origin' }) },
    { name: 'Permissions-Policy', check: () => ({ weak: false, rec: 'Restringe APIs del navegador no utilizadas' }) },
    { name: 'Cache-Control', check: (v) => {
      const hasNoStore = (v || '').toLowerCase().includes('no-store')
      return { weak: !hasNoStore, rec: 'Usa "no-store" para datos sensibles' }
    }},
    { name: 'Access-Control-Allow-Origin', check: (v) => {
      const isWildcard = (v || '').trim() === '*'
      return { weak: isWildcard, rec: 'Evita "*" en CORS. Especifica origenes concretos' }
    }},
  ]
  const { targetUrl } = audit.config
  if (!targetUrl) throw new Error('URL objetivo requerida')
  console.log('    Analizando cabeceras: ' + targetUrl)
  const result = await httpFetch(targetUrl, { method: 'GET' })
  if (result.error) throw new Error('Error al conectar: ' + result.error)
  const headerMap = {}
  if (result.headers) result.headers.forEach((value, key) => { headerMap[key.toLowerCase()] = value })
  for (const sh of SECURITY_HEADERS) {
    if (await isCancelled(audit.id)) return
    const value = headerMap[sh.name.toLowerCase()]
    let status = 'missing'; let recommendation = sh.check().rec; let displayValue = value || null
    if (value) { const cr = sh.check(value); status = cr.weak ? 'weak' : 'present'; recommendation = cr.weak ? cr.rec : 'Configuracion correcta' }
    await query(`INSERT INTO header_results (audit_id, header_name, value, status, recommendation, created_at) VALUES ($1,$2,$3,$4,$5,NOW())`, [audit.id, sh.name, displayValue, status, recommendation])
  }
  console.log('    Auditoria de headers completada')
}

async function runSecretsScan(audit) {
  const SECRET_PATTERNS = [
    { regex: /AKIA[0-9A-Z]{16}/g, type: 'AWS Access Key', severity: 'critical' },
    { regex: /(AWS|aws).*secret.*key[=:]["']?([A-Za-z0-9\/+=]{40})["']?/gi, type: 'AWS Secret Key', severity: 'critical' },
    { regex: /AIza[0-9A-Za-z\-_]{35}/g, type: 'Google API Key', severity: 'high' },
    { regex: /"type":\s*"service_account"/g, type: 'Google Service Account', severity: 'critical' },
    { regex: /sk_live_[0-9a-zA-Z]{24,}/g, type: 'Stripe Secret Key', severity: 'critical' },
    { regex: /ghp_[0-9a-zA-Z]{36}/g, type: 'GitHub Token', severity: 'critical' },
    { regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, type: 'JWT Token', severity: 'high' },
    { regex: /(-----BEGIN\s?(RSA|EC|DSA|PGP)?\s?PRIVATE KEY-----)/g, type: 'Private Key', severity: 'critical' },
    { regex: /(?:password|passwd|pwd)[=:]["']?([^"'\s]{6,})["']?/gi, type: 'Posible Password', severity: 'high' },
    { regex: /(?:api[_-]?key|apikey)[=:]["']?([A-Za-z0-9_\-]{16,})["']?/gi, type: 'API Key', severity: 'high' },
    { regex: /(?:secret|token)[=:]["']?([A-Za-z0-9_\-]{16,})["']?/gi, type: 'Secret/Token', severity: 'high' },
    { regex: /(?:DATABASE_URL|MONGODB_URI|REDIS_URL)[=:]["']?([^"'\s]+)["']?/g, type: 'Database URL', severity: 'critical' },
  ]
  const FILE_PATTERNS = [
    { path: '.env', severity: 'critical', type: 'Archivo .env expuesto' },
    { path: '.git/config', severity: 'critical', type: 'Repositorio Git expuesto' },
    { path: 'config.php', severity: 'high', type: 'Archivo de configuracion PHP' },
    { path: 'wp-config.php', severity: 'high', type: 'WordPress config expuesto' },
    { path: '.gitignore', severity: 'low', type: 'Archivo .gitignore' },
    { path: 'robots.txt', severity: 'low', type: 'robots.txt (info de directorios)' },
  ]
  const { targetUrl } = audit.config
  if (!targetUrl) throw new Error('URL objetivo requerida')
  console.log('    URL: ' + targetUrl)
  const found = []
  const mainResult = await httpFetch(targetUrl)
  if (mainResult.body) findSecrets(mainResult.body, targetUrl, found)
  for (const fp of FILE_PATTERNS) {
    if (await isCancelled(audit.id)) return
    const fileUrl = targetUrl.replace(/\/+$/, '') + '/' + fp.path
    const fileResult = await httpFetch(fileUrl)
    if (fileResult.status === 200) {
      found.push({ type: fp.type, location: fileUrl, snippet: null, severity: fp.severity })
      console.log('    Archivo expuesto: ' + fp.path)
      if (fileResult.body) findSecrets(fileResult.body, fileUrl, found)
    }
  }
  for (const secret of found) {
    await query(`INSERT INTO secret_results (audit_id, secret_type, location, snippet, severity, created_at) VALUES ($1,$2,$3,$4,$5,NOW())`, [audit.id, secret.type, secret.location, secret.snippet, secret.severity])
  }
  console.log('    Busqueda completada: ' + found.length + ' hallazgos')
  function findSecrets(body, source, arr) {
    for (const p of SECRET_PATTERNS) {
      const matches = body.matchAll(p.regex)
      for (const m of matches) { arr.push({ type: p.type, location: source, snippet: m[0].length > 80 ? m[0].slice(0, 80) + '...' : m[0], severity: p.severity }) }
    }
  }
}

async function runLoadTest(audit) {
  const { targetUrl, concurrentUsers, duration } = audit.config
  if (!targetUrl) throw new Error('URL objetivo requerida')
  const workers = concurrentUsers || 10; const totalDuration = (duration || 60) * 1000; const startTime = Date.now()
  console.log(`    Target: ${targetUrl}, Workers: ${workers}, Duracion: ${duration || 60}s`)
  let stats = { sent: 0, success: 0, failure: 0, totalTime: 0 }
  async function worker() {
    while (Date.now() - startTime < totalDuration) {
      if (await isCancelled(audit.id)) return
      const result = await httpFetch(targetUrl, { method: 'GET' })
      stats.sent++; result.status >= 200 && result.status < 400 ? stats.success++ : stats.failure++; stats.totalTime += result.elapsed
    }
  }
  const workersList = []; for (let i = 0; i < workers; i++) workersList.push(worker())
  const reporter = setInterval(async () => {
    const avgTime = stats.sent > 0 ? stats.totalTime / stats.sent : 0
    await query(`INSERT INTO metrics (audit_id, requests_sent, success_count, failure_count, avg_response_time, requests_per_second, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`, [audit.id, stats.sent, stats.success, stats.failure, Math.round(avgTime), 0])
    if (await isCancelled(audit.id)) clearInterval(reporter)
  }, 1000)
  await Promise.all(workersList); clearInterval(reporter)
  console.log(`    Total: ${stats.sent} req, ${stats.success} ok, ${stats.failure} fail`)
}

async function runPortScan(audit) {
  const SERVICE_MAP = { 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS', 80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS', 445: 'SMB', 993: 'IMAPS', 995: 'POP3S', 1433: 'MSSQL', 1521: 'Oracle', 3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL', 6379: 'Redis', 8080: 'HTTP-Proxy', 8443: 'HTTPS-Alt', 27017: 'MongoDB' }
  const { target, ports, timeout } = audit.config
  if (!target || !ports) throw new Error('Target y puertos requeridos')
  const portList = ports.split(',').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p))
  const connTimeout = timeout || 2000
  console.log(`    Target: ${target}, Puertos: ${portList.length}`)
  async function scanPort(port) {
    return new Promise((resolve) => {
      const socket = new net.Socket()
      socket.setTimeout(connTimeout)
      socket.on('connect', () => { socket.destroy(); resolve({ port, state: 'open', service: SERVICE_MAP[port] || 'desconocido' }) })
      socket.on('error', () => { socket.destroy(); resolve({ port, state: 'closed', service: '' }) })
      socket.on('timeout', () => { socket.destroy(); resolve({ port, state: 'filtered', service: '' }) })
      socket.connect(port, target)
    })
  }
  const BATCH = 20
  for (let i = 0; i < portList.length; i += BATCH) {
    const batch = portList.slice(i, i + BATCH)
    const results = await Promise.all(batch.map(scanPort))
    for (const r of results) {
      await query(`INSERT INTO scan_results (audit_id, port, protocol, service, state, created_at) VALUES ($1,$2,$3,$4,$5,NOW())`, [audit.id, r.port, 'tcp', r.service, r.state])
      if (r.state === 'open') console.log(`    Puerto ${r.port}/tcp abierto (${r.service})`)
    }
    if (await isCancelled(audit.id)) return
  }
  console.log(`    Escaneo completado: ${portList.length} puertos`)
}

async function runEnumeration(audit) {
  const { domain, wordlist } = audit.config
  if (!domain || !wordlist?.length) throw new Error('Dominio y wordlist requeridos')
  console.log(`    Dominio: ${domain}, Palabras: ${wordlist.length}`)
  let found = 0; const BATCH = 10
  for (let i = 0; i < wordlist.length; i += BATCH) {
    const batch = wordlist.slice(i, i + BATCH)
    const results = await Promise.allSettled(batch.map(async (word) => {
      const hostname = word + '.' + domain
      try { const addresses = await dns.resolve4(hostname); return { subdomain: hostname, ips: addresses, success: true } }
      catch { return { subdomain: hostname, ips: [], success: false } }
    }))
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.success && r.value.ips.length > 0) {
        found++
        await query(`INSERT INTO enum_results (audit_id, subdomain, ip_address, source, created_at) VALUES ($1,$2,$3,$4,NOW())`, [audit.id, r.value.subdomain, r.value.ips[0], 'dns'])
        console.log(`    ${r.value.subdomain} -> ${r.value.ips[0]}`)
      }
    }
    if (await isCancelled(audit.id)) return; await sleep(50)
  }
  console.log(`    Enumeracion completada: ${found} subdominios encontrados`)
}

async function runApiScan(audit) {
  const { baseUrl, endpoints, methods } = audit.config
  if (!baseUrl || !endpoints?.length) throw new Error('URL base y endpoints requeridos')
  console.log('    Base: ' + baseUrl + ', Endpoints: ' + endpoints.length)
  let tested = 0
  for (const endpoint of endpoints) {
    for (const method of (methods || ['GET'])) {
      if (await isCancelled(audit.id)) return
      const fullUrl = baseUrl.replace(/\/+$/, '') + '/' + endpoint.replace(/^\//, '')
      tested++
      const opts = { method }
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify({ test: true }) }
      const result = await httpFetch(fullUrl, opts)
      const issues = []
      if (result.status >= 500) issues.push('Error interno (5xx)')
      if (result.status === 404) issues.push('No encontrado (404)')
      if (result.status === 403) issues.push('Acceso prohibido')
      if (result.status === 0) issues.push('No responde: ' + (result.error || 'timeout'))
      if (result.status > 0 && result.status < 400) {
        const body = result.body || ''
        if (body.includes('error') || body.includes('stack') || body.includes('traceback')) issues.push('Posible fuga de info (error/stack trace)')
      }
      await query(`INSERT INTO api_scan_results (audit_id, endpoint, method, status_code, issues, created_at) VALUES ($1,$2,$3,$4,$5,NOW())`, [audit.id, endpoint, method, result.status, issues])
      if (issues.length > 0) console.log('    [' + method + '] ' + endpoint + ' -> ' + result.status + ' (' + issues.join('; ') + ')')
    }
  }
  console.log('    API scan completado: ' + tested + ' peticiones')
}

// --- Nettacker runner ---

async function runNettacker(audit) {
  const { target, modules, intensity } = audit.config
  if (!target) throw new Error('Target requerido para Nettacker')
  const moduleStr = modules && modules.length > 0 ? modules.join(',') : 'port_scan,subdomain_scan,directory_scan,cve_check'
  console.log(`    Nettacker target: ${target}, modules: ${moduleStr}`)

  try {
    const cmd = `nettacker -i ${target} -m ${moduleStr} --output json 2>&1`
    console.log('    Ejecutando: ' + cmd)
    const stdout = execSync(cmd, { timeout: 300000, maxBuffer: 10 * 1024 * 1024 })
    const output = stdout.toString()

    // Intentar parsear JSON de salida
    let results = []
    try {
      const parsed = JSON.parse(output)
      // Nettacker puede devolver array o un objeto con key "results"
      if (Array.isArray(parsed)) {
        results = parsed
      } else if (parsed.results && Array.isArray(parsed.results)) {
        results = parsed.results
      } else {
        // Si no es array, guardamos el raw como extra
        results = [{ module: 'raw', host: target, extra: { raw: output.slice(0, 1000) } }]
      }
    } catch {
      // Si no es JSON válido, guardar como texto raw
      results = [{ module: 'raw', host: target, extra: { raw: output.slice(0, 1000) } }]
    }

    for (const r of results) {
      if (await isCancelled(audit.id)) return
      await query(
        `INSERT INTO nettacker_results (audit_id, module, host, port, service, vulnerability, severity, extra, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [audit.id, r.module || r.scan_type || 'unknown', r.host || r.target || target,
         r.port || null, r.service || null, r.vulnerability || r.description || null,
         r.severity || 'medium', JSON.stringify(r.extra || {})]
      )
    }
    console.log('    Nettacker completado: ' + results.length + ' hallazgos')
  } catch (err) {
    console.error('    Nettacker error:', err.message)
    // Guardar el error como resultado
    await query(
      `INSERT INTO nettacker_results (audit_id, module, host, vulnerability, severity, extra, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [audit.id, 'error', target, 'Error ejecutando Nettacker: ' + err.message, 'high', JSON.stringify({})]
    )
  }
}

// --- Polling loop ---

const POLL_INTERVAL = (parseInt(process.env.POLL_INTERVAL || '3', 10)) * 1000

const RUNNERS = {
  auditoria_headers: runHeadersAudit,
  busqueda_secretos: runSecretsScan,
  carga: runLoadTest,
  escaneo_puertos: runPortScan,
  enumeracion: runEnumeration,
  api_scanner: runApiScan,
  nettacker_scan: runNettacker,
  titus_scan: runTitusScan,
  brutus_scan: runBrutusScan,
  subfinder_scan: runSubfinderScan,
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
    const result = await query("SELECT * FROM audits WHERE status = 'pendiente' ORDER BY created_at ASC LIMIT 5")
    for (const audit of result.rows) await processAudit(audit)
  } catch (err) {
    console.error('Error en polling:', err.message)
  }
}

export function startAgent() {
  console.log(`🤖 AutoAudit Agent iniciado (polling cada ${POLL_INTERVAL / 1000}s)`)
  poll()
  setInterval(poll, POLL_INTERVAL)
}
