import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Dev: браузер обращается к тому же origin (localhost:5173), а запросы /api/*
 * проксируются на Django — не нужен CORS для этого пути (CORS в settings всё равно
 * полезен при прямом обращении фронта к :8000).
 *
 * Порт Django задаётся через VITE_DEV_API_TARGET в `.env.local` (см. `.env.example`).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8000'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
