import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('socket.io-client')) {
              return 'vendor-socket';
            }
            if (id.includes('phil-address') || id.includes('psgc') || id.includes('use-postal-ph') || id.includes('zipcodes-ph')) {
              return 'vendor-geo';
            }
            return 'vendor-misc';
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            // Ignore normal socket disconnects/resets during dev server reloads
            if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || err.message?.includes('socket')) return;
            console.warn('[vite proxy error]:', err.message);
          });
          proxy.on('proxyReqWs', (_proxyReq, _req, socket, _options, _head) => {
            socket.on('error', (err) => {
              if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || err.message?.includes('socket')) return;
              console.warn('[vite ws proxy error]:', err.message);
            });
          });
        }
      }
    }
  }
});
