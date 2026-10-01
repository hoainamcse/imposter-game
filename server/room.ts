import { CATEGORIES } from '../src/data/words.ts'
import {
  createRound,
  maxImposters,
  roleFor,
  tallyVotes,
  winnerFor,
  type Round,
  type VoteOutcome,
  type Winner,
} from '../src/lib/game.ts'
import type {
  ClientMessage,
  OnlineParticipant,
  OnlinePhase,
  OnlineSnapshot,
  VisibleVote,
} from '../src/lib/online.ts'
import { HOST_PASSWORD } from './config.ts'

interface Member {
  id: string
  name: string
  connected: boolean
  selected: boolean
  ready: boolean
}

interface TimerState {
  running: boolean
  remainingMs: number
  deadline: number
}

const DEFAULT_SETTINGS: OnlineSnapshot['settings'] = {
  imposterCount: 1,
  categoryIds: [],
  durationSec: 180,
  imposterHint: true,
}

export class OnlineRoom {
  private members = new Map<string, Member>()
  private hostId: string | null = null
  private phase: OnlinePhase = 'lobby'
  private settings = { ...DEFAULT_SETTINGS }
  private playerIds: string[] = []
  private aliveIds: string[] = []
  private round: Round | null = null
  private roundNo = 1
  private votes = new Map<string, string>()
  private outcome: (VoteOutcome & { eliminatedId: string | null }) | null = null
  private winner: Winner = null
  private timer: TimerState | null = null
  private previousWord?: string
  /** Names of players who explicitly left during a match, kept only for display. */
  private retainedNames = new Map<string, string>()

  join(message: Extract<ClientMessage, { type: 'join' }>): string | null {
    const id = message.clientId.trim()
    const name = message.name.trim()
    if (!id) return 'Thiếu mã thiết bị.'

    if (message.asHost) {
      if (message.password !== HOST_PASSWORD) return 'Mật khẩu host không đúng.'
      if (this.hostId && this.hostId !== id) return 'Phòng đã có host.'
      this.hostId = id
      return null
    }

    if (!name) return 'Vui lòng nhập tên.'
    const duplicate = [...this.members.values()].some(
      (member) => member.id !== id && member.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'),
    )
    if (duplicate) return 'Tên này đã có người sử dụng.'

    const existing = this.members.get(id)
    this.members.set(id, {
      id,
      name,
      connected: true,
      selected: existing?.selected ?? false,
      ready: existing?.ready ?? false,
    })
    return null
  }

  disconnect(clientId: string) {
    if (this.hostId === clientId) this.hostId = null
    const member = this.members.get(clientId)
    if (!member) return
    if (this.phase !== 'lobby' && this.playerIds.includes(clientId)) {
      member.connected = false
      return
    }
    this.members.delete(clientId)
  }

  leave(clientId: string) {
    if (this.hostId === clientId) this.hostId = null
    const member = this.members.get(clientId)
    if (!member) return
    if (this.phase !== 'lobby' && this.playerIds.includes(clientId)) {
      this.retainedNames.set(clientId, member.name)
    }
    this.members.delete(clientId)
  }

