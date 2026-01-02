import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  envPrefix: ['VITE_', 'PULP_'],
  // When building for the Pulp container, the UI is served under /ai-pulp-ui/.
  // Keep dev/test at / so Playwright and local usage keep working.
  base: command === 'build' ? (process.env.VITE_BASE ?? '/ai-pulp-ui/') : '/',
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    setupFiles: './src/test/setup.ts',
    exclude: ['e2e/**', '**/node_modules/**'],
    environmentMatchGlobs: [['**/integration.test.tsx', 'node']],
  },
  server: {
    port: 3000,
    proxy: {
      '/pulp': {
        target: process.env.PULP_BACKEND || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
}));
