import { useState } from 'react'
import { roleFor, type Round } from '../lib/game'
import { Handoff } from './Handoff'

interface RevealScreenProps {
  players: string[]
  round: Round
  imposterHint: boolean
  onDone: () => void
}

export function RevealScreen({ players, round, imposterHint, onDone }: RevealScreenProps) {
  const [index, setIndex] = useState(0)
  const [ready, setReady] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [seen, setSeen] = useState(false)

  const name = players[index]

  if (!ready) {
    return (
      <Handoff
        key={index}
        name={name}
        step={index + 1}
        total={players.length}
        action="xem vai trò"
        onReady={() => setReady(true)}
      />
    )
  }

  const role = roleFor(round, index, imposterHint)
  const show = () => {
    setRevealed(true)
    setSeen(true)
  }
  const hide = () => setRevealed(false)

  const next = () => {
    setRevealed(false)
    setSeen(false)
    setReady(false)
    if (index + 1 >= players.length) onDone()
    else setIndex(index + 1)
  }

  return (
    <div className="screen center reveal">
      <p className="step">
        {index + 1}/{players.length} · {name}
      </p>
      <button
        type="button"
        className={`secret-card ${revealed ? 'is-revealed' : ''} ${revealed && role.kind === 'imposter' ? 'is-imposter' : ''}`}
        aria-label="Nhấn giữ để xem vai trò"
        onPointerDown={show}
        onPointerUp={hide}
        onPointerLeave={hide}
        onPointerCancel={hide}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            show()
          }
        }}
        onKeyUp={hide}
        onBlur={hide}
        onContextMenu={(e) => e.preventDefault()}
      >
        {revealed ? (
          role.kind === 'crew' ? (
            <span className="secret-content" aria-live="polite">
              <span className="secret-label">Chủ đề: {role.categoryName}</span>
              <span className="secret-label">Từ bí mật là</span>
              <span className="secret-word">{role.word}</span>
            </span>
          ) : (
            <span className="secret-content" aria-live="polite">
              <span className="secret-label">Chủ đề: {role.categoryName}</span>
              <span className="secret-word imposter-title">🕵️ Bạn là Kẻ Mạo Danh!</span>
              {role.hint ? (
                <span className="secret-hint">
                  Gợi ý: <strong>{role.hint}</strong>
                </span>
              ) : (
                <span className="secret-hint">Hãy nghe kỹ và hòa nhập.</span>
              )}
            </span>
          )
        ) : (
          <span className="secret-content">
            <span className="secret-icon" aria-hidden="true">
              👆
            </span>
            <span className="secret-label">Nhấn giữ để xem</span>
            <span className="muted small">Thả tay ra để che lại</span>
          </span>
        )}
      </button>
      <button type="button" className="btn btn-primary btn-lg" disabled={!seen || revealed} onClick={next}>
        {index + 1 >= players.length ? 'Đã nhớ — Bắt đầu mô tả' : 'Đã nhớ — Chuyển máy'}
      </button>
    </div>
  )
}
