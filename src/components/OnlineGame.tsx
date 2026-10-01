import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { CATEGORIES } from '../data/words'
import { maxImposters, type RoleView } from '../lib/game'
import type { ClientMessage, OnlineSnapshot, ServerMessage } from '../lib/online'
import { Stepper } from './Stepper'

interface OnlineGameProps {
  onBack: () => void
}

interface Session {
  name: string
  asHost: boolean
  password?: string
}

const DURATIONS = [60, 120, 180, 300]
const CLIENT_KEY = 'imposter-game:online-client-id'

function getClientId() {
  let id = localStorage.getItem(CLIENT_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(CLIENT_KEY, id)
  }
  return id
}

function formatTime(totalMs: number) {
  const totalSec = Math.ceil(totalMs / 1000)
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`
}

function roleLabel(role: RoleView) {
  return role.kind === 'imposter'
    ? `Kẻ Mạo Danh${role.hint ? ` · Gợi ý: ${role.hint}` : ''}`
    : `Phe dân · ${role.word}`
}

export function OnlineGame({ onBack }: OnlineGameProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [snapshot, setSnapshot] = useState<OnlineSnapshot | null>(null)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!session) return
    let retry: number | undefined
    let closed = false

    const connect = () => {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
      const socket = new WebSocket(`${protocol}//${location.host}/ws`)
      socketRef.current = socket
      socket.onopen = () => {
        setConnected(true)
        setError('')
        socket.send(
          JSON.stringify({
            type: 'join',
            clientId: getClientId(),
            name: session.name,
            asHost: session.asHost,
            password: session.password,
          } satisfies ClientMessage),
        )
      }
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data as string) as ServerMessage
        if (message.type === 'error') setError(message.message)
        else {
          setSnapshot(message.snapshot)
          setError('')
        }
      }
      socket.onclose = () => {
        setConnected(false)
        if (!closed) retry = window.setTimeout(connect, 1500)
      }
    }

    connect()
    return () => {
      closed = true
      window.clearTimeout(retry)
      socketRef.current?.close()
    }
  }, [session])

  const send = (message: Exclude<ClientMessage, { type: 'join' }>) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify(message))
  }

  const leave = () => {
    setSession(null)
    setSnapshot(null)
    setError('')
    onBack()
  }

  if (!session) return <JoinOnline onJoin={setSession} onBack={onBack} />

  if (!snapshot) {
    return (
      <div className="screen center">
        <div className="handoff-icon" aria-hidden="true">📡</div>
        <h2>{connected ? 'Đang vào phòng…' : 'Đang kết nối…'}</h2>
        {error && <p className="error">{error}</p>}
        <button type="button" className="btn btn-ghost" onClick={() => setSession(null)}>
          Quay lại
        </button>
      </div>
    )
  }

  return (
    <div className="screen online">
      <div className="online-status">
        <span className={`connection-dot ${connected ? 'connected' : ''}`} />
        <span>{connected ? 'Đã kết nối' : 'Đang kết nối lại…'}</span>
        <span className="badge">{snapshot.isHost ? 'Host' : snapshot.isSpectator ? 'Khán giả' : 'Người chơi'}</span>
      </div>
      {error && <p className="error">{error}</p>}

      {snapshot.phase === 'lobby' && <OnlineLobby snapshot={snapshot} send={send} />}
      {snapshot.phase === 'reveal' && <OnlineReveal snapshot={snapshot} send={send} />}
      {snapshot.phase === 'discussion' && <OnlineDiscussion snapshot={snapshot} send={send} />}
      {snapshot.phase === 'voting' && <OnlineVoting snapshot={snapshot} send={send} />}
      {snapshot.phase === 'result' && <OnlineResult snapshot={snapshot} send={send} />}

      <button type="button" className="btn btn-ghost btn-sm intro-back" onClick={leave}>
        Rời phòng
      </button>
    </div>
  )
}

