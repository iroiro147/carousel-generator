import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: [
      '**/__tests__/**/*.test.ts',
      '../api/**/__tests__/**/*.test.ts',
    ],
  },
})
