import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { getLanUrls } from './server/network.ts'
import { attachOnlineServer } from './server/realtime.ts'

// https://vite.dev/config/
export default defineConfig({
  server: { host: true },
  plugins: [
    react(),
    {
      name: 'online-room',
      configureServer(server) {
        if (server.httpServer) attachOnlineServer(server.httpServer as import('node:http').Server)
        server.middlewares.use('/api/lan-urls', (request, response) => {
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({ urls: getLanUrls(request.socket.localPort ?? 5173) }))
        })
      },
    },
  ],
})
