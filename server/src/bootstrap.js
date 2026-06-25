import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BIN_DIR = path.join(__dirname, '..', 'bin')

async function download(url, dest) {
  execSync(`curl -fsSL "${url}" -o "${dest}"`, { timeout: 120000, stdio: 'pipe' })
}

export async function bootstrapTools() {
  console.log('🔧 Verificando herramientas externas...')

  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true })
  }

  // SUBFINDER - .zip (descargar con python zipfile)
  const subPath = path.join(BIN_DIR, 'subfinder')
  if (!fs.existsSync(subPath)) {
    console.log('  ⬇️  Descargando subfinder...')
    try {
      const tmp = '/tmp/subfinder.zip'
      await download('https://github.com/projectdiscovery/subfinder/releases/download/v2.14.0/subfinder_2.14.0_linux_amd64.zip', tmp)
      execSync(`python3 -c "
import zipfile, os
with zipfile.ZipFile('${tmp}') as z:
    z.extractall('${BIN_DIR}')
"`, { timeout: 30000 })
      // Buscar binario extraido
      if (fs.existsSync(subPath)) { fs.chmodSync(subPath, 0o755); console.log('  ✅ subfinder listo') }
      else {
        // Buscar en subdirectorios
        execSync(`find "${BIN_DIR}" -type f -name subfinder -o -name subfinder_linux | head -1 | xargs -I{} cp {} "${subPath}" 2>/dev/null && chmod 755 "${subPath}"`, { timeout: 10000 })
        if (fs.existsSync(subPath)) { console.log('  ✅ subfinder listo') }
        else { console.log('  ⚠️  subfinder: binario no encontrado') }
      }
      fs.rmSync(tmp, { force: true })
    } catch (e) { console.log('  ⚠️  subfinder: ' + e.message) }
  } else { console.log('  ✅ subfinder ya existe') }

  // TITUS - binary directo (sin tar.gz!)
  const titusPath = path.join(BIN_DIR, 'titus')
  if (!fs.existsSync(titusPath)) {
    console.log('  ⬇️  Descargando titus...')
    try {
      await download('https://github.com/praetorian-inc/titus/releases/latest/download/titus-linux-amd64', titusPath)
      fs.chmodSync(titusPath, 0o755)
      console.log('  ✅ titus listo')
    } catch (e) { console.log('  ⚠️  titus: ' + e.message) }
  } else { console.log('  ✅ titus ya existe') }

  // BRUTUS - .tar.gz
  const brutusPath = path.join(BIN_DIR, 'brutus')
  if (!fs.existsSync(brutusPath)) {
    console.log('  ⬇️  Descargando brutus...')
    try {
      const tmp = '/tmp/brutus.tar.gz'
      await download('https://github.com/praetorian-inc/brutus/releases/download/v1.5.1/brutus-linux-amd64.tar.gz', tmp)
      execSync(`tar xzf "${tmp}" -C "${BIN_DIR}" 2>/dev/null`, { timeout: 30000 })
      fs.rmSync(tmp, { force: true })
      if (fs.existsSync(brutusPath)) { fs.chmodSync(brutusPath, 0o755); console.log('  ✅ brutus listo') }
      else {
        // Buscar dentro de subdirectorios
        execSync(`find "${BIN_DIR}" -type f -executable | head -1 | xargs -I{} mv {} "${brutusPath}" 2>/dev/null`, { timeout: 10000 })
        if (fs.existsSync(brutusPath)) { fs.chmodSync(brutusPath, 0o755); console.log('  ✅ brutus listo') }
        else { console.log('  ⚠️  brutus: binario no encontrado tras extraer') }
      }
    } catch (e) { console.log('  ⚠️  brutus: ' + e.message) }
  } else { console.log('  ✅ brutus ya existe') }

  // NETTACKER
  try {
    execSync('nettacker --help 2>/dev/null', { timeout: 5000 })
    console.log('  ✅ nettacker ya existe')
  } catch {
    try {
      console.log('  ⬇️  Instalando nettacker...')
      execSync('pip3 install owasp-nettacker 2>/dev/null || pip install owasp-nettacker 2>/dev/null || python3 -m pip install owasp-nettacker 2>/dev/null', { timeout: 120000 })
      execSync('nettacker --help 2>/dev/null', { timeout: 3000 })
      console.log('  ✅ nettacker instalado')
    } catch (e) {
      console.log('  ⚠️  nettacker: ' + e.message)
      console.log('  💡 Python/pip no disponible - nettacker omitido')
    }
  }

  // Listar binarios
  try {
    const bins = fs.readdirSync(BIN_DIR).filter(f => {
      const p = path.join(BIN_DIR, f)
      try { return fs.statSync(p).isFile() && !f.endsWith('.gz') } catch { return false }
    })
    if (bins.length > 0) console.log('  📦 Binarios: ' + bins.join(', '))
  } catch {}

  console.log('🔧 Verificacion completa')
}