function JoinOnline({ onJoin, onBack }: { onJoin: (session: Session) => void; onBack: () => void }) {
  const [mode, setMode] = useState<'player' | 'host'>('player')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [lanUrls, setLanUrls] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/lan-urls')
      .then((response) => response.json() as Promise<{ urls: string[] }>)
      .then((data) => setLanUrls(data.urls))
      .catch(() => setLanUrls([]))
  }, [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (mode === 'player' && !name.trim()) return
    onJoin({ name: name.trim(), asHost: mode === 'host', password: mode === 'host' ? password : undefined })
  }

  return (
    <form className="screen" onSubmit={submit}>
      <button type="button" className="btn btn-ghost btn-sm intro-back" onClick={onBack}>
        ← Màn hình chính
      </button>
      <section className="card center">
        <span className="secret-icon" aria-hidden="true">📡</span>
        <h2>Chơi cùng Wi‑Fi</h2>
        <p className="muted small">Mọi người mở cùng địa chỉ này:</p>
        <code className="room-url">{lanUrls[0] ?? location.origin}</code>
        {lanUrls.length > 1 && <span className="muted small">{lanUrls.slice(1).join(' · ')}</span>}
      </section>
      <div className="segmented" role="radiogroup" aria-label="Vai trò khi vào phòng">
        <button type="button" className={mode === 'player' ? 'active' : ''} onClick={() => setMode('player')}>
          Người chơi
        </button>
        <button type="button" className={mode === 'host' ? 'active' : ''} onClick={() => setMode('host')}>
          Host
        </button>
      </div>
      <section className="card">
        {mode === 'player' ? (
          <label className="field">
            Tên của bạn
            <input value={name} maxLength={20} autoFocus onChange={(event) => setName(event.target.value)} />
          </label>
        ) : (
          <label className="field">
            Mật khẩu host
            <input
              type="password"
              value={password}
              autoFocus
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        )}
      </section>
      <button
        type="submit"
        className="btn btn-primary btn-block btn-lg"
        disabled={mode === 'player' ? !name.trim() : !password}
      >
        Vào phòng
      </button>
    </form>
  )
}

function OnlineLobby({
  snapshot,
  send,
}: {
  snapshot: OnlineSnapshot
  send: (message: Exclude<ClientMessage, { type: 'join' }>) => void
}) {
  const selectedCount = snapshot.participants.filter((participant) => participant.selected && participant.connected).length
  const updateSettings = (patch: Partial<OnlineSnapshot['settings']>) =>
    send({ type: 'settings', settings: { ...snapshot.settings, ...patch } })
  const toggleCategory = (id: string) =>
    updateSettings({
      categoryIds: snapshot.settings.categoryIds.includes(id)
        ? snapshot.settings.categoryIds.filter((categoryId) => categoryId !== id)
        : [...snapshot.settings.categoryIds, id],
    })

  return (
    <>
      <section className="card">
        <div className="card-title">
          <h2>Phòng chờ</h2>
          <span className="badge">{selectedCount} người chơi</span>
        </div>
        {!snapshot.participants.length && <p className="muted">Chưa có ai vào phòng.</p>}
        <ul className="online-roster">
          {snapshot.participants.map((participant) => (
            <li key={participant.id}>
              <span className={`connection-dot ${participant.connected ? 'connected' : ''}`} />
              <strong>{participant.name}</strong>
              <span className="muted small">{participant.selected ? 'Người chơi' : 'Khán giả'}</span>
              {snapshot.isHost && (
                <input
                  type="checkbox"
                  aria-label={`Chọn ${participant.name} làm người chơi`}
                  checked={participant.selected}
                  disabled={!participant.connected}
                  onChange={(event) =>
                    send({ type: 'select', playerId: participant.id, selected: event.target.checked })
                  }
                />
              )}
            </li>
          ))}
        </ul>
        {!snapshot.isHost && (
          <p className="muted small">
            {snapshot.participants.find((participant) => participant.id === snapshot.selfId)?.selected
              ? 'Host đã chọn bạn tham gia ván.'
              : 'Bạn đang là khán giả. Hãy chờ host chọn.'}
          </p>
        )}
      </section>

      {snapshot.isHost && (
        <>
          <section className="card">
            <Stepper
              label="Kẻ Mạo Danh"
              hint={`Tối đa ${maxImposters(Math.max(3, selectedCount))}`}
              value={snapshot.settings.imposterCount}
              min={1}
              max={maxImposters(Math.max(3, selectedCount))}
              onChange={(imposterCount) => updateSettings({ imposterCount })}
            />
            <div className="chips">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`chip ${snapshot.settings.categoryIds.includes(category.id) ? 'chip-on' : ''}`}
                  onClick={() => toggleCategory(category.id)}
                >
                  {category.icon} {category.name}
                </button>
              ))}
            </div>
            <div className="segmented">
              {DURATIONS.map((duration) => (
                <button
                  key={duration}
                  type="button"
                  className={snapshot.settings.durationSec === duration ? 'active' : ''}
                  onClick={() => updateSettings({ durationSec: duration })}
                >
                  {duration / 60} phút
                </button>
              ))}
            </div>
            <label className="toggle">
              <span>
                <strong>Gợi ý cho Kẻ Mạo Danh</strong>
                <span className="muted small">Hiện một từ liên quan.</span>
              </span>
              <input
                type="checkbox"
                checked={snapshot.settings.imposterHint}
                onChange={(event) => updateSettings({ imposterHint: event.target.checked })}
              />
              <span className="switch" aria-hidden="true" />
            </label>
          </section>
          <button
            type="button"
            className="btn btn-primary btn-block btn-lg"
            disabled={selectedCount < 3 || selectedCount > 12}
            onClick={() => send({ type: 'start' })}
          >
            Bắt đầu ván chơi
          </button>
        </>
      )}
    </>
  )
}

