import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'disable-dev-cache',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const originalSetHeader = res.setHeader;
            res.setHeader = function (key: string, val: any) {
              if (typeof key === 'string' && key.toLowerCase() === 'cache-control') {
                return originalSetHeader.call(this, key, 'no-cache, no-store, must-revalidate');
              }
              return originalSetHeader.apply(this, arguments as any);
            };
            next();
          });
        },
      },
      react(),
      tailwindcss(),
    ],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client'],
    },
    server: {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
