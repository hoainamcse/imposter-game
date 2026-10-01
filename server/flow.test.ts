import { createServer, type Server } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import type { ClientMessage, OnlineSnapshot, ServerMessage } from '../src/lib/online.ts'
import { attachOnlineServer } from './realtime.ts'

class Client {
  snapshot: OnlineSnapshot | null = null
  errors: string[] = []
  private socket!: WebSocket

  constructor(
    private readonly port: number,
    readonly id: string,
  ) {}

  connect() {
    this.socket = new WebSocket(`ws://127.0.0.1:${this.port}/ws`)
    this.socket.on('message', (data) => {
      const message = JSON.parse(data.toString()) as ServerMessage
      if (message.type === 'snapshot') this.snapshot = message.snapshot
      if (message.type === 'error') this.errors.push(message.message)
    })
    return new Promise<void>((resolve, reject) => {
      this.socket.once('open', () => resolve())
      this.socket.once('error', reject)
    })
  }

  send(message: ClientMessage) {
    this.socket.send(JSON.stringify(message))
  }

  async until(matches: (snapshot: OnlineSnapshot) => boolean) {
    const deadline = Date.now() + 2000
    while (Date.now() < deadline) {
      if (this.snapshot && matches(this.snapshot)) return this.snapshot
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    throw new Error(`${this.id} không nhận được trạng thái mong đợi (${this.errors.at(-1) ?? this.snapshot?.phase ?? 'chưa có'})`)
  }

  async untilError(fragment: string) {
    const deadline = Date.now() + 2000
    while (Date.now() < deadline) {
      if (this.errors.some((error) => error.includes(fragment))) return
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    throw new Error(`${this.id} không nhận lỗi “${fragment}”`)
  }

  close() {
    this.socket.close()
    return new Promise<void>((resolve) => this.socket.once('close', () => resolve()))
  }
}

describe('online LAN flow', () => {
  let server: Server
  let port = 0
  const clients: Client[] = []

  afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.close().catch(() => undefined)))
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  async function open(id: string) {
    const client = new Client(port, id)
    clients.push(client)
    await client.connect()
    return client
  }

  it('runs the host, player, spectator, elimination, and rejoin cases', async () => {
    server = createServer()
    attachOnlineServer(server)
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        port = typeof address === 'object' && address ? address.port : 0
        resolve()
      })
    })

    const host = await open('host')
    const an = await open('an')
    const binh = await open('binh')
    const chi = await open('chi')
    const viewer = await open('viewer')

    host.send({ type: 'join', clientId: 'host', name: '', asHost: true, password: 'sai' })
    await host.untilError('không đúng')

    host.send({ type: 'join', clientId: 'host', name: '', asHost: true, password: 'host' })
    an.send({ type: 'join', clientId: 'an', name: 'An', asHost: false })
    binh.send({ type: 'join', clientId: 'binh', name: 'Bình', asHost: false })
    chi.send({ type: 'join', clientId: 'chi', name: 'Chi', asHost: false })
    viewer.send({ type: 'join', clientId: 'viewer', name: 'Dũng', asHost: false })
    await viewer.until((snapshot) => snapshot.participants.length === 4)

    const duplicate = await open('other-an')
    duplicate.send({ type: 'join', clientId: 'other-an', name: 'an', asHost: false })
    await duplicate.untilError('đã có')

    for (const id of ['an', 'binh', 'chi']) {
      host.send({ type: 'select', playerId: id, selected: true })
    }
    const selected = await an.until((snapshot) => snapshot.isSelected && !snapshot.isSpectator)
    expect(selected.participants.find((participant) => participant.id === 'viewer')?.selected).toBe(false)
    expect((await viewer.until((snapshot) => snapshot.isSpectator)).isSelected).toBe(false)

    host.send({ type: 'start' })
    const reveal = await an.until((snapshot) => snapshot.phase === 'reveal')
    expect(reveal.myRole).not.toBeNull()
    expect(reveal.roles).toBeNull()
    const hostReveal = await host.until((snapshot) => snapshot.phase === 'reveal' && snapshot.roles?.length === 3)
    expect(hostReveal.roles).toHaveLength(3)
    expect((await viewer.until((snapshot) => snapshot.roles?.length === 3)).roles).toHaveLength(3)

    for (const player of [an, binh, chi]) player.send({ type: 'role-seen' })
    await host.until((snapshot) => snapshot.phase === 'discussion')

    const before = (await host.until((snapshot) => snapshot.timer !== null)).timer?.remainingMs ?? 0
    an.send({ type: 'timer', command: 'add' })
    await an.untilError('Chỉ host')
    host.send({ type: 'timer', command: 'pause' })
    host.send({ type: 'timer', command: 'add' })
    const paused = await host.until(
      (snapshot) => snapshot.timer?.running === false && (snapshot.timer.remainingMs ?? 0) > before,
    )
    expect(paused.timer?.running).toBe(false)

    host.send({ type: 'start-vote' })
    await an.until((snapshot) => snapshot.phase === 'voting')
    an.send({ type: 'vote', targetId: 'an' })
    await an.untilError('không hợp lệ')
    an.send({ type: 'vote', targetId: 'binh' })
    binh.send({ type: 'vote', targetId: 'chi' })
    chi.send({ type: 'vote', targetId: 'an' })
    const tied = await viewer.until((snapshot) => snapshot.phase === 'result')
    expect(tied.votes).toHaveLength(3)
    expect(tied.outcome?.eliminatedId).toBeNull()
    expect((await an.until((snapshot) => snapshot.phase === 'result')).votes).toBeNull()

    host.send({ type: 'next-round' })
    await host.until((snapshot) => snapshot.roundNo === 2 && snapshot.phase === 'discussion')
    host.send({ type: 'start-vote' })
    const crew = (await host.until((snapshot) => snapshot.phase === 'voting')).roles?.find((role) => role.role.kind === 'crew')
    expect(crew).toBeTruthy()
    const target = crew?.playerId ?? ''
    const voters = { an, binh, chi }
    for (const voter of ['an', 'binh', 'chi'] as const) {
      const choice = voter === target ? (['an', 'binh', 'chi'] as const).find((id) => id !== target) ?? '' : target
      voters[voter].send({ type: 'vote', targetId: choice })
    }
    const finished = await viewer.until(
      (snapshot) => snapshot.phase === 'result' && snapshot.outcome?.eliminatedId === target,
    )
    expect(finished.winner).toBe('imposter')
    const eliminatedView = await voters[target as 'an' | 'binh' | 'chi'].until(
      (snapshot) => snapshot.isSpectator && snapshot.roles?.length === 3,
    )
    expect(eliminatedView.votes).toHaveLength(3)
    expect(eliminatedView.isAlive).toBe(false)

    host.send({ type: 'new-game' })
    expect((await voters[target as 'an' | 'binh' | 'chi'].until((snapshot) => snapshot.phase === 'reveal')).isSpectator).toBe(
      false,
    )

    host.send({ type: 'dissolve' })
    expect(
      (await host.until((snapshot) => snapshot.phase === 'lobby')).participants.every((participant) => !participant.selected),
    ).toBe(true)

    an.send({ type: 'leave' })
    await host.until((snapshot) => !snapshot.participants.some((participant) => participant.id === 'an'))
    const rejoined = await open('another-phone')
    rejoined.send({ type: 'join', clientId: 'another-phone', name: 'An', asHost: false })
    await rejoined.until((snapshot) => snapshot.participants.some((participant) => participant.id === 'another-phone'))
    expect(rejoined.errors).toEqual([])
  })
})
