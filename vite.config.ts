import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    setupFiles: './src/test/setup.ts',
    exclude: ['e2e/**', '**/node_modules/**'],
    environmentMatchGlobs: [
      ['**/integration.test.tsx', 'node']
    ],
  },
  server: {
    port: 3000,
    proxy: {
      '/pulp': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
