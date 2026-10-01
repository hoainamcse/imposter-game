import { useCallback, useEffect, useState } from 'react'
import { DiscussionScreen } from './components/DiscussionScreen'
import { IntroScreen } from './components/IntroScreen'
import { OnlineGame } from './components/OnlineGame'
import { ResultScreen } from './components/ResultScreen'
import { RevealScreen } from './components/RevealScreen'
import { RulesDialog } from './components/RulesDialog'
import { SetupScreen } from './components/SetupScreen'
import { TeamGenerator } from './components/TeamGenerator'
import { VotingScreen } from './components/VotingScreen'
import { CATEGORIES } from './data/words'
import {
  createRound,
  normalizePlayers,
  tallyVotes,
  winnerFor,
  type Round,
  type VoteOutcome,
  type Winner,
} from './lib/game'
import { loadSettings, saveSettings } from './lib/storage'

interface Game {
  round: Round
  alive: number[]
  roundNo: number
}

type Phase =
  | { name: 'intro' }
  | { name: 'setup' }
  | { name: 'online' }
  | ({ name: 'reveal' } & Game)
  | ({ name: 'discussion' } & Game)
  | ({ name: 'voting' } & Game)
  | ({ name: 'result'; voters: number[]; outcome: VoteOutcome; winner: Winner } & Game)

type Overlay = 'rules' | 'teams' | null

export default function App() {
  const [settings, setSettings] = useState(loadSettings)
  const [phase, setPhase] = useState<Phase>({ name: 'intro' })
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [players, setPlayers] = useState<string[]>([])
  const [teamNamesText, setTeamNamesText] = useState('')

  useEffect(() => saveSettings(settings), [settings])

  const closeOverlay = useCallback(() => setOverlay(null), [])

  const startGame = (avoidWord?: string) => {
    const roster = normalizePlayers(settings.players)
    const round = createRound({ ...settings, players: roster }, CATEGORIES, Math.random, avoidWord)
    setPlayers(roster)
    setPhase({ name: 'reveal', round, alive: roster.map((_, i) => i), roundNo: 1 })
  }

  const finishVote = (game: Game, votes: number[]) => {
    const outcome = tallyVotes(votes, players.length)
    const alive = game.alive.filter((p) => p !== outcome.eliminated)
    setPhase({
      name: 'result',
      round: game.round,
      roundNo: game.roundNo,
      voters: game.alive,
      alive,
      outcome,
      winner: winnerFor(game.round, alive),
    })
  }

  const goHome = () => setPhase({ name: 'intro' })

  const quit = () => {
    if (window.confirm('Thoát ván đang chơi và quay về trang giới thiệu?')) goHome()
  }

  const inGame = phase.name !== 'intro' && phase.name !== 'setup' && !(phase.name === 'result' && phase.winner)

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="logo">
          <span aria-hidden="true">🕵️</span> Kẻ Mạo Danh
        </h1>
        <div className="topbar-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Luật chơi"
            title="Luật chơi"
            onClick={() => setOverlay('rules')}
          >
            📖<span className="btn-text"> Luật chơi</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Chia đội ngẫu nhiên"
            title="Chia đội ngẫu nhiên"
            onClick={() => setOverlay('teams')}
          >
            🎲<span className="btn-text"> Chia đội</span>
          </button>
          {inGame && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={quit}>
              Thoát
            </button>
          )}
        </div>
      </header>

      <main key={`${phase.name}-${'roundNo' in phase ? phase.roundNo : 0}`} className="phase">
        {phase.name === 'intro' && (
          <IntroScreen
            onPlay={() => setPhase({ name: 'setup' })}
            onOnlinePlay={() => setPhase({ name: 'online' })}
          />
        )}
        {phase.name === 'online' && <OnlineGame onBack={goHome} />}
        {phase.name === 'setup' && (
          <SetupScreen
            settings={settings}
            onChange={setSettings}
            onStart={() => startGame()}
            onBack={goHome}
          />
        )}
        {phase.name === 'reveal' && (
          <RevealScreen
            players={players}
            round={phase.round}
            imposterHint={settings.imposterHint}
            onDone={() => setPhase({ ...phase, name: 'discussion' })}
          />
        )}
        {phase.name === 'discussion' && (
          <DiscussionScreen
            players={players}
            round={phase.round}
            alive={phase.alive}
            roundNo={phase.roundNo}
            durationSec={settings.durationSec}
            onVote={() => setPhase({ ...phase, name: 'voting' })}
          />
        )}
        {phase.name === 'voting' && (
          <VotingScreen
            players={players}
            alive={phase.alive}
            roundNo={phase.roundNo}
            onDone={(votes) => finishVote(phase, votes)}
          />
        )}
        {phase.name === 'result' && (
          <ResultScreen
            players={players}
            round={phase.round}
            voters={phase.voters}
            alive={phase.alive}
            outcome={phase.outcome}
            roundNo={phase.roundNo}
            winner={phase.winner}
            imposterHint={settings.imposterHint}
            onNextRound={() =>
              setPhase({ name: 'discussion', round: phase.round, alive: phase.alive, roundNo: phase.roundNo + 1 })
            }
            onPlayAgain={() => startGame(phase.round.word)}
            onHome={goHome}
          />
        )}
      </main>

      {overlay === 'rules' && <RulesDialog onClose={closeOverlay} />}
      {overlay === 'teams' && (
        <TeamGenerator namesText={teamNamesText} onNamesTextChange={setTeamNamesText} onClose={closeOverlay} />
      )}
    </div>
  )
}
