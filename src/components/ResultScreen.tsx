import { isImposter, type Round, type VoteOutcome, type Winner } from '../lib/game'

interface ResultScreenProps {
  players: string[]
  round: Round
  /** Players who took part in this vote. */
  voters: number[]
  /** Players still in the game after this vote. */
  alive: number[]
  outcome: VoteOutcome
  roundNo: number
  winner: Winner
  imposterHint: boolean
  onNextRound: () => void
  onPlayAgain: () => void
  onHome: () => void
}

export function ResultScreen({
  players,
  round,
  voters,
  alive,
  outcome,
  roundNo,
  winner,
  imposterHint,
  onNextRound,
  onPlayAgain,
  onHome,
}: ResultScreenProps) {
  const eliminated = outcome.eliminated
  const caught = eliminated !== null && isImposter(round, eliminated)
  const impostersLeft = alive.filter((p) => isImposter(round, p)).length
  const ranking = voters.map((i) => ({ i, count: outcome.counts[i] })).sort((a, b) => b.count - a.count)
  const maxCount = Math.max(1, ...outcome.counts)
  const gameOver = winner !== null

  const voteSummary =
    eliminated === null
      ? 'Số phiếu bị hòa — không ai bị loại.'
      : caught
        ? `${players[eliminated]} bị loại — và đúng là Kẻ Mạo Danh!`
        : `${players[eliminated]} bị loại — nhưng là người vô tội.`

  return (
    <div className="screen result">
      {gameOver ? (
        <section className={`card center verdict ${winner === 'crew' ? 'verdict-crew' : 'verdict-imposter'}`}>
          <div className="verdict-icon" aria-hidden="true">
            {winner === 'crew' ? '🎉' : '🕵️'}
          </div>
          <h2>{winner === 'crew' ? 'Phe dân thắng!' : 'Kẻ Mạo Danh thắng!'}</h2>
          <p>{voteSummary}</p>
          <p className="muted small">
            {winner === 'crew'
              ? 'Mọi Kẻ Mạo Danh đã bị lật mặt.'
              : 'Số Kẻ Mạo Danh còn lại đã bằng hoặc nhiều hơn số dân.'}
          </p>
        </section>
      ) : (
        <section className={`card center verdict ${caught ? 'verdict-crew' : 'verdict-neutral'}`}>
          <p className="step">Kết thúc vòng {roundNo}</p>
          <div className="verdict-icon" aria-hidden="true">
            {eliminated === null ? '⚖️' : caught ? '🎯' : '😬'}
          </div>
          <h2>{voteSummary}</h2>
          <p className="muted">
            Vẫn còn <strong className="accent">{impostersLeft}</strong> Kẻ Mạo Danh trong số {alive.length} người.
          </p>
        </section>
      )}

      {gameOver && (
        <section className="card reveal-facts">
          <div>
            <span className="muted small">Kẻ Mạo Danh</span>
            <strong className="accent">{round.imposterIndices.map((i) => players[i]).join(', ')}</strong>
          </div>
          <div>
            <span className="muted small">Từ bí mật</span>
            <strong>{round.word}</strong>
          </div>
          {imposterHint && (
            <div>
              <span className="muted small">Gợi ý</span>
              <strong>{round.hint}</strong>
            </div>
          )}
        </section>
      )}

      <section className="card">
        <h2>Phiếu bầu vòng {roundNo}</h2>
        <ul className="tally">
          {ranking.map(({ i, count }) => {
            const showRole = gameOver || i === eliminated
            const imposter = showRole && isImposter(round, i)
            return (
              <li key={i} className={imposter ? 'is-imposter' : ''}>
                <span className="tally-name">
                  {players[i]}
                  {imposter && ' 🕵️'}
                  {i === eliminated && ' ❌'}
                </span>
                <span className="tally-bar" aria-hidden="true">
                  <span style={{ width: `${(count / maxCount) * 100}%` }} />
                </span>
                <span className="tally-count">{count}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="sticky-actions row">
        {gameOver ? (
          <>
            <button type="button" className="btn btn-ghost btn-lg" onClick={onHome}>
              Màn hình chính
            </button>
            <button type="button" className="btn btn-primary btn-lg grow" onClick={onPlayAgain}>
              Ván mới
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary btn-lg grow" onClick={onNextRound}>
            Vòng {roundNo + 1} — Tiếp tục thảo luận
          </button>
        )}
      </div>
    </div>
  )
}
