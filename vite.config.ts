import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './', 
    plugins: [react(), {
      name: 'html-transform',
      transformIndexHtml(html) {
        const cspMetaTag = `
            <meta http-equiv="Content-Security-Policy" content="
              default-src 'self' https://esm.sh;
              script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;
              style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com;
              img-src 'self' data:;
              font-src 'self' https://fonts.gstatic.com;
              connect-src 'self' http://localhost:5000 https://generativelanguage.googleapis.com;
            ">
          `;
        return html.replace('</head>', `${cspMetaTag}\n</head>`);
      },
    }],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:5000', // Backend server's address
          changeOrigin: true,
          secure: false, // Set to true if your backend uses HTTPS
          rewrite: (path) => path.replace(/^\/api/, '/'), // Rewrite to remove /api prefix for backend
        },
      },
    },
    define: { 'process.env': env }
  };
});