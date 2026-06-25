import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BIN_DIR = path.join(__dirname, '..', 'bin')
const TOOLS = {
  subfinder: {
    url: 'https://github.com/projectdiscovery/subfinder/releases/latest/download/subfinder_linux_amd64.zip',
    bin: 'subfinder',
    extract: 'zip',
  },
  titus: {
    url: 'https://github.com/praetorian-inc/titus/releases/latest/download/titus-linux-amd64.tar.gz',
    bin: 'titus',
    extract: 'targz',
  },
  brutus: {
    url: 'https://github.com/praetorian-inc/brutus/releases/latest/download/brutus-linux-amd64.tar.gz',
    bin: 'brutus',
    extract: 'targz',
  },
}

export async function bootstrapTools() {
  console.log('🔧 Verificando herramientas externas...')

  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true })
  }

  for (const [name, tool] of Object.entries(TOOLS)) {
    const binPath = path.join(BIN_DIR, tool.bin)
    if (fs.existsSync(binPath)) {
      console.log(`  ✅ ${name} ya existe`)
      continue
    }

    console.log(`  ⬇️  Descargando ${name}...`)
    try {
      const tmp = `/tmp/${tool.bin}-download`
      execSync(`wget -q "${tool.url}" -O ${tmp}`, { timeout: 60000 })

      if (tool.extract === 'targz') {
        execSync(`tar xzf ${tmp} -C ${BIN_DIR} 2>/dev/null || ` +
          `(mkdir -p ${BIN_DIR}/${name} && cd ${BIN_DIR}/${name} && tar xzf ${tmp} && ` +
          `find . -type f -executable | head -1 | xargs -I{} cp {} ${BIN_DIR}/${tool.bin})`,
          { timeout: 30000 })
      } else if (tool.extract === 'zip') {
        execSync(`unzip -o ${tmp} -d ${BIN_DIR} 2>/dev/null || ` +
          `(apt-get update -qq && apt-get install -y -qq unzip && unzip -o ${tmp} -d ${BIN_DIR})`,
          { timeout: 60000 })
      }

      fs.rmSync(tmp, { force: true })

      // Hacer ejecutable
      if (fs.existsSync(binPath)) {
        fs.chmodSync(binPath, 0o755)
        console.log(`  ✅ ${name} listo (${binPath})`)
      } else {
        // Buscar el binario extraido
        const files = fs.readdirSync(BIN_DIR)
        const exe = files.find(f => f.includes(tool.bin) || f === tool.bin)
        if (exe) {
          const src = path.join(BIN_DIR, exe)
          fs.renameSync(src, binPath)
          fs.chmodSync(binPath, 0o755)
          console.log(`  ✅ ${name} listo`)
        } else {
          console.log(`  ⚠️  ${name}: no se encontró el binario extraído`)
        }
      }
    } catch (err) {
      console.log(`  ⚠️  ${name}: error al descargar: ${err.message}`)
    }
  }

  // Nettacker: verificar si está disponible via pip o python
  try {
    execSync('nettacker --help 2>/dev/null', { timeout: 5000 })
    console.log('  ✅ nettacker ya existe')
  } catch {
    try {
      console.log('  ⬇️  Instalando nettacker...')
      execSync('pip3 install --break-system-packages owasp-nettacker 2>/dev/null || pip install owasp-nettacker 2>/dev/null', { timeout: 120000 })
      console.log('  ✅ nettacker instalado')
    } catch (err) {
      console.log(`  ⚠️  nettacker: no se pudo instalar: ${err.message}`)
    }
  }

  console.log('🔧 Verificación completa')
}
