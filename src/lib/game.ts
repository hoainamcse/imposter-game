import type { Category, WordEntry } from '../data/words'

export type Rng = () => number

export const MIN_PLAYERS = 3
export const MAX_PLAYERS = 12

export interface Settings {
  playerCount: number
  imposterCount: number
  players: string[]
  categoryIds: string[]
  durationSec: number
  imposterHint: boolean
}

export interface Round {
  word: string
  hint: string
  categoryName: string
  /** Sorted indices into `players`. */
  imposterIndices: number[]
  /** Indices into `players`, in the order they should speak. */
  speakingOrder: number[]
}

export type RoleView =
  | { kind: 'crew'; word: string; categoryName: string }
  | { kind: 'imposter'; hint: string | null; categoryName: string }

export interface VoteOutcome {
  counts: number[]
  /** Index of the eliminated player, or null when the top vote is tied. */
  eliminated: number | null
}

export type Winner = 'crew' | 'imposter' | null

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function randomInt(max: number, rng: Rng = Math.random): number {
  return Math.min(max - 1, Math.floor(rng() * max))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Imposters must start as a strict minority, otherwise they would win before anyone votes. */
export function maxImposters(playerCount: number): number {
  return Math.max(1, Math.floor((playerCount - 1) / 2))
}

/** Resizes the name list to `count`, keeping existing names in place. */
export function resizePlayers(names: readonly string[], count: number): string[] {
  return Array.from({ length: count }, (_, i) => names[i] ?? '')
}

export function normalizePlayers(names: readonly string[]): string[] {
  return names.map((name) => name.trim())
}

export function validatePlayers(names: readonly string[]): string | null {
  const players = normalizePlayers(names)
  if (players.length < MIN_PLAYERS) return `Cần ít nhất ${MIN_PLAYERS} người chơi.`
  if (players.length > MAX_PLAYERS) return `Tối đa ${MAX_PLAYERS} người chơi.`
  const missing = players.filter((name) => !name).length
  if (missing) return `Còn ${missing} người chơi chưa có tên.`
  const seen = new Set<string>()
  for (const name of players) {
    const key = name.toLocaleLowerCase('vi')
    if (seen.has(key)) return `Tên “${name}” bị trùng.`
    seen.add(key)
  }
  return null
}

export function pickWord(
  categories: readonly Category[],
  categoryIds: readonly string[],
  rng: Rng = Math.random,
  avoidWord?: string,
): { entry: WordEntry; category: Category } {
  const selected = categories.filter((c) => categoryIds.includes(c.id))
  const pool = (selected.length ? selected : categories).flatMap((category) =>
    category.words.map((entry) => ({ entry, category })),
  )
  const candidates = pool.length > 1 ? pool.filter((p) => p.entry.word !== avoidWord) : pool
  return candidates[randomInt(candidates.length, rng)]
}

export function createRound(
  settings: Pick<Settings, 'players' | 'imposterCount' | 'categoryIds'>,
  categories: readonly Category[],
  rng: Rng = Math.random,
  avoidWord?: string,
): Round {
  const indices = settings.players.map((_, i) => i)
  const imposterCount = clamp(settings.imposterCount, 1, maxImposters(indices.length))
  const { entry, category } = pickWord(categories, settings.categoryIds, rng, avoidWord)
  return {
    word: entry.word,
    hint: entry.hint,
    categoryName: category.name,
    imposterIndices: shuffle(indices, rng)
      .slice(0, imposterCount)
      .sort((a, b) => a - b),
    speakingOrder: shuffle(indices, rng),
  }
}

export function isImposter(round: Round, playerIndex: number): boolean {
  return round.imposterIndices.includes(playerIndex)
}

export function roleFor(round: Round, playerIndex: number, imposterHint: boolean): RoleView {
  if (isImposter(round, playerIndex)) {
    return {
      kind: 'imposter',
      hint: imposterHint ? round.hint : null,
      categoryName: round.categoryName,
    }
  }
  return { kind: 'crew', word: round.word, categoryName: round.categoryName }
}

/** `votes` lists the accused player index of every ballot cast. */
export function tallyVotes(votes: readonly number[], playerCount: number): VoteOutcome {
  const counts = Array.from({ length: playerCount }, () => 0)
  for (const target of votes) counts[target]++
  const max = Math.max(...counts)
  const leaders = counts.flatMap((count, i) => (count === max ? [i] : []))
  return { counts, eliminated: max > 0 && leaders.length === 1 ? leaders[0] : null }
}

export function winnerFor(round: Round, alive: readonly number[]): Winner {
  const impostersLeft = alive.filter((p) => isImposter(round, p)).length
  if (impostersLeft === 0) return 'crew'
  if (impostersLeft >= alive.length - impostersLeft) return 'imposter'
  return null
}

export function makeTeams(names: readonly string[], teamCount: number, rng: Rng = Math.random): string[][] {
  const count = Math.max(1, Math.min(teamCount, names.length))
  const teams: string[][] = Array.from({ length: count }, () => [])
  shuffle(names, rng).forEach((name, i) => teams[i % count].push(name))
  return teams
}
