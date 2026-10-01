import { clamp, MAX_PLAYERS, maxImposters, MIN_PLAYERS, resizePlayers, type Settings } from './game'

const KEY = 'imposter-game:settings'

export const DEFAULT_SETTINGS: Settings = {
  playerCount: 4,
  imposterCount: 1,
  players: ['', '', '', ''],
  categoryIds: [],
  durationSec: 180,
  imposterHint: true,
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    const names = Array.isArray(parsed.players)
      ? parsed.players.filter((p): p is string => typeof p === 'string')
      : DEFAULT_SETTINGS.players
    const playerCount = clamp(
      typeof parsed.playerCount === 'number' ? parsed.playerCount : names.length,
      MIN_PLAYERS,
      MAX_PLAYERS,
    )
    return {
      playerCount,
      imposterCount: clamp(
        typeof parsed.imposterCount === 'number' ? parsed.imposterCount : 1,
        1,
        maxImposters(playerCount),
      ),
      players: resizePlayers(names, playerCount),
      categoryIds: Array.isArray(parsed.categoryIds)
        ? parsed.categoryIds.filter((c): c is string => typeof c === 'string')
        : DEFAULT_SETTINGS.categoryIds,
      durationSec: typeof parsed.durationSec === 'number' ? parsed.durationSec : DEFAULT_SETTINGS.durationSec,
      imposterHint:
        typeof parsed.imposterHint === 'boolean' ? parsed.imposterHint : DEFAULT_SETTINGS.imposterHint,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // Storage can be unavailable (private mode, quota); the game still works without it.
  }
}
