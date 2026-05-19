import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'

// Pool de conexões — reutiliza conexões em vez de abrir uma nova a cada query
const pool = new pg.Pool({
  connectionString: process.env['DATABASE_URL'],
})

// Adapter que conecta o Prisma ao driver pg
const adapter = new PrismaPg(pool)

// Instância única do Prisma Client (Singleton)
export const prisma = new PrismaClient({ adapter })
