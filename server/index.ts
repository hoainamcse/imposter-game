import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { getLanUrls } from './network.ts'
import { attachOnlineServer } from './realtime.ts'

const root = resolve('dist')
const port = Number(process.env.PORT) || 5173
const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
  if (pathname === '/api/lan-urls') {
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ urls: getLanUrls(port) }))
    return
  }
  const candidate = join(root, pathname === '/' ? 'index.html' : pathname)
  const file = existsSync(candidate) && statSync(candidate).isFile() ? candidate : join(root, 'index.html')
  response.setHeader('Content-Type', contentTypes[extname(file)] ?? 'application/octet-stream')
  createReadStream(file).pipe(response)
})

attachOnlineServer(server)
server.listen(port, '0.0.0.0', () => {
  console.log(`Kẻ Mạo Danh đang chạy tại http://0.0.0.0:${port}`)
})
