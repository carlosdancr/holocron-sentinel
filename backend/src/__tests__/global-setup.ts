import { execSync } from 'child_process'
import pg from 'pg'

const DATABASE_URL = 'postgresql://holocron:holocron123@localhost:5432/holocron_sentinel_test'
const ADMIN_URL = 'postgresql://holocron:holocron123@localhost:5432/holocron_sentinel'

/**
 * Setup global do Vitest — roda uma vez antes de todos os testes.
 *
 * 1. Conecta ao banco principal para criar o banco de testes (se não existir).
 * 2. Aplica as migrations do Prisma no banco de testes.
 */
export default async function globalSetup() {
  // 1. Garante que o banco de testes existe
  const pool = new pg.Pool({ connectionString: ADMIN_URL })
  try {
    const { rows } = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'holocron_sentinel_test'",
    )
    if (rows.length === 0) {
      await pool.query('CREATE DATABASE holocron_sentinel_test')
    }
  } finally {
    await pool.end()
  }

  // 2. Aplica migrations no banco de testes
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL },
    cwd: process.cwd(),
    stdio: 'pipe',
  })
}