function OnlineReveal({
  snapshot,
  send,
}: {
  snapshot: OnlineSnapshot
  send: (message: Exclude<ClientMessage, { type: 'join' }>) => void
}) {
  const [revealed, setRevealed] = useState(false)
  const [seen, setSeen] = useState(false)
  const me = snapshot.participants.find((participant) => participant.id === snapshot.selfId)

  if (snapshot.isHost || snapshot.isSpectator) {
    return (
      <>
        <SpectatorNotice text="Người chơi đang xem vai trò. Bạn được xem toàn bộ thông tin." />
        <RoleBoard snapshot={snapshot} showReady />
      </>
    )
  }

  const role = snapshot.myRole
  return (
    <div className="screen center reveal">
      <p className="step">{me?.name} · Vai trò bí mật</p>
      <button
        type="button"
        className={`secret-card ${revealed ? 'is-revealed' : ''} ${revealed && role?.kind === 'imposter' ? 'is-imposter' : ''}`}
        onPointerDown={() => {
          setRevealed(true)
          setSeen(true)
        }}
        onPointerUp={() => setRevealed(false)}
        onPointerLeave={() => setRevealed(false)}
        onPointerCancel={() => setRevealed(false)}
      >
        {revealed && role ? (
          <span className="secret-content">
            <span className="secret-label">Chủ đề: {role.categoryName}</span>
            {role.kind === 'crew' ? (
              <>
                <span className="secret-label">Từ bí mật là</span>
                <span className="secret-word">{role.word}</span>
              </>
            ) : (
              <>
                <span className="secret-word imposter-title">🕵️ Bạn là Kẻ Mạo Danh!</span>
                <span className="secret-hint">{role.hint ? `Gợi ý: ${role.hint}` : 'Hãy nghe kỹ và hòa nhập.'}</span>
              </>
            )}
          </span>
        ) : (
          <span className="secret-content">
            <span className="secret-icon">👆</span>
            <span className="secret-label">Nhấn giữ để xem</span>
          </span>
        )}
      </button>
      <button
        type="button"
        className="btn btn-primary btn-lg"
        disabled={!seen || revealed || me?.ready}
        onClick={() => send({ type: 'role-seen' })}
      >
        {me?.ready ? 'Đang chờ người khác…' : 'Đã nhớ vai trò'}
      </button>
    </div>
  )
}

