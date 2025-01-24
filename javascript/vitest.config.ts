import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 2_000,
    includeSource: ['src/**/*.{js,ts}'],
  },
})
