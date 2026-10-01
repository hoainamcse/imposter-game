import { describe, expect, it } from 'vitest'
import type { ClientMessage } from '../src/lib/online.ts'
import { OnlineRoom } from './room.ts'

const players = [
  { id: 'a', name: 'An' },
  { id: 'b', name: 'Bình' },
  { id: 'c', name: 'Chi' },
]

function createLobby() {
  const room = new OnlineRoom()
  expect(room.join({ type: 'join', clientId: 'host', name: '', asHost: true, password: 'host' })).toBeNull()
  for (const player of players) {
    expect(
      room.join({ type: 'join', clientId: player.id, name: player.name, asHost: false }),
    ).toBeNull()
    expect(room.apply('host', { type: 'select', playerId: player.id, selected: true })).toBeNull()
  }
  return room
}

function send(room: OnlineRoom, clientId: string, message: Exclude<ClientMessage, { type: 'join' }>) {
  expect(room.apply(clientId, message)).toBeNull()
}

function revealAll(room: OnlineRoom) {
  for (const player of players) send(room, player.id, { type: 'role-seen' })
  expect(room.snapshotFor('host').phase).toBe('discussion')
}

describe('OnlineRoom access', () => {
  it('requires the fixed password and only allows one host', () => {
    const room = new OnlineRoom()
    expect(room.join({ type: 'join', clientId: 'x', name: '', asHost: true, password: 'wrong' })).toMatch(
      /không đúng/,
    )
    expect(room.join({ type: 'join', clientId: 'host', name: '', asHost: true, password: 'host' })).toBeNull()
    expect(room.join({ type: 'join', clientId: 'other', name: '', asHost: true, password: 'host' })).toMatch(
      /đã có host/,
    )
  })

  it('lets the host select players while unselected visitors remain spectators', () => {
    const room = createLobby()
    room.join({ type: 'join', clientId: 'viewer', name: 'Dũng', asHost: false })
    const viewer = room.snapshotFor('viewer')
    expect(viewer.isSpectator).toBe(true)
    expect(viewer.isSelected).toBe(false)
    expect(viewer.participants.filter((participant) => participant.selected)).toHaveLength(3)
  })
})

describe('OnlineRoom game flow', () => {
  it('hides other roles and votes from living players, but exposes them to privileged viewers', () => {
    const room = createLobby()
    send(room, 'host', { type: 'start' })

    const hostReveal = room.snapshotFor('host')
    expect(hostReveal.roles).toHaveLength(3)
    for (const player of players) {
      const view = room.snapshotFor(player.id)
      expect(view.myRole).not.toBeNull()
      expect(view.roles).toBeNull()
    }

    revealAll(room)
    send(room, 'host', { type: 'start-vote' })
    send(room, 'a', { type: 'vote', targetId: 'b' })
    expect(room.snapshotFor('host').votes).toEqual([{ voterId: 'a', targetId: 'b' }])
    expect(room.snapshotFor('b').votes).toBeNull()
  })

  it('continues after a tied vote, then makes an eliminated player a spectator', () => {
    const room = createLobby()
    send(room, 'host', { type: 'start' })
    revealAll(room)
    send(room, 'host', { type: 'start-vote' })
    send(room, 'a', { type: 'vote', targetId: 'b' })
    send(room, 'b', { type: 'vote', targetId: 'c' })
    send(room, 'c', { type: 'vote', targetId: 'a' })

    const tied = room.snapshotFor('host')
    expect(tied.phase).toBe('result')
    expect(tied.outcome?.eliminatedId).toBeNull()
    expect(tied.winner).toBeNull()
    send(room, 'host', { type: 'next-round' })
    expect(room.snapshotFor('host').roundNo).toBe(2)

    send(room, 'host', { type: 'start-vote' })
    const roles = room.snapshotFor('host').roles ?? []
    const crewIds = roles.filter(({ role }) => role.kind === 'crew').map(({ playerId }) => playerId)
    const targetId = crewIds[0]
    const otherIds = players.map(({ id }) => id).filter((id) => id !== targetId)
    send(room, otherIds[0], { type: 'vote', targetId })
    send(room, otherIds[1], { type: 'vote', targetId })
    send(room, targetId, { type: 'vote', targetId: otherIds[0] })

    const eliminated = room.snapshotFor(targetId)
    expect(eliminated.phase).toBe('result')
    expect(eliminated.isAlive).toBe(false)
    expect(eliminated.isSpectator).toBe(true)
    expect(eliminated.roles).toHaveLength(3)
    expect(eliminated.votes).toHaveLength(3)
    expect(eliminated.winner).toBe('imposter')

    send(room, 'host', { type: 'new-game' })
    expect(room.snapshotFor(targetId).isAlive).toBe(true)
    expect(room.snapshotFor(targetId).isSpectator).toBe(false)
    expect(room.snapshotFor('host').phase).toBe('reveal')
  })

  it('dissolves back to an empty lobby', () => {
    const room = createLobby()
    send(room, 'host', { type: 'dissolve' })
    const lobby = room.snapshotFor('host')
    expect(lobby.phase).toBe('lobby')
    expect(lobby.participants.every((participant) => !participant.selected)).toBe(true)
  })
})
