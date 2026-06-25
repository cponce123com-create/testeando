import { query } from '../db.js'
import { httpFetch } from '../utils/http.js'
import { isCancelled } from '../utils/cancellation.js'

const SECRET_PATTERNS = [
  // AWS
  { regex: /AKIA[0-9A-Z]{16}/g, type: 'AWS Access Key', severity: 'critical' },
  { regex: /(AWS|aws).*secret.*key[=:]["']?([A-Za-z0-9\/+=]{40})["']?/gi, type: 'AWS Secret Key', severity: 'critical' },
  // Google
  { regex: /AIza[0-9A-Za-z\-_]{35}/g, type: 'Google API Key', severity: 'high' },
  { regex: /"type":\s*"service_account"/g, type: 'Google Service Account', severity: 'critical' },
  // Stripe
  { regex: /sk_live_[0-9a-zA-Z]{24,}/g, type: 'Stripe Secret Key', severity: 'critical' },
  { regex: /pk_live_[0-9a-zA-Z]{24,}/g, type: 'Stripe Publishable Key', severity: 'medium' },
  // GitHub
  { regex: /ghp_[0-9a-zA-Z]{36}/g, type: 'GitHub Token', severity: 'critical' },
  { regex: /gho_[0-9a-zA-Z]{36}/g, type: 'GitHub OAuth Token', severity: 'critical' },
  // JWT
  { regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, type: 'JWT Token', severity: 'high' },
  // Generic
  { regex: /(-----BEGIN\s?(RSA|EC|DSA|PGP)?\s?PRIVATE KEY-----)/g, type: 'Private Key', severity: 'critical' },
  { regex: /(?:password|passwd|pwd)[=:]["']?([^"'\s]{6,})["']?/gi, type: 'Posible Password', severity: 'high' },
  { regex: /(?:api[_-]?key|apikey)[=:]["']?([A-Za-z0-9_\-]{16,})["']?/gi, type: 'API Key', severity: 'high' },
  { regex: /(?:secret|token)[=:]["']?([A-Za-z0-9_\-]{16,})["']?/gi, type: 'Secret/Token', severity: 'high' },
  { regex: /(?:DATABASE_URL|MONGODB_URI|REDIS_URL)[=:]["']?([^"'\s]+)["']?/g, type: 'Database URL', severity: 'critical' },
  { regex: /(?:slack|discord).*token[=:]["']?([A-Za-z0-9_\-]{20,})["']?/gi, type: 'Chat Token', severity: 'critical' },
  { regex: /(?:xox[baprs]-[0-9a-zA-Z-]{10,})/g, type: 'Slack Token', severity: 'critical' },
  // Firebase
  { regex: /(?:firebase).*?(?:apiKey|api_key)[=:]["']?([A-Za-z0-9_\-]{20,})["']?/gi, type: 'Firebase API Key', severity: 'medium' },
]

const FILE_PATTERNS = [
  { path: '.env', severity: 'critical', type: 'Archivo .env expuesto' },
  { path: '.git/config', severity: 'critical', type: 'Repositorio Git expuesto' },
  { path: 'config.php', severity: 'high', type: 'Archivo de configuracion PHP' },
  { path: 'wp-config.php', severity: 'high', type: 'WordPress config expuesto' },
  { path: '.gitignore', severity: 'low', type: 'Archivo .gitignore' },
  { path: 'robots.txt', severity: 'low', type: 'robots.txt (info de directorios)' },
  { path: 'sitemap.xml', severity: 'low', type: 'sitemap.xml' },
]

export async function runSecretsScan(audit) {
  const { config } = audit
  const { targetUrl, scanType, depth } = config

  if (!targetUrl) throw new Error('URL objetivo requerida')

  console.log('    URL: ' + targetUrl)
  console.log('    Escaneando secretos...')

  const baseHost = new URL(targetUrl).hostname
  const found = []

  // Escanear la página principal
  const mainResult = await httpFetch(targetUrl)
  if (mainResult.body) {
    findSecrets(mainResult.body, targetUrl, found)
  }

  // Escanear archivos conocidos
  if (scanType === 'web' || scanType === 'both') {
    for (const fp of FILE_PATTERNS) {
      if (await isCancelled(audit.id)) return

      const fileUrl = targetUrl.replace(/\/+$/, '') + '/' + fp.path
      const fileResult = await httpFetch(fileUrl)

      if (fileResult.status === 200) {
        found.push({
          type: fp.type,
          location: fileUrl,
          snippet: null,
          severity: fp.severity,
        })
        console.log('    Archivo expuesto: ' + fp.path)

        if (fileResult.body) {
          findSecrets(fileResult.body, fileUrl, found)
        }
      }
    }
  }

  // Guardar resultados
  for (const secret of found) {
    await query(
      `INSERT INTO secret_results (audit_id, secret_type, location, snippet, severity, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [audit.id, secret.type, secret.location, secret.snippet, secret.severity]
    )
  }

  console.log('    Busqueda completada: ' + found.length + ' hallazgos')
}

function findSecrets(body, source, found) {
  for (const pattern of SECRET_PATTERNS) {
    const matches = body.matchAll(pattern.regex)
    for (const match of matches) {
      const snippet = match[0].length > 80 ? match[0].slice(0, 80) + '...' : match[0]
      found.push({
        type: pattern.type,
        location: source,
        snippet: snippet,
        severity: pattern.severity,
      })
    }
  }
}
