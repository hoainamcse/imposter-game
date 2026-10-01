import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './storage'

describe('settings storage', () => {
  let store: Map<string, string>

  beforeEach(() => {
    store = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('round-trips counts, players, categories, duration and hint option', () => {
    const settings = {
      playerCount: 5,
      imposterCount: 2,
      players: ['An', 'Bình', 'Chi', 'Dũng', 'Em'],
      categoryIds: ['animals'],
      durationSec: 60,
      imposterHint: false,
    }
    saveSettings(settings)
    expect(loadSettings()).toEqual(settings)
  })

  it('migrates older saves without counts and clamps invalid values', () => {
    store.set('imposter-game:settings', JSON.stringify({ players: ['An', 'Bình', 'Chi', 'Dũng'], imposterCount: 9 }))
    const loaded = loadSettings()
    expect(loaded.playerCount).toBe(4)
    expect(loaded.imposterCount).toBe(1)
    expect(loaded.players).toEqual(['An', 'Bình', 'Chi', 'Dũng'])
  })

  it('falls back to defaults on missing or corrupt data', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    store.set('imposter-game:settings', '{not json')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps working when storage access throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new DOMException('denied', 'SecurityError')
      },
      setItem: () => {
        throw new DOMException('denied', 'SecurityError')
      },
    })
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow()
  })
})
