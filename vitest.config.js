import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// Set before workers start; keep calendar expectations independent of the host.
process.env.TZ = 'America/Argentina/Cordoba'

export default defineConfig({
  plugins: [react()],
  test: {
    // Release-script tests use node:test and run separately in the workflow.
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: ['src/test/**', 'src/**/*.test.{js,jsx,ts,tsx}', 'src/**/*.d.ts'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      reportOnFailure: true,
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
