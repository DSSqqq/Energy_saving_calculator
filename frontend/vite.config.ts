import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Dev: браузер обращается к тому же origin (localhost:5173), а запросы /api/*
 * проксируются на Django — не нужен CORS для этого пути (CORS в settings всё равно
 * полезен при прямом обращении фронта к :8000).
 *
 * Если Django запущен на другом порту (например 8001), измените `target` ниже.
 * См. раздел «Альтернативные порты» в README.md.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
