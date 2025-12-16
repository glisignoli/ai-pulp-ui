import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
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
