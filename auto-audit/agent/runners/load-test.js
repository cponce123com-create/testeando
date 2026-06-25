import { query } from '../db.js'
import { httpFetch, sleep } from '../utils/http.js'
import { isCancelled } from '../utils/cancellation.js'

export async function runLoadTest(audit) {
  const { config } = audit
  const { targetUrl, httpMethod, concurrentUsers, duration, maxRps, headers } = config

  if (!targetUrl) throw new Error('URL objetivo requerida')

  const workers = concurrentUsers || 10
  const totalDuration = (duration || 60) * 1000
  const maxReqPerSec = maxRps || 0
  const startTime = Date.now()

  console.log(`    Target: ${targetUrl}`)
  console.log(`    Workers: ${workers}, Duracion: ${duration}s`)

  let stats = { sent: 0, success: 0, failure: 0, totalTime: 0 }
  let lastLogTime = startTime
  let lastSent = 0

  // Worker: hace peticiones en bucle hasta que termine el tiempo
  async function worker() {
    while (Date.now() - startTime < totalDuration) {
      if (await isCancelled(audit.id)) return

      const result = await httpFetch(targetUrl, {
        method: httpMethod || 'GET',
        headers: headers || {},
      })

      stats.sent++
      if (result.status >= 200 && result.status < 400) {
        stats.success++
      } else {
        stats.failure++
      }
      stats.totalTime += result.elapsed
    }
  }

  // Lanzar workers
  const workersList = []
  for (let i = 0; i < workers; i++) {
    workersList.push(worker())
  }

  // Reportar métricas cada 1s
  const reporter = setInterval(async () => {
    const now = Date.now()
    const elapsed = (now - lastLogTime) / 1000
    const sentDelta = stats.sent - lastSent
    const rps = elapsed > 0 ? sentDelta / elapsed : 0
    const avgTime = stats.sent > 0 ? stats.totalTime / stats.sent : 0

    await query(
      `INSERT INTO metrics (audit_id, requests_sent, success_count, failure_count,
        avg_response_time, requests_per_second, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [audit.id, stats.sent, stats.success, stats.failure,
       Math.round(avgTime), Math.round(rps * 10) / 10]
    )

    lastLogTime = now
    lastSent = stats.sent

    if (await isCancelled(audit.id)) {
      clearInterval(reporter)
    }
  }, 1000)

  // Esperar a que terminen los workers
  await Promise.all(workersList)
  clearInterval(reporter)

  console.log(`    Total: ${stats.sent} req, ${stats.success} ok, ${stats.failure} fail`)
}

