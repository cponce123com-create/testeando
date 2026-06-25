const TIMEOUT = parseInt(process.env.HTTP_TIMEOUT || '10000', 10)

/**
 * fetch() con timeout y logging.
 */
export async function httpFetch(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeout || TIMEOUT)

  const start = Date.now()
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    const elapsed = Date.now() - start
    const body = await res.text()
    return { status: res.status, headers: res.headers, body, elapsed }
  } catch (err) {
    const elapsed = Date.now() - start
    if (err.name === 'AbortError') {
      return { status: 0, headers: null, body: '', elapsed, error: 'Timeout' }
    }
    return { status: 0, headers: null, body: '', elapsed, error: err.message }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Detecta si una respuesta de login es exitosa.
 * - 302 redirect → éxito
 * - 200 sin keywords de fallo → posible éxito
 * - 401/403 → fallo
 */
export function isLoginSuccess(status, body) {
  if (status === 302) return true
  if (status === 401 || status === 403) return false
  if (status >= 200 && status < 300) {
    const lower = (body || '').toLowerCase()
    const failKeywords = ['invalid', 'incorrect', 'error', 'failed', 'denied', 'wrong']
    return !failKeywords.some((kw) => lower.includes(kw))
  }
  return false
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export { sleep }
