import { describe, expect, it } from 'vitest'
import { CATEGORIES, type Category } from '../data/words'
import {
  createRound,
  makeTeams,
  maxImposters,
  pickWord,
  resizePlayers,
  roleFor,
  shuffle,
  tallyVotes,
  validatePlayers,
  winnerFor,
  type Round,
} from './game'

function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

const players = ['An', 'Bình', 'Chi', 'Dũng', 'Em', 'Giang', 'Hà']

function round(imposterIndices: number[]): Round {
  return {
    word: 'Phở',
    hint: 'Món nước',
    categoryName: 'Ẩm thực',
    imposterIndices,
    speakingOrder: players.map((_, i) => i),
  }
}

describe('shuffle', () => {
  it('keeps every item exactly once and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const output = shuffle(input, seeded(1))
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect([...output].sort((a, b) => a - b)).toEqual(input)
  })
})

describe('player setup', () => {
  it('keeps imposters a strict minority', () => {
    expect([3, 4, 5, 6, 7, 12].map(maxImposters)).toEqual([1, 1, 2, 2, 3, 5])
  })

  it('resizes the name list while keeping existing names', () => {
    expect(resizePlayers(['An', 'Bình'], 4)).toEqual(['An', 'Bình', '', ''])
    expect(resizePlayers(['An', 'Bình', 'Chi'], 2)).toEqual(['An', 'Bình'])
  })

  it('requires every slot to have a unique name', () => {
    expect(validatePlayers(['An', ' ', 'Bình'])).toMatch(/1 người chơi chưa có tên/)
    expect(validatePlayers(['An', 'an ', 'Chi'])).toMatch(/trùng/)
    expect(validatePlayers(['An', 'Bình'])).toMatch(/ít nhất 3/)
    expect(validatePlayers(Array.from({ length: 13 }, (_, i) => `P${i}`))).toMatch(/Tối đa 12/)
    expect(validatePlayers(['An', 'Bình', 'Chi'])).toBeNull()
  })
})

describe('pickWord', () => {
  it('only picks from the selected categories and returns the matching hint', () => {
    for (let seed = 0; seed < 50; seed++) {
      const { entry, category } = pickWord(CATEGORIES, ['animals'], seeded(seed))
      expect(category.id).toBe('animals')
      expect(category.words).toContainEqual(entry)
    }
  })

  it('falls back to all categories when none are selected', () => {
    const { category } = pickWord(CATEGORIES, [], seeded(3))
    expect(CATEGORIES).toContain(category)
  })

  it('avoids repeating the previous word when possible', () => {
    const tiny: Category[] = [
      {
        id: 't',
        name: 'T',
        icon: '',
        words: [
          { word: 'A', hint: 'a' },
          { word: 'B', hint: 'b' },
        ],
      },
    ]
    for (let seed = 0; seed < 20; seed++) {
      expect(pickWord(tiny, ['t'], seeded(seed), 'A').entry.word).toBe('B')
    }
  })
})

describe('createRound', () => {
  it('picks the requested number of distinct imposters and a full speaking order', () => {
    for (let seed = 0; seed < 50; seed++) {
      const r = createRound({ players, imposterCount: 3, categoryIds: [] }, CATEGORIES, seeded(seed))
      expect(r.imposterIndices).toHaveLength(3)
      expect(new Set(r.imposterIndices).size).toBe(3)
      r.imposterIndices.forEach((i) => expect(i).toBeGreaterThanOrEqual(0))
      r.imposterIndices.forEach((i) => expect(i).toBeLessThan(players.length))
      expect([...r.speakingOrder].sort()).toEqual(players.map((_, i) => i))
      const entry = CATEGORIES.flatMap((c) => c.words).find((w) => w.word === r.word)
      expect(entry?.hint).toBe(r.hint)
    }
  })

  it('clamps the imposter count to keep them a minority', () => {
    const r = createRound({ players: ['A', 'B', 'C', 'D'], imposterCount: 3, categoryIds: [] }, CATEGORIES, seeded(1))
    expect(r.imposterIndices).toHaveLength(1)
  })

  it('eventually assigns the imposter role to every player', () => {
    const rng = seeded(42)
    const seen = new Set<number>()
    for (let i = 0; i < 200; i++) {
      createRound({ players, imposterCount: 1, categoryIds: [] }, CATEGORIES, rng).imposterIndices.forEach((p) =>
        seen.add(p),
      )
    }
    expect(seen.size).toBe(players.length)
  })
})

describe('roleFor', () => {
  const r = round([2, 4])

  it('gives crew members the secret word', () => {
    expect(roleFor(r, 0, true)).toEqual({ kind: 'crew', word: 'Phở', categoryName: 'Ẩm thực' })
  })

  it('shows every imposter the hint only when enabled, never the word or their partners', () => {
    for (const p of [2, 4]) {
      const withHint = roleFor(r, p, true)
      expect(withHint).toEqual({ kind: 'imposter', hint: 'Món nước', categoryName: 'Ẩm thực' })
      expect(roleFor(r, p, false)).toEqual({ kind: 'imposter', hint: null, categoryName: 'Ẩm thực' })
      expect(JSON.stringify(withHint)).not.toContain('Phở')
    }
  })
})

describe('tallyVotes', () => {
  it('eliminates the unique top-voted player', () => {
    const outcome = tallyVotes([2, 2, 0, 2], 4)
    expect(outcome.counts).toEqual([1, 0, 3, 0])
    expect(outcome.eliminated).toBe(2)
  })

  it('eliminates nobody on a tie', () => {
    expect(tallyVotes([1, 0, 1, 0], 4).eliminated).toBeNull()
  })
})

describe('winnerFor', () => {
  it('crew wins once every imposter is out', () => {
    expect(winnerFor(round([1, 3]), [0, 2, 4, 5])).toBe('crew')
  })

  it('imposters win once they are at least as many as the crew', () => {
    expect(winnerFor(round([1]), [0, 1])).toBe('imposter')
    expect(winnerFor(round([1, 3]), [0, 1, 3, 4])).toBe('imposter')
  })

  it('continues while imposters remain a minority', () => {
    expect(winnerFor(round([1]), [0, 1, 2])).toBeNull()
    expect(winnerFor(round([1, 3]), [0, 1, 2, 3, 4])).toBeNull()
  })
})

describe('makeTeams', () => {
  const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

  it('splits everyone into teams whose sizes differ by at most one', () => {
    for (let count = 2; count <= names.length; count++) {
      const teams = makeTeams(names, count, seeded(count))
      expect(teams).toHaveLength(count)
      expect(teams.flat().sort()).toEqual(names)
      const sizes = teams.map((t) => t.length)
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
    }
  })

  it('clamps the team count to the number of players', () => {
    expect(makeTeams(['A', 'B'], 5, seeded(1))).toHaveLength(2)
  })
})
