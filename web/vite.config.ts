import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The site publishes to https://<user>.github.io/nfl/, so assets resolve under /nfl/.
export default defineConfig({
  base: '/nfl/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
