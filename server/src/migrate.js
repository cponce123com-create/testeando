import 'dotenv/config'
import { query } from './db.js'

console.log('🔄 Ejecutando migraciones…')

// Crear tablas si no existen
await query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`)

await query(`
  CREATE TABLE IF NOT EXISTS domains (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`)

await query(`
  CREATE TABLE IF NOT EXISTS audits (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pendiente'
      CHECK (status IN ('pendiente', 'en_progreso', 'completada', 'cancelada')),
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
`)

-- Tipos disponibles: fuerza_bruta, carga, escaneo_puertos, enumeracion

await query(`
  CREATE TABLE IF NOT EXISTS attempts (
    id SERIAL PRIMARY KEY,
    audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    status_code INTEGER,
    success BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`)

await query(`
  CREATE TABLE IF NOT EXISTS metrics (
    id SERIAL PRIMARY KEY,
    audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    requests_sent INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_response_time DOUBLE PRECISION DEFAULT 0,
    requests_per_second DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`)

await query(`
  CREATE TABLE IF NOT EXISTS scan_results (
    id SERIAL PRIMARY KEY,
    audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    port INTEGER NOT NULL,
    protocol VARCHAR(10) DEFAULT 'tcp',
    service VARCHAR(100),
    state VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`)

await query(`
  CREATE TABLE IF NOT EXISTS enum_results (
    id SERIAL PRIMARY KEY,
    audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    subdomain VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    source VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`)

await query(`
  CREATE TABLE IF NOT EXISTS header_results (
    id SERIAL PRIMARY KEY,
    audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    header_name VARCHAR(100) NOT NULL,
    value TEXT,
    status VARCHAR(20) DEFAULT 'missing',
    recommendation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`)

await query(`
  CREATE TABLE IF NOT EXISTS api_scan_results (
    id SERIAL PRIMARY KEY,
    audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    issues TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`)

await query(`
  CREATE TABLE IF NOT EXISTS secret_results (
    id SERIAL PRIMARY KEY,
    audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    secret_type VARCHAR(50) NOT NULL,
    location TEXT,
    snippet TEXT,
    severity VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`)

await query(`
  CREATE TABLE IF NOT EXISTS nettacker_results (
    id SERIAL PRIMARY KEY,
    audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    module VARCHAR(100) NOT NULL,
    host VARCHAR(255),
    port INTEGER,
    service VARCHAR(100),
    vulnerability TEXT,
    severity VARCHAR(20),
    extra JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`)

await query(`
  CREATE TABLE IF NOT EXISTS titus_results (
    id SERIAL PRIMARY KEY,
    audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    rule_id VARCHAR(200),
    rule_name VARCHAR(200) NOT NULL,
    match TEXT,
    file_path TEXT,
    line_number INTEGER,
    severity VARCHAR(20) DEFAULT 'medium',
    score INTEGER,
    extra JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`)

await query(`
  CREATE TABLE IF NOT EXISTS brutus_results (
    id SERIAL PRIMARY KEY,
    audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    protocol VARCHAR(30) NOT NULL,
    target VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    password TEXT,
    success BOOLEAN DEFAULT FALSE,
    banner TEXT,
    duration_ms INTEGER,
    extra JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`)

console.log('✅ Migraciones completadas.')
process.exit(0)
