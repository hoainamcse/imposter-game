import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Round } from '../lib/game'

interface DiscussionScreenProps {
  players: string[]
  round: Round
  alive: number[]
  roundNo: number
  durationSec: number
  onVote: () => void
}

function formatTime(totalSec: number) {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function DiscussionScreen({ players, round, alive, roundNo, durationSec, onVote }: DiscussionScreenProps) {
  const remaining = round.speakingOrder.filter((p) => alive.includes(p))
  const offset = (roundNo - 1) % remaining.length
  const order = [...remaining.slice(offset), ...remaining.slice(0, offset)]

  const [remainingMs, setRemainingMs] = useState(durationSec * 1000)
  const [running, setRunning] = useState(true)
  const deadlineRef = useRef(0)
  const remainingRef = useRef(remainingMs)

  const updateRemaining = (ms: number) => {
    remainingRef.current = ms
    setRemainingMs(ms)
  }

  useEffect(() => {
    if (!running) return
    deadlineRef.current = Date.now() + remainingRef.current
    const id = window.setInterval(() => {
      const left = Math.max(0, deadlineRef.current - Date.now())
      remainingRef.current = left
      setRemainingMs(left)
      if (left === 0) setRunning(false)
    }, 250)
    return () => window.clearInterval(id)
  }, [running])

  const addTime = () => {
    const wasUp = remainingRef.current === 0
    deadlineRef.current += 30_000
    updateRemaining(remainingRef.current + 30_000)
    if (wasUp) setRunning(true)
  }

  const remainingSec = Math.ceil(remainingMs / 1000)
  const total = Math.max(durationSec * 1000, remainingMs)
  const progress = remainingMs / total
  const timeUp = remainingMs === 0

  return (
    <div className="screen discussion">
      <section className="card center">
        <p className="step">
          Vòng {roundNo} · Chủ đề: {round.categoryName}
        </p>
        <div
          className={`timer ${timeUp ? 'timer-up' : remainingSec <= 10 ? 'timer-warn' : ''}`}
          style={{ '--progress': progress } as CSSProperties}
          role="timer"
          aria-live={timeUp ? 'assertive' : 'off'}
        >
          <span>{timeUp ? 'Hết giờ!' : formatTime(remainingSec)}</span>
        </div>
        <div className="row center-row">
          <button type="button" className="btn btn-ghost" disabled={timeUp} onClick={() => setRunning((r) => !r)}>
            {running ? '⏸ Tạm dừng' : '▶ Tiếp tục'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={addTime}>
            +30 giây
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Thứ tự mô tả</h2>
        <p className="muted small">Mỗi người nói một từ hoặc câu ngắn về từ bí mật, sau đó cùng thảo luận.</p>
        <ol className="order-list">
          {order.map((p, i) => (
            <li key={p} className={i === 0 ? 'first' : ''}>
              {players[p]}
              {i === 0 && <span className="badge">Bắt đầu</span>}
            </li>
          ))}
        </ol>
      </section>

      <div className="sticky-actions">
        <button type="button" className="btn btn-primary btn-block btn-lg" onClick={onVote}>
          {timeUp ? 'Bắt đầu bỏ phiếu' : 'Bỏ phiếu ngay'}
        </button>
      </div>
    </div>
  )
}