  apply(clientId: string, message: Exclude<ClientMessage, { type: 'join' }>): string | null {
    const isHost = clientId === this.hostId

    if (message.type === 'select') {
      if (!isHost || this.phase !== 'lobby') return 'Chỉ host được chọn người chơi trong sảnh.'
      const member = this.members.get(message.playerId)
      if (!member) return 'Không tìm thấy người này.'
      member.selected = message.selected
      return null
    }

    if (message.type === 'settings') {
      if (!isHost || this.phase !== 'lobby') return 'Chỉ host được đổi thiết lập trong sảnh.'
      this.settings = this.sanitizeSettings(message.settings)
      return null
    }

    if (message.type === 'start') {
      if (!isHost || this.phase !== 'lobby') return 'Chỉ host được bắt đầu ván.'
      return this.startGame()
    }

    if (message.type === 'role-seen') {
      if (this.phase !== 'reveal' || !this.aliveIds.includes(clientId)) return 'Bạn không thể xác nhận vai trò.'
      const member = this.members.get(clientId)
      if (member) member.ready = true
      const connectedPlayers = this.playerIds.filter((id) => this.members.get(id)?.connected)
      if (connectedPlayers.length > 0 && connectedPlayers.every((id) => this.members.get(id)?.ready)) {
        this.startDiscussion()
      }
      return null
    }

    if (message.type === 'timer') {
      if (!isHost || this.phase !== 'discussion' || !this.timer) return 'Chỉ host điều khiển đồng hồ.'
      this.updateTimer()
      if (message.command === 'add') {
        this.timer.remainingMs += 30_000
        if (this.timer.running) this.timer.deadline = Date.now() + this.timer.remainingMs
      } else if (message.command === 'pause') {
        this.timer.running = false
      } else if (!this.timer.running) {
        this.timer.running = true
        this.timer.deadline = Date.now() + this.timer.remainingMs
      }
      return null
    }

    if (message.type === 'start-vote') {
      if (!isHost || this.phase !== 'discussion') return 'Chỉ host được bắt đầu bỏ phiếu.'
      this.updateTimer()
      if (this.timer) this.timer.running = false
      this.phase = 'voting'
      this.votes.clear()
      return null
    }

    if (message.type === 'vote') return this.castVote(clientId, message.targetId)

    if (message.type === 'next-round') {
      if (!isHost || this.phase !== 'result' || this.winner) return 'Không thể bắt đầu vòng tiếp theo.'
      this.roundNo++
      this.outcome = null
      this.startDiscussion()
      return null
    }

    if (message.type === 'new-game') {
      if (!isHost || this.phase !== 'result' || !this.winner) return 'Chỉ host được bắt đầu ván mới.'
      return this.startGame()
    }

    if (message.type === 'leave') {
      this.leave(clientId)
      return null
    }

    if (message.type === 'dissolve') {
      if (!isHost) return 'Chỉ host được giải tán ván.'
      this.phase = 'lobby'
      this.playerIds = []
      this.aliveIds = []
      this.round = null
      this.votes.clear()
      this.outcome = null
      this.winner = null
      this.timer = null
      this.retainedNames.clear()
      for (const member of this.members.values()) {
        member.selected = false
        member.ready = false
      }
      return null
    }

    return 'Hành động không hợp lệ.'
  }

  snapshotFor(clientId: string): OnlineSnapshot {
    this.updateTimer()
    const isHost = clientId === this.hostId
    const inMatch = this.phase !== 'lobby'
    const selected = inMatch ? this.playerIds.includes(clientId) : Boolean(this.members.get(clientId)?.selected)
    const alive = inMatch ? this.aliveIds.includes(clientId) : selected
    const eliminated = selected && !alive && this.phase !== 'lobby' && this.phase !== 'reveal'
    const privileged = isHost || !selected || eliminated
    const round = this.round

    const participants: OnlineParticipant[] = [...this.members.values()].map((member) => ({
      id: member.id,
      name: member.name,
      connected: member.connected,
      selected: member.selected,
      alive: this.aliveIds.includes(member.id),
      ready: member.ready,
    }))
    for (const [id, name] of this.retainedNames) {
      if (this.members.has(id)) continue
      participants.push({
        id,
        name,
        connected: false,
        selected: true,
        alive: this.aliveIds.includes(id),
        ready: false,
      })
    }

    const roles =
      privileged && round
        ? this.playerIds.map((playerId, index) => ({
            playerId,
            role: roleFor(round, index, this.settings.imposterHint),
          }))
        : null

    const visibleVotes: VisibleVote[] | null = privileged
      ? [...this.votes].map(([voterId, targetId]) => ({ voterId, targetId }))
      : null

    const playerIndex = this.playerIds.indexOf(clientId)
    return {
      phase: this.phase,
      selfId: clientId,
      isHost,
      isSelected: selected,
      isAlive: alive,
      isSpectator: !selected || eliminated,
      participants,
      settings: { ...this.settings },
      roundNo: this.roundNo,
      categoryName: round?.categoryName ?? null,
      speakingOrder: round ? round.speakingOrder.map((index) => this.playerIds[index]) : [],
      myRole: round && selected && playerIndex >= 0 ? roleFor(round, playerIndex, this.settings.imposterHint) : null,
      roles,
      votes: visibleVotes,
      hasVoted: this.votes.has(clientId),
      timer: this.timer
        ? {
            running: this.timer.running,
            remainingMs: this.currentRemaining(),
            serverNow: Date.now(),
          }
        : null,
      outcome: this.outcome,
      winner: this.winner,
    }
  }

