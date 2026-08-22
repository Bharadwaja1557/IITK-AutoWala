import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig(({ mode }) => {
  // Read the repo-root .env with no prefix filter, so the dev proxy points at
  // whatever PORT the API was configured with instead of a second copy of that
  // number living here. Nothing from this file reaches the browser bundle.
  const rootEnv = loadEnv(mode, repoRoot, '');
  const apiPort = rootEnv.PORT ?? '4000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // The client only ever calls same-origin /api paths. In development this
      // proxy is what makes that true; in the container nginx does the same
      // job. One network shape in both. D-08.
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
