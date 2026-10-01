import { CATEGORIES } from '../data/words'
import {
  clamp,
  MAX_PLAYERS,
  maxImposters,
  MIN_PLAYERS,
  resizePlayers,
  validatePlayers,
  type Settings,
} from '../lib/game'
import { Stepper } from './Stepper'

const DURATIONS = [60, 120, 180, 300]

interface SetupScreenProps {
  settings: Settings
  onChange: (settings: Settings) => void
  onStart: () => void
}

export function SetupScreen({ settings, onChange, onStart }: SetupScreenProps) {
  const { playerCount, imposterCount, players, categoryIds, durationSec, imposterHint } = settings
  const error = validatePlayers(players)
  const imposterMax = maxImposters(playerCount)

  const setPlayerCount = (count: number) =>
    onChange({
      ...settings,
      playerCount: count,
      players: resizePlayers(players, count),
      imposterCount: clamp(imposterCount, 1, maxImposters(count)),
    })

  const setPlayer = (index: number, name: string) =>
    onChange({ ...settings, players: players.map((p, i) => (i === index ? name : p)) })

  const toggleCategory = (id: string) =>
    onChange({
      ...settings,
      categoryIds: categoryIds.includes(id) ? categoryIds.filter((c) => c !== id) : [...categoryIds, id],
    })

  return (
    <form
      className="screen setup"
      onSubmit={(e) => {
        e.preventDefault()
        if (!error) onStart()
      }}
    >
      <section className="card">
        <h2>
          <span className="step-num">1</span> Số lượng
        </h2>
        <Stepper
          label="Người chơi"
          hint={`${MIN_PLAYERS}–${MAX_PLAYERS} người`}
          value={playerCount}
          min={MIN_PLAYERS}
          max={MAX_PLAYERS}
          onChange={setPlayerCount}
        />
        <Stepper
          label="Kẻ Mạo Danh"
          hint={`Tối đa ${imposterMax} với ${playerCount} người`}
          value={imposterCount}
          min={1}
          max={imposterMax}
          onChange={(n) => onChange({ ...settings, imposterCount: n })}
        />
      </section>

      <section className="card">
        <div className="card-title">
          <h2>
            <span className="step-num">2</span> Tên người chơi
          </h2>
          <span className="badge">
            {players.filter((p) => p.trim()).length}/{playerCount}
          </span>
        </div>
        <ul className="player-list">
          {players.map((name, i) => (
            <li key={i}>
              <span className="player-num">{i + 1}</span>
              <input
                value={name}
                maxLength={20}
                placeholder={`Người chơi ${i + 1}`}
                aria-label={`Tên người chơi ${i + 1}`}
                onChange={(e) => setPlayer(i, e.target.value)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="card-title">
          <h2>
            <span className="step-num">3</span> Chủ đề
          </h2>
          <span className="muted small">{categoryIds.length ? `${categoryIds.length} đã chọn` : 'Tất cả'}</span>
        </div>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip ${categoryIds.includes(c.id) ? 'chip-on' : ''}`}
              aria-pressed={categoryIds.includes(c.id)}
              onClick={() => toggleCategory(c.id)}
            >
              <span aria-hidden="true">{c.icon}</span> {c.name}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>
          <span className="step-num">4</span> Tùy chọn
        </h2>
        <span className="muted small">Thời gian thảo luận mỗi vòng</span>
        <div className="segmented" role="radiogroup" aria-label="Thời gian thảo luận">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={durationSec === d}
              className={durationSec === d ? 'active' : ''}
              onClick={() => onChange({ ...settings, durationSec: d })}
            >
              {d / 60} phút
            </button>
          ))}
        </div>

        <label className="toggle">
          <span>
            <strong>Gợi ý cho Kẻ Mạo Danh</strong>
            <span className="muted small">Kẻ Mạo Danh thấy một từ liên quan, không phải từ bí mật.</span>
          </span>
          <input
            type="checkbox"
            checked={imposterHint}
            onChange={(e) => onChange({ ...settings, imposterHint: e.target.checked })}
          />
          <span className="switch" aria-hidden="true" />
        </label>
      </section>

      <div className="sticky-actions">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={!!error}>
          Bắt đầu ván chơi
        </button>
      </div>
    </form>
  )
}