  private sanitizeSettings(settings: OnlineSnapshot['settings']): OnlineSnapshot['settings'] {
    const selectedCount = [...this.members.values()].filter((member) => member.selected).length
    return {
      imposterCount: Math.max(1, Math.min(Math.floor(settings.imposterCount), maxImposters(Math.max(3, selectedCount)))),
      categoryIds: settings.categoryIds.filter((id) => CATEGORIES.some((category) => category.id === id)),
      durationSec: [60, 120, 180, 300].includes(settings.durationSec) ? settings.durationSec : 180,
      imposterHint: Boolean(settings.imposterHint),
    }
  }

  private startGame(): string | null {
    const selected = [...this.members.values()].filter((member) => member.selected && member.connected)
    if (selected.length < 3) return 'Cần ít nhất 3 người chơi đang kết nối.'
    if (selected.length > 12) return 'Tối đa 12 người chơi.'

    this.settings = this.sanitizeSettings(this.settings)
    this.playerIds = selected.map((member) => member.id)
    this.aliveIds = [...this.playerIds]
    this.round = createRound(
      {
        players: selected.map((member) => member.name),
        imposterCount: this.settings.imposterCount,
        categoryIds: this.settings.categoryIds,
      },
      CATEGORIES,
      Math.random,
      this.previousWord,
    )
    this.previousWord = this.round.word
    this.phase = 'reveal'
    this.roundNo = 1
    this.votes.clear()
    this.outcome = null
    this.winner = null
    this.timer = null
    this.retainedNames.clear()
    for (const member of this.members.values()) member.ready = false
    return null
  }

  private startDiscussion() {
    this.phase = 'discussion'
    this.votes.clear()
    this.timer = {
      running: true,
      remainingMs: this.settings.durationSec * 1000,
      deadline: Date.now() + this.settings.durationSec * 1000,
    }
  }

  private castVote(voterId: string, targetId: string): string | null {
    if (this.phase !== 'voting' || !this.aliveIds.includes(voterId)) return 'Bạn không được bỏ phiếu.'
    if (!this.aliveIds.includes(targetId) || targetId === voterId) return 'Lựa chọn bỏ phiếu không hợp lệ.'
    if (this.votes.has(voterId)) return 'Bạn đã bỏ phiếu.'
    this.votes.set(voterId, targetId)

    const connectedAlive = this.aliveIds.filter((id) => this.members.get(id)?.connected)
    if (connectedAlive.every((id) => this.votes.has(id))) this.finishVote()
    return null
  }

  private finishVote() {
    if (!this.round) return
    const targets = [...this.votes.values()].map((id) => this.playerIds.indexOf(id))
    const raw = tallyVotes(targets, this.playerIds.length)
    const eliminatedId = raw.eliminated === null ? null : this.playerIds[raw.eliminated]
    if (eliminatedId) this.aliveIds = this.aliveIds.filter((id) => id !== eliminatedId)
    this.outcome = { ...raw, eliminatedId }
    const aliveIndices = this.aliveIds.map((id) => this.playerIds.indexOf(id))
    this.winner = winnerFor(this.round, aliveIndices)
    this.phase = 'result'
    this.timer = null
  }

  private currentRemaining() {
    if (!this.timer) return 0
    return this.timer.running ? Math.max(0, this.timer.deadline - Date.now()) : this.timer.remainingMs
  }

  private updateTimer() {
    if (!this.timer?.running) return
    this.timer.remainingMs = this.currentRemaining()
    if (this.timer.remainingMs === 0) this.timer.running = false
  }
}
