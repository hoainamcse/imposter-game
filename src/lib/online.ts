import type { RoleView, VoteOutcome, Winner } from './game'

export type OnlinePhase = 'lobby' | 'reveal' | 'discussion' | 'voting' | 'result'

export interface OnlineParticipant {
  id: string
  name: string
  connected: boolean
  selected: boolean
  alive: boolean
  ready: boolean
}

export interface VisibleRole {
  playerId: string
  role: RoleView
}

export interface VisibleVote {
  voterId: string
  targetId: string
}

export interface OnlineSnapshot {
  phase: OnlinePhase
  selfId: string
  isHost: boolean
  isSelected: boolean
  isAlive: boolean
  isSpectator: boolean
  participants: OnlineParticipant[]
  settings: {
    imposterCount: number
    categoryIds: string[]
    durationSec: number
    imposterHint: boolean
  }
  roundNo: number
  categoryName: string | null
  speakingOrder: string[]
  myRole: RoleView | null
  roles: VisibleRole[] | null
  votes: VisibleVote[] | null
  hasVoted: boolean
  timer: { running: boolean; remainingMs: number; serverNow: number } | null
  outcome: (VoteOutcome & { eliminatedId: string | null }) | null
  winner: Winner
  error?: string
}

export type ClientMessage =
  | { type: 'join'; clientId: string; name: string; asHost: boolean; password?: string }
  | { type: 'select'; playerId: string; selected: boolean }
  | {
      type: 'settings'
      settings: OnlineSnapshot['settings']
    }
  | { type: 'start' }
  | { type: 'role-seen' }
  | { type: 'timer'; command: 'pause' | 'resume' | 'add' }
  | { type: 'start-vote' }
  | { type: 'vote'; targetId: string }
  | { type: 'next-round' }
  | { type: 'new-game' }
  | { type: 'dissolve' }
  | { type: 'leave' }

export type ServerMessage =
  | { type: 'snapshot'; snapshot: OnlineSnapshot }
  | { type: 'error'; message: string }
