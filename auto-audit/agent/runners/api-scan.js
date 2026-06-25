import { query } from '../db.js'
import { httpFetch } from '../utils/http.js'
import { isCancelled } from '../utils/cancellation.js'

export async function runApiScan(audit) {
  const { config } = audit
  const { baseUrl, endpoints, methods } = config

  if (!baseUrl || !endpoints?.length) throw new Error('URL base y endpoints requeridos')

  console.log('    Base: ' + baseUrl)
  console.log('    Endpoints: ' + endpoints.length + ', Metodos: ' + (methods || ['GET']).join(','))

  let tested = 0

  for (const endpoint of endpoints) {
    for (const method of (methods || ['GET'])) {
      if (await isCancelled(audit.id)) return

      const fullUrl = baseUrl.replace(/\/+$/, '') + '/' + endpoint.replace(/^\//, '')
      tested++

      const opts = { method }
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        opts.headers = { 'Content-Type': 'application/json' }
        opts.body = JSON.stringify({ test: true })
      }

      const result = await httpFetch(fullUrl, opts)

      const issues = []
      if (result.status >= 500) issues.push('Error interno del servidor (5xx)')
      if (result.status === 404) issues.push('Endpoint no encontrado (404)')
      if (result.status === 403) issues.push('Acceso prohibido - posible informacion sensible')
      if (result.status === 401) issues.push('Autenticacion requerida - verificar si deberia ser publico')
      if (result.status === 0) issues.push('No responde: ' + (result.error || 'timeout'))
      if (result.status > 0 && result.status < 400) {
        const body = result.body || ''
        if (body.includes('error') || body.includes('stack') || body.includes('traceback')) {
          issues.push('Posible fuga de informacion en respuesta (error/stack trace)')
        }
      }

      await query(
        `INSERT INTO api_scan_results (audit_id, endpoint, method, status_code, issues, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [audit.id, endpoint, method, result.status, issues]
      )

      if (issues.length > 0) {
        console.log('    [' + method + '] ' + endpoint + ' -> ' + result.status + ' (' + issues.join('; ') + ')')
      }
    }
  }

  console.log('    API scan completado: ' + tested + ' peticiones')
}
