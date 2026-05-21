import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 15_000,
    hookTimeout: 15_000,
    // Executa arquivos sequencialmente para não ter conflito no banco
    fileParallelism: false,
    include: ['src/**/*.test.{ts,tsx}'],
    // Aplica migrations no banco de testes antes de rodar os testes
    globalSetup: ['./src/__tests__/global-setup.ts'],
    // Carrega variaveis de ambiente do .env.test (banco de testes separado)
    env: {
      DATABASE_URL: 'postgresql://holocron:holocron123@localhost:5432/holocron_sentinel_test',
    },
  },
})
