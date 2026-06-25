import { query } from '../db.js'
import { httpFetch } from '../utils/http.js'
import { isCancelled } from '../utils/cancellation.js'

// Lista de headers de seguridad con verificación y recomendaciones
const SECURITY_HEADERS = [
  {
    name: 'Strict-Transport-Security',
    check: (v) => {
      const maxAge = parseInt((v || '').match(/max-age=(\d+)/)?.[1] || '0', 10)
      return { weak: maxAge < 31536000, rec: 'Usa max-age=31536000 (1 ano) como minimo' }
    },
  },
  {
    name: 'Content-Security-Policy',
    check: () => ({ weak: false, rec: 'Implementa CSP para prevenir XSS' }),
  },
  {
    name: 'X-Frame-Options',
    check: (v) => {
      const valid = ['DENY', 'SAMEORIGIN'].includes((v || '').trim().toUpperCase())
      return { weak: !valid, rec: 'Usa DENY o SAMEORIGIN para prevenir clickjacking' }
    },
  },
  {
    name: 'X-Content-Type-Options',
    check: (v) => {
      const ok = (v || '').trim().toLowerCase() === 'nosniff'
      return { weak: !ok, rec: 'Debe ser "nosniff" para prevenir MIME sniffing' }
    },
  },
  {
    name: 'Referrer-Policy',
    check: () => ({ weak: false, rec: 'Recomendado: strict-origin-when-cross-origin' }),
  },
  {
    name: 'Permissions-Policy',
    check: () => ({ weak: false, rec: 'Restringe APIs del navegador no utilizadas' }),
  },
  {
    name: 'Cache-Control',
    check: (v) => {
      const hasNoStore = (v || '').toLowerCase().includes('no-store')
      return { weak: !hasNoStore, rec: 'Usa "no-store" para datos sensibles' }
    },
  },
  {
    name: 'Access-Control-Allow-Origin',
    check: (v) => {
      const isWildcard = (v || '').trim() === '*'
      return { weak: isWildcard, rec: 'Evita "*" en CORS. Especifica origenes concretos' }
    },
  },
]

export async function runHeadersAudit(audit) {
  const { config } = audit
  const { targetUrl } = config

  if (!targetUrl) throw new Error('URL objetivo requerida')

  console.log('    Analizando cabeceras de: ' + targetUrl)

  const result = await httpFetch(targetUrl, { method: 'GET' })

  if (result.error) {
    throw new Error('Error al conectar: ' + result.error)
  }

  console.log('    HTTP ' + result.status + ', ' + result.headers?.size + ' headers')

  const headerMap = {}
  if (result.headers) {
    result.headers.forEach((value, key) => {
      headerMap[key.toLowerCase()] = value
    })
  }

  for (const sh of SECURITY_HEADERS) {
    if (await isCancelled(audit.id)) return

    const value = headerMap[sh.name.toLowerCase()]
    let status = 'missing'
    let recommendation = sh.check().rec
    let displayValue = value || null

    if (value) {
      const checkResult = sh.check(value)
      status = checkResult.weak ? 'weak' : 'present'
      recommendation = checkResult.weak ? checkResult.rec : 'Configuracion correcta'
    }

    await query(
      `INSERT INTO header_results (audit_id, header_name, value, status, recommendation, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [audit.id, sh.name, displayValue, status, recommendation]
    )
  }

  console.log('    Auditoria de headers completada')
}
