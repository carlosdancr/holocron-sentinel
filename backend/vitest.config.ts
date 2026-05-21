import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 15_000,
    hookTimeout: 15_000,
    // Executa arquivos sequencialmente para não ter conflito no banco
    fileParallelism: false,
  },
})