function OnlineDiscussion({
  snapshot,
  send,
}: {
  snapshot: OnlineSnapshot
  send: (message: Exclude<ClientMessage, { type: 'join' }>) => void
}) {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (!snapshot.timer?.running) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [snapshot.timer?.running])

  const remaining = snapshot.timer
    ? snapshot.timer.running
      ? Math.max(0, snapshot.timer.remainingMs - Math.max(0, now - snapshot.timer.serverNow))
      : snapshot.timer.remainingMs
    : 0
  const aliveOrder = snapshot.speakingOrder.filter(
    (id) => snapshot.participants.find((participant) => participant.id === id)?.alive,
  )
  const offset = aliveOrder.length ? (snapshot.roundNo - 1) % aliveOrder.length : 0
  const order = [...aliveOrder.slice(offset), ...aliveOrder.slice(0, offset)]
  const total = Math.max(snapshot.settings.durationSec * 1000, remaining)
  const progress = total ? remaining / total : 0

  return (
    <>
      {snapshot.isSpectator && <SpectatorNotice text="Bạn đang theo dõi ván với quyền khán giả." />}
      <section className="card center">
        <p className="step">Vòng {snapshot.roundNo} · Chủ đề: {snapshot.categoryName}</p>
        <div
          className={`timer ${remaining === 0 ? 'timer-up' : remaining <= 10_000 ? 'timer-warn' : ''}`}
          style={{ '--progress': progress } as CSSProperties}
        >
          <span>{remaining === 0 ? 'Hết giờ!' : formatTime(remaining)}</span>
        </div>
        {snapshot.isHost && (
          <div className="row center-row">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => send({ type: 'timer', command: snapshot.timer?.running ? 'pause' : 'resume' })}
            >
              {snapshot.timer?.running ? '⏸ Tạm dừng' : '▶ Tiếp tục'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => send({ type: 'timer', command: 'add' })}>
              +30 giây
            </button>
          </div>
        )}
      </section>
      <section className="card">
        <h2>Thứ tự mô tả</h2>
        <ol className="order-list">
          {order.map((id, index) => (
            <li key={id} className={index === 0 ? 'first' : ''}>
              {snapshot.participants.find((participant) => participant.id === id)?.name}
              {index === 0 && <span className="badge">Bắt đầu</span>}
            </li>
          ))}
        </ol>
      </section>
      {snapshot.roles && <RoleBoard snapshot={snapshot} />}
      {snapshot.isHost && (
        <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => send({ type: 'start-vote' })}>
          Bắt đầu bỏ phiếu
        </button>
      )}
    </>
  )
}

function OnlineVoting({
  snapshot,
  send,
}: {
  snapshot: OnlineSnapshot
  send: (message: Exclude<ClientMessage, { type: 'join' }>) => void
}) {
  const [choice, setChoice] = useState<string | null>(null)
  const alive = snapshot.participants.filter((participant) => participant.alive)

  return (
    <>
      <section className="card">
        <p className="step">Bỏ phiếu vòng {snapshot.roundNo}</p>
        {snapshot.isAlive ? (
          snapshot.hasVoted ? (
            <p>Đã gửi phiếu. Đang chờ những người còn lại…</p>
          ) : (
            <>
              <h2>Ai là Kẻ Mạo Danh?</h2>
              <div className="vote-grid">
                {alive
                  .filter((participant) => participant.id !== snapshot.selfId)
                  .map((participant) => (
                    <button
                      key={participant.id}
                      type="button"
                      className={`vote-option ${choice === participant.id ? 'selected' : ''}`}
                      onClick={() => setChoice(participant.id)}
                    >
                      {participant.name}
                    </button>
                  ))}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={!choice}
                onClick={() => choice && send({ type: 'vote', targetId: choice })}
              >
                Xác nhận phiếu
              </button>
            </>
          )
        ) : (
          <p className="muted">Bạn đang theo dõi người chơi bỏ phiếu.</p>
        )}
      </section>
      {snapshot.votes && <VoteBoard snapshot={snapshot} />}
      {snapshot.roles && <RoleBoard snapshot={snapshot} />}
    </>
  )
}

