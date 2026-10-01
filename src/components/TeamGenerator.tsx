import { useState, type CSSProperties } from 'react'
import { makeTeams } from '../lib/game'
import { Modal } from './Modal'
import { Stepper } from './Stepper'

interface TeamGeneratorProps {
  namesText: string
  onNamesTextChange: (text: string) => void
  onClose: () => void
}

function parseNames(text: string): string[] {
  return [...new Set(text.split(/[\n,]/).map((n) => n.trim()).filter(Boolean))]
}

export function TeamGenerator({ namesText, onNamesTextChange, onClose }: TeamGeneratorProps) {
  const [teamCount, setTeamCount] = useState(2)
  const [teams, setTeams] = useState<string[][] | null>(null)
  const names = parseNames(namesText)
  const maxTeams = Math.max(2, names.length)
  const effectiveCount = Math.min(teamCount, maxTeams)
  const canGenerate = names.length >= 2

  return (
    <Modal title="Chia đội ngẫu nhiên" onClose={onClose}>
      <p className="muted small">Công cụ độc lập, không liên quan đến ván Kẻ Mạo Danh.</p>
      <label className="field">
        <span>
          Danh sách tên <span className="muted small">(mỗi dòng một người hoặc cách nhau bằng dấu phẩy)</span>
        </span>
        <textarea
          rows={5}
          value={namesText}
          placeholder={'An\nBình\nChi\nDũng'}
          onChange={(e) => {
            onNamesTextChange(e.target.value)
            setTeams(null)
          }}
        />
        <span className="muted small">{names.length} người</span>
      </label>
      <Stepper label="Số đội" value={effectiveCount} min={2} max={maxTeams} onChange={setTeamCount} />
      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={!canGenerate}
        onClick={() => setTeams(makeTeams(names, effectiveCount))}
      >
        {teams ? '🔀 Chia lại' : '🎲 Chia đội'}
      </button>
      {!canGenerate && <p className="muted small">Nhập ít nhất 2 tên để chia đội.</p>}
      {teams && (
        <div className="teams">
          {teams.map((team, i) => (
            <section key={i} className="team-card" style={{ '--team-hue': (i * 67) % 360 } as CSSProperties}>
              <h3>Đội {i + 1}</h3>
              <ul>
                {team.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Modal>
  )
}
