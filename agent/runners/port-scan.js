import net from 'net'
import { query } from '../db.js'
import { isCancelled } from '../utils/cancellation.js'

const SERVICE_MAP = {
  21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
  80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS', 445: 'SMB',
  993: 'IMAPS', 995: 'POP3S', 1433: 'MSSQL', 1521: 'Oracle',
  3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL', 6379: 'Redis',
  8080: 'HTTP-Proxy', 8443: 'HTTPS-Alt', 27017: 'MongoDB',
}

export async function runPortScan(audit) {
  const { config } = audit
  const { target, ports, scanType, timeout } = config

  if (!target || !ports) throw new Error('Target y puertos requeridos')

  const portList = ports.split(',').map((p) => parseInt(p.trim(), 10)).filter((p) => !isNaN(p))
  const connTimeout = timeout || 2000

  console.log(`    Target: ${target}, Puertos: ${portList.length}, Timeout: ${connTimeout}ms`)

  let scanned = 0
  const BATCH = 20 // escanear en lotes para no saturar

  for (let i = 0; i < portList.length; i += BATCH) {
    const batch = portList.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map((port) => scanPort(target, port, connTimeout))
    )

    for (const r of results) {
      scanned++
      await query(
        `INSERT INTO scan_results (audit_id, port, protocol, service, state, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [audit.id, r.port, 'tcp', r.service, r.state]
      )
      if (r.state === 'open') {
        console.log(`    Puerto ${r.port}/tcp abierto (${r.service})`)
      }
    }

    if (i % 100 === 0 && i > 0) {
      console.log(`    Progreso: ${scanned}/${portList.length}`)
    }

    if (await isCancelled(audit.id)) return
  }

  console.log(`    Escaneo completado: ${scanned} puertos`)
}

function scanPort(target, port, timeout) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(timeout)

    socket.on('connect', () => {
      socket.destroy()
      resolve({ port, state: 'open', service: SERVICE_MAP[port] || 'desconocido' })
    })

    socket.on('error', () => {
      socket.destroy()
      resolve({ port, state: 'closed', service: '' })
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve({ port, state: 'filtered', service: '' })
    })

    socket.connect(port, target)
  })
}

