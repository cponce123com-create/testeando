const API_BASE = import.meta.env.VITE_API_URL || ''

/**
 * Obtiene el token JWT del localStorage.
 */
function getToken() {
  return localStorage.getItem('auto_audit_token')
}

/**
 * Intenta parsear JSON de una respuesta. Si falla (cuerpo vacío, HTML, etc.),
 * devuelve un objeto vacío en lugar de lanzar error.
 */
async function parseJson(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

/**
 * Helper genérico para peticiones HTTP.
 */
async function request(method, path, body) {
  const headers = {}
  // Solo enviar Authorization si existe token (evita "Bearer null")
  if (getToken()) {
    headers.Authorization = `Bearer ${getToken()}`
  }
  const opts = { method, headers }
  if (body) {
    headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }

  const res = await fetch(`${API_BASE}${path}`, opts)
  const data = await parseJson(res)

  if (!res.ok) {
    throw new Error(data?.error || `Error ${res.status} en la solicitud`)
  }
  return data
}

/**
 * Helper para peticiones GET.
 */
function get(path) {
  return request('GET', path)
}

/**
 * Helper para peticiones POST.
 */
function post(path, body) {
  return request('POST', path, body)
}

/**
 * Helper para peticiones PATCH.
 */
function patch(path, body) {
  return request('PATCH', path, body)
}

/**
 * Helper para peticiones DELETE.
 */
function del(path) {
  return request('DELETE', path)
}

export default { get, post, patch, del }
