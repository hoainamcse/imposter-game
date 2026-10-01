import { useState } from 'react'
import { Handoff } from './Handoff'

interface VotingScreenProps {
  players: string[]
  /** Player indices still in the game; they vote and can be voted for. */
  alive: number[]
  roundNo: number
  onDone: (votes: number[]) => void
}

export function VotingScreen({ players, alive, roundNo, onDone }: VotingScreenProps) {
  const [votes, setVotes] = useState<number[]>([])
  const [ready, setReady] = useState(false)
  const [choice, setChoice] = useState<number | null>(null)

  const voter = alive[votes.length]
  const name = players[voter]

  if (!ready) {
    return (
      <Handoff
        key={voter}
        name={name}
        step={votes.length + 1}
        total={alive.length}
        action="bỏ phiếu"
        onReady={() => setReady(true)}
      />
    )
  }

  const confirm = () => {
    if (choice === null) return
    const next = [...votes, choice]
    setChoice(null)
    setReady(false)
    if (next.length >= alive.length) onDone(next)
    else setVotes(next)
  }

  return (
    <div className="screen voting">
      <section className="card">
        <p className="step">
          Vòng {roundNo} · Phiếu {votes.length + 1}/{alive.length}
        </p>
        <h2>{name}, ai là Kẻ Mạo Danh?</h2>
        <p className="muted small">Phiếu bầu là bí mật. Bạn không thể bầu cho chính mình.</p>
        <div className="vote-grid" role="radiogroup" aria-label="Chọn người bị nghi ngờ">
          {alive
            .filter((p) => p !== voter)
            .map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={choice === p}
                className={`vote-option ${choice === p ? 'selected' : ''}`}
                onClick={() => setChoice(p)}
              >
                {players[p]}
              </button>
            ))}
        </div>
      </section>
      <div className="sticky-actions">
        <button type="button" className="btn btn-primary btn-block btn-lg" disabled={choice === null} onClick={confirm}>
          Xác nhận phiếu
        </button>
      </div>
    </div>
  )
}
