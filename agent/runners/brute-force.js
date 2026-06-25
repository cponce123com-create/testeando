import { query } from '../db.js'
import { httpFetch, isLoginSuccess, sleep } from '../utils/http.js'
import { isCancelled } from '../utils/cancellation.js'

export async function runBruteForce(audit) {
  const { config } = audit
  const {
    endpointUrl, httpMethod, usernameField, passwordField,
    usernames, passwords, delayMs, maxAttempts,
  } = config

  if (!endpointUrl || !usernames?.length || !passwords?.length) {
    throw new Error('Configuracion incompleta para fuerza bruta')
  }

  let attempts = 0
  const total = Math.min(usernames.length * passwords.length, maxAttempts || Infinity)

  console.log(`    Target: ${endpointUrl}`)
  console.log(`    Usuarios: ${usernames.length}, Passwords: ${passwords.length}`)
  console.log(`    Intentos max: ${total}, Delay: ${delayMs}ms`)

  for (const username of usernames) {
    for (const password of passwords) {
      if (attempts >= total) break
      if (await isCancelled(audit.id)) {
        console.log('    Cancelada por el usuario')
        return
      }

      const bodyData = {}
      bodyData[usernameField] = username
      bodyData[passwordField] = password

      const fetchOpts = {
        method: httpMethod || 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
      if (httpMethod === 'POST' || httpMethod === 'post') {
        fetchOpts.body = JSON.stringify(bodyData)
      }

      const result = await httpFetch(endpointUrl, fetchOpts)
      const success = result.status > 0 ? isLoginSuccess(result.status, result.body) : false

      attempts++

      await query(
        `INSERT INTO attempts (audit_id, username, password, status_code, success, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [audit.id, username, password, result.status, success]
      )

      if (success) {
        console.log(`    ✅ Encontrado: ${username}:${password} (HTTP ${result.status})`)
      }

      if (attempts % 10 === 0) {
        console.log(`    Progreso: ${attempts}/${total}`)
      }

      if (delayMs > 0) await sleep(delayMs)
    }
    if (attempts >= total) break
  }
}

