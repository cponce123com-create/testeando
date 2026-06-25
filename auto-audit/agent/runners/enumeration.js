import dns from 'dns/promises'
import { query } from '../db.js'
import { sleep } from '../utils/http.js'
import { isCancelled } from '../utils/cancellation.js'

export async function runEnumeration(audit) {
  const { config } = audit
  const { domain, wordlist, enumType } = config

  if (!domain || !wordlist?.length) throw new Error('Dominio y wordlist requeridos')

  console.log(`    Dominio: ${domain}, Palabras: ${wordlist.length}`)

  let found = 0
  const BATCH = 10 // resolver en lotes

  for (let i = 0; i < wordlist.length; i += BATCH) {
    const batch = wordlist.slice(i, i + BATCH)
    const results = await Promise.allSettled(
      batch.map(async (word) => {
        const hostname = word + '.' + domain
        try {
          const addresses = await dns.resolve4(hostname)
          return { subdomain: hostname, ips: addresses, success: true }
        } catch {
          return { subdomain: hostname, ips: [], success: false }
        }
      })
    )

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.success && r.value.ips.length > 0) {
        found++
        await query(
          `INSERT INTO enum_results (audit_id, subdomain, ip_address, source, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [audit.id, r.value.subdomain, r.value.ips[0], 'dns']
        )
        console.log(`    ${r.value.subdomain} -> ${r.value.ips[0]}`)
      }
    }

    if (found > 0 && found % 10 === 0) {
      console.log(`    Encontrados: ${found}`)
    }

    if (await isCancelled(audit.id)) return
    await sleep(50) // evitar rate limiting
  }

  console.log(`    Enumeracion completada: ${found} subdominios encontrados`)
}

