import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  define: { 'import.meta.vitest': 'undefined' },
  clean: true,
  dts: true,
  sourcemap: true,
  treeshake: true,
  splitting: false,
})
