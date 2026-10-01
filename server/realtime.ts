import type { Server } from 'node:http'
import { WebSocket, WebSocketServer } from 'ws'
import type { ClientMessage, ServerMessage } from '../src/lib/online.ts'
import { OnlineRoom } from './room.ts'

export function attachOnlineServer(server: Server) {
  const room = new OnlineRoom()
  const webSockets = new WebSocketServer({ noServer: true })
  const identities = new Map<WebSocket, string>()

  const send = (socket: WebSocket, message: ServerMessage) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
  }

  const broadcast = () => {
    for (const [socket, clientId] of identities) {
      send(socket, { type: 'snapshot', snapshot: room.snapshotFor(clientId) })
    }
  }

  server.on('upgrade', (request, socket, head) => {
    if (new URL(request.url ?? '/', 'http://localhost').pathname !== '/ws') {
      socket.destroy()
      return
    }
    webSockets.handleUpgrade(request, socket, head, (webSocket) => webSockets.emit('connection', webSocket, request))
  })

  webSockets.on('connection', (socket) => {
    socket.on('message', (data) => {
      let message: ClientMessage
      try {
        message = JSON.parse(data.toString()) as ClientMessage
      } catch {
        send(socket, { type: 'error', message: 'Dữ liệu gửi lên không hợp lệ.' })
        return
      }

      if (message.type === 'join') {
        const error = room.join(message)
        if (error) {
          send(socket, { type: 'error', message: error })
          return
        }
        identities.set(socket, message.clientId)
        broadcast()
        return
      }

      const clientId = identities.get(socket)
      if (!clientId) {
        send(socket, { type: 'error', message: 'Bạn chưa vào phòng.' })
        return
      }
      const error = room.apply(clientId, message)
      if (error) send(socket, { type: 'error', message: error })
      broadcast()
    })

    socket.on('close', () => {
      const clientId = identities.get(socket)
      identities.delete(socket)
      if (clientId && ![...identities.values()].includes(clientId)) room.disconnect(clientId)
      broadcast()
    })
  })

  return webSockets
}