function OnlineResult({
  snapshot,
  send,
}: {
  snapshot: OnlineSnapshot
  send: (message: Exclude<ClientMessage, { type: 'join' }>) => void
}) {
  const eliminated = snapshot.participants.find(
    (participant) => participant.id === snapshot.outcome?.eliminatedId,
  )
  const title = snapshot.winner
    ? snapshot.winner === 'crew'
      ? 'Phe dân thắng!'
      : 'Kẻ Mạo Danh thắng!'
    : eliminated
      ? `${eliminated.name} đã bị loại`
      : 'Số phiếu hòa — không ai bị loại'

  return (
    <>
      <section
        className={`card center verdict ${
          snapshot.winner === 'crew'
            ? 'verdict-crew'
            : snapshot.winner === 'imposter'
              ? 'verdict-imposter'
              : 'verdict-neutral'
        }`}
      >
        <div className="verdict-icon">{snapshot.winner ? '🏆' : eliminated ? '❌' : '⚖️'}</div>
        <h2>{title}</h2>
        {!snapshot.winner && <p className="muted">Host sẽ quyết định bắt đầu vòng tiếp theo.</p>}
      </section>
      <VoteBoard snapshot={snapshot} />
      <RoleBoard snapshot={snapshot} />
      {snapshot.isHost && (
        <div className="sticky-actions row">
          {snapshot.winner ? (
            <>
              <button type="button" className="btn btn-ghost btn-lg" onClick={() => send({ type: 'dissolve' })}>
                Giải tán
              </button>
              <button type="button" className="btn btn-primary btn-lg grow" onClick={() => send({ type: 'new-game' })}>
                Ván mới
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary btn-lg grow" onClick={() => send({ type: 'next-round' })}>
              Vòng {snapshot.roundNo + 1}
            </button>
          )}
        </div>
      )}
    </>
  )
}

function SpectatorNotice({ text }: { text: string }) {
  return (
    <section className="card spectator-notice">
      <strong>👁️ Chế độ khán giả</strong>
      <span className="muted small">{text}</span>
    </section>
  )
}

function RoleBoard({ snapshot, showReady = false }: { snapshot: OnlineSnapshot; showReady?: boolean }) {
  if (!snapshot.roles) return null
  return (
    <section className="card">
      <h2>Vai trò người chơi</h2>
      <ul className="role-board">
        {snapshot.roles.map(({ playerId, role }) => {
          const participant = snapshot.participants.find((item) => item.id === playerId)
          return (
            <li key={playerId} className={role.kind === 'imposter' ? 'is-imposter' : ''}>
              <span>
                <strong>{participant?.name}</strong>
                {!participant?.alive && snapshot.phase !== 'reveal' && <span className="badge">Đã bị loại</span>}
              </span>
              <span className="muted small">{roleLabel(role)}</span>
              {showReady && <span>{participant?.ready ? '✓ Đã xem' : 'Đang chờ'}</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function VoteBoard({ snapshot }: { snapshot: OnlineSnapshot }) {
  if (!snapshot.votes) return null
  const nameOf = (id: string) => snapshot.participants.find((participant) => participant.id === id)?.name ?? 'Ẩn danh'
  return (
    <section className="card">
      <h2>Phiếu bầu</h2>
      {!snapshot.votes.length && <p className="muted">Chưa có phiếu nào.</p>}
      <ul className="vote-board">
        {snapshot.votes.map((vote) => (
          <li key={vote.voterId}>
            <strong>{nameOf(vote.voterId)}</strong>
            <span>→</span>
            <strong className="accent">{nameOf(vote.targetId)}</strong>
          </li>
        ))}
      </ul>
    </section>
  )
}
