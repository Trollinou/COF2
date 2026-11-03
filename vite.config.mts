import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import packageJson from './package.json' with { type: 'json' };

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Injection dynamique de la version depuis package.json accessible partout dans l'application
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  base: './',
  server: {
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('src/data/paths.json')) {
            return 'data-paths';
          }
          if (id.includes('src/data/')) {
            return 'data-core-rules';
          }
        },
      },
    },
  },
});
