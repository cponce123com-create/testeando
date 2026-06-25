import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import zlib from 'zlib'
import { createGunzip } from 'zlib'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BIN_DIR = path.join(__dirname, '..', 'bin')

async function download(url, dest) {
  // Usar curl (disponible en casi cualquier imagen Linux)
  execSync(`curl -fsSL "${url}" -o "${dest}"`, { timeout: 120000, stdio: 'pipe' })
}

function extractTarGz(src, destDir) {
  execSync(`tar xzf "${src}" -C "${destDir}" 2>/dev/null`, { timeout: 30000 })
}

function extractZip(src, destDir) {
  // Intentar con unzip primero
  try {
    execSync(`unzip -o "${src}" -d "${destDir}" 2>/dev/null`, { timeout: 30000 })
  } catch {
    // Fallback: extraer con python
    try {
      execSync(`python3 -c "
import zipfile, sys
with zipfile.ZipFile('${src}') as z:
    z.extractall('${destDir}')
" 2>/dev/null`, { timeout: 30000 })
    } catch {
      throw new Error('No se pudo extraer el zip')
    }
  }
}

async function installTool(name, url, binName, extractType) {
  const binPath = path.join(BIN_DIR, binName)
  if (fs.existsSync(binPath)) {
    console.log(`  ✅ ${name} ya existe`)
    return true
  }

  console.log(`  ⬇️  Descargando ${name}...`)
  try {
    const tmp = `/tmp/${binName}-download`
    await download(url, tmp)

    if (extractType === 'targz') {
      extractTarGz(tmp, BIN_DIR)
    } else if (extractType === 'zip') {
      extractZip(tmp, BIN_DIR)
    } else {
      // Binary directo
      fs.renameSync(tmp, binPath)
    }

    fs.rmSync(tmp, { force: true })

    // Buscar el binario
    if (fs.existsSync(binPath)) {
      fs.chmodSync(binPath, 0o755)
      console.log(`  ✅ ${name} listo`)
      return true
    }

    // Buscar en subdirectorios
    const files = fs.readdirSync(BIN_DIR, { recursive: true }).filter(f => {
      const base = path.basename(f)
      return base === binName || base.startsWith(binName)
    })
    if (files.length > 0) {
      const src = path.join(BIN_DIR, files[0])
      fs.renameSync(src, binPath)
      fs.chmodSync(binPath, 0o755)
      console.log(`  ✅ ${name} listo`)
      return true
    }

    console.log(`  ⚠️  ${name}: binario no encontrado tras extraer`)
    return false
  } catch (err) {
    console.log(`  ⚠️  ${name}: error - ${err.message}`)
    return false
  }
}

export async function bootstrapTools() {
  console.log('🔧 Verificando herramientas externas...')

  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true })
  }

  // Subfinder - descargar .tar.gz (mas compatible que zip)
  await installTool('subfinder',
    'https://github.com/projectdiscovery/subfinder/releases/latest/download/subfinder_linux_amd64.tar.gz',
    'subfinder', 'targz')

  // Titus
  await installTool('titus',
    'https://github.com/praetorian-inc/titus/releases/latest/download/titus-linux-amd64.tar.gz',
    'titus', 'targz')

  // Brutus
  await installTool('brutus',
    'https://github.com/praetorian-inc/brutus/releases/latest/download/brutus-linux-amd64.tar.gz',
    'brutus', 'targz')

  // Nettacker - verificar si existe, si no instalar
  try {
    execSync('nettacker --help 2>/dev/null', { timeout: 5000 })
    console.log('  ✅ nettacker ya existe')
  } catch {
    try {
      console.log('  ⬇️  Instalando nettacker...')
      execSync('pip3 install owasp-nettacker 2>/dev/null || pip install owasp-nettacker 2>/dev/null || python3 -m pip install owasp-nettacker 2>/dev/null', { timeout: 120000 })
      // Verificar instalacion
      execSync('nettacker --help 2>/dev/null', { timeout: 3000 })
      console.log('  ✅ nettacker instalado')
    } catch (err) {
      console.log(`  ⚠️  nettacker: no se pudo instalar (${err.message})`)
      console.log('  💡 Los scanners externos requieren Python + pip en el servidor')
    }
  }

  // Listar binarios instalados
  const installed = []
  if (fs.existsSync(BIN_DIR)) {
    for (const f of fs.readdirSync(BIN_DIR)) {
      const fp = path.join(BIN_DIR, f)
      const stat = fs.statSync(fp)
      if (stat.isFile() && (stat.mode & 0o111)) {
        installed.push(f)
      }
    }
  }
  if (installed.length > 0) {
    console.log(`  📦 Binarios instalados: ${installed.join(', ')}`)
  }

  console.log('🔧 Verificacion completa')
}
